"use client";

import { QISVHeader } from "../_components/header";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import {
    PlusIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    ChevronsRightIcon,
    ChevronsLeftIcon,
    TrashIcon,
    Trash2Icon,
    SearchIcon,
    TagIcon,
} from "lucide-react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
    AlertDialog,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { useQuery } from "@tanstack/react-query";
import { authClient } from "@/components/providers/auth-client";
import { canUI } from "@/lib/ui-permissions";
import type { AppRole } from "@/lib/ui-permissions";

// Add normalizeRole helper (same as other pages)
function normalizeRole(role: unknown): AppRole | null {
    const r = String(role ?? "").toLowerCase().trim();
    if (r === "owner") return "admin";
    if (r === "admin") return "admin";
    if (r === "member") return "viewer";
    if (
        r === "viewer" ||
        r === "lead_surveyor" ||
        r === "surveyor" ||
        r === "facility_coordinator" ||
        r === "facility_viewer" ||
        r === "admin"
    ) {
        return r as AppRole;
    }
    return null;
}

const PAGE_SIZES = [10, 50, 100];

const ftagFormSchema = z.object({
    code: z.string().min(1, "Code is required").max(10, "Code must be 10 characters or less"),
});

type FtagFormData = z.infer<typeof ftagFormSchema>;

function FtagForm({
    onSuccess,
}: {
    onSuccess: () => void;
}) {
    const utils = api.useUtils();

    const createFtag = api.ftag.create.useMutation({
        onSuccess: () => {
            toast.success("F-Tag created successfully");
            void utils.ftag.list.invalidate();
            onSuccess();
        },
        onError: (error) => {
            toast.error(`Failed to create F-Tag: ${error.message}`);
        },
    });

    const form = useForm<FtagFormData>({
        resolver: zodResolver(ftagFormSchema),
        defaultValues: {
            code: "",
        },
    });

    const onSubmit = (data: FtagFormData) => {
        createFtag.mutate({ 
            code: data.code, 
            description: "Auto-generated F-Tag" 
        });
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                    control={form.control}
                    name="code"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>F-Tag Code</FormLabel>
                            <FormControl>
                                <Input
                                    {...field}
                                    placeholder="e.g., F441, F812"
                                    className="uppercase"
                                    onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="flex justify-end gap-2 pt-4">
                    <Button
                        type="submit"
                        disabled={createFtag.isPending}
                        className="min-w-[100px]"
                    >
                        {createFtag.isPending ? "Creating..." : "Create F-Tag"}
                    </Button>
                </div>
            </form>
        </Form>
    );
}

export default function FtagsPage() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const page = Number(searchParams.get("page") ?? 1);
    const pageSize = Number(searchParams.get("pageSize") ?? PAGE_SIZES[0]);
    const search = searchParams.get("search") ?? "";

    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [selectedFtags, setSelectedFtags] = useState<Set<number>>(new Set());
    const [searchInput, setSearchInput] = useState(search);

    const activeOrg = authClient.useActiveOrganization();

    // SAME LOGIC AS OTHER PAGES: Fetch role and normalize it
    const { data: appRole, isLoading: roleLoading } = useQuery({
        queryKey: ["active-member-role", activeOrg.data?.id],
        queryFn: async () => {
            const res = await authClient.organization.getActiveMemberRole();
            const rawRole = (res as any)?.data?.role;
            return normalizeRole(rawRole);
        },
        enabled: !!activeOrg.data,
    });

    // SAME LOGIC: Define permissions using canUI
    const canViewFtags = canUI(appRole, "ftags.view");
    const canManageFtags = canUI(appRole, "ftags.manage");
    const canDeleteFtags = canUI(appRole, "ftags.manage");

    const ftags = api.ftag.list.useQuery({
        page,
        pageSize,
        search,
    });

    const utils = api.useUtils();

    const deleteFtag = api.ftag.delete.useMutation({
        onSuccess: () => {
            toast.success("F-Tag deleted successfully");
            void utils.ftag.list.invalidate();
        },
        onError: (error) => {
            toast.error(`Failed to delete F-Tag: ${error.message}`);
        },
    });

    const bulkDeleteFtags = api.ftag.bulkDelete.useMutation({
        onSuccess: (data) => {
            toast.success(`Successfully deleted ${data.count} F-Tags`);
            void utils.ftag.list.invalidate();
            setSelectedFtags(new Set());
        },
        onError: (error) => {
            toast.error(`Failed to delete F-Tags: ${error.message}`);
        },
    });

    function handlePageSize(pageSize: number) {
        const newSearchParams = new URLSearchParams(searchParams.toString());
        newSearchParams.set("pageSize", String(pageSize));
        newSearchParams.set("page", "1");
        router.replace(`?${newSearchParams.toString()}`);
        setSelectedFtags(new Set());
    }

    function handlePage(page: number) {
        const newSearchParams = new URLSearchParams(searchParams.toString());
        newSearchParams.set("page", String(page));
        router.replace(`?${newSearchParams.toString()}`);
        setSelectedFtags(new Set());
    }

    function handleSearch() {
        const newSearchParams = new URLSearchParams(searchParams.toString());
        if (searchInput.trim()) {
            newSearchParams.set("search", searchInput.trim());
        } else {
            newSearchParams.delete("search");
        }
        newSearchParams.set("page", "1");
        router.replace(`?${newSearchParams.toString()}`);
        setSelectedFtags(new Set());
    }

    function clearSearch() {
        const newSearchParams = new URLSearchParams(searchParams.toString());
        newSearchParams.delete("search");
        newSearchParams.set("page", "1");
        router.replace(`?${newSearchParams.toString()}`);
        setSearchInput("");
        setSelectedFtags(new Set());
    }

    const handleSelectAll = (checked: boolean) => {
        if (!ftags.data) return;

        if (checked) {
            const allIds = new Set(ftags.data.data.map(ftag => ftag.id));
            setSelectedFtags(allIds);
        } else {
            setSelectedFtags(new Set());
        }
    };

    const handleSelectFtag = (ftagId: number, checked: boolean) => {
        const newSelected = new Set(selectedFtags);
        if (checked) {
            newSelected.add(ftagId);
        } else {
            newSelected.delete(ftagId);
        }
        setSelectedFtags(newSelected);
    };

    const handleBulkDelete = () => {
        const idsToDelete = Array.from(selectedFtags);
        bulkDeleteFtags.mutate({ ids: idsToDelete });
    };

    const handleCreateClose = () => {
        setCreateDialogOpen(false);
    };

    const isAllSelected = ftags.data ?
        ftags.data.data.length > 0 && ftags.data.data.every(ftag => selectedFtags.has(ftag.id)) :
        false;

    const isIndeterminate = ftags.data ?
        selectedFtags.size > 0 && selectedFtags.size < ftags.data.data.length :
        false;

    // SAME LOGIC: Loading state
    if (roleLoading) {
        return (
            <>
                <QISVHeader crumbs={[{ label: "F-Tags" }]} />
                <main className="px-4 py-6">
                    <div className="flex items-center justify-center py-12">
                        <div className="text-center">
                            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                            <p className="mt-4 text-sm text-muted-foreground">Loading permissions...</p>
                        </div>
                    </div>
                </main>
            </>
        );
    }

    // SAME LOGIC: Access denied state
    if (!canViewFtags) {
        return (
            <>
                <QISVHeader crumbs={[{ label: "F-Tags" }]} />
                <main className="px-4 py-6">
                    <div className="flex items-center justify-center py-12">
                        <div className="text-center">
                            <h2 className="text-lg font-semibold">Access Denied</h2>
                            <p className="mt-2 text-sm text-muted-foreground">
                                You don't have permission to view F-Tags.
                            </p>
                        </div>
                    </div>
                </main>
            </>
        );
    }

    return (
        <>
            <QISVHeader crumbs={[{ label: "F-Tags" }]} />
            <main className="px-4 py-6">
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">F-Tags</h1>
                        <p className="text-muted-foreground">
                            Manage F-Tag codes
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        {/* Bulk Delete Button - UPDATED with canDeleteFtags */}
                        {canDeleteFtags && selectedFtags.size > 0 && (
                            <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
                                <Trash2Icon className="mr-2 size-4" />
                                Delete Selected ({selectedFtags.size})
                            </Button>
                        )}

                        {/* New F-Tag Button - UPDATED with canManageFtags */}
                        {canManageFtags && (
                            <Button onClick={() => setCreateDialogOpen(true)}>
                                <PlusIcon className="mr-2 size-4" />
                                New F-Tag
                            </Button>
                        )}
                    </div>
                </div>

                <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                    <DialogContent className="w-[400px] sm:w-[480px]">
                        <DialogHeader>
                            <DialogTitle>Add New F-Tag</DialogTitle>
                        </DialogHeader>
                        <FtagForm onSuccess={handleCreateClose} />
                    </DialogContent>
                </Dialog>

                {/* Search Bar */}
                <div className="mb-4 flex items-center gap-2">
                    <div className="relative flex-1 max-w-sm">
                        <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="Search F-Tags..."
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    handleSearch();
                                }
                            }}
                            className="pl-9"
                        />
                    </div>
                    <Button onClick={handleSearch} variant="outline">
                        Search
                    </Button>
                    {search && (
                        <Button onClick={clearSearch} variant="ghost" size="sm">
                            Clear
                        </Button>
                    )}
                </div>

                <div className="rounded-lg border">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-secondary text-secondary-foreground">
                                {/* UPDATED: Only show checkbox if can delete */}
                                {canDeleteFtags && (
                                    <TableHead className="w-[50px]">
                                        <Checkbox
                                            checked={isAllSelected}
                                            ref={(el) => {
                                                if (el) (el as unknown as HTMLInputElement).indeterminate = isIndeterminate;
                                            }}
                                            onCheckedChange={handleSelectAll}
                                            aria-label="Select all F-Tags"
                                        />
                                    </TableHead>
                                )}
                                <TableHead className="w-[120px] text-right">System ID</TableHead>
                                <TableHead>F-Tag</TableHead>
                                {/* UPDATED: Only show Actions column if can delete */}
                                {canDeleteFtags && (
                                    <TableHead className="w-[80px]">Actions</TableHead>
                                )}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {ftags.isPending &&
                                Array.from({ length: pageSize }).map((_, i) => (
                                    <TableRow key={i}>
                                        {canDeleteFtags && (
                                            <TableCell>
                                                <Skeleton className="h-4 w-4" />
                                            </TableCell>
                                        )}
                                        <TableCell className="text-right">
                                            <Skeleton className="ml-auto h-6 w-12" />
                                        </TableCell>
                                        <TableCell>
                                            <Skeleton className="h-6 w-16" />
                                        </TableCell>
                                        {canDeleteFtags && (
                                            <TableCell>
                                                <Skeleton className="h-8 w-8" />
                                            </TableCell>
                                        )}
                                    </TableRow>
                                ))}

                            {!ftags.isPending &&
                                ftags.data &&
                                ftags.data.data.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={canDeleteFtags ? 4 : 2} className="text-muted-foreground py-8 text-center">
                                            {search ? (
                                                <div className="flex flex-col items-center gap-2">
                                                    <SearchIcon className="h-8 w-8 text-muted-foreground/50" />
                                                    <p>No F-Tags found matching "{search}"</p>
                                                    <Button onClick={clearSearch} variant="ghost" size="sm">
                                                        Clear search
                                                    </Button>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-center gap-2">
                                                    <TagIcon className="h-8 w-8 text-muted-foreground/50" />
                                                    <p>No F-Tags found. Add your first F-Tag to get started.</p>
                                                </div>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                )}

                            {!ftags.isPending &&
                                ftags.data &&
                               ftags.data.data.map((ftag) => (
                                    <TableRow key={ftag.id}>
                                        {canDeleteFtags && (
                                            <TableCell>
                                                <Checkbox
                                                    checked={selectedFtags.has(ftag.id)}
                                                    onCheckedChange={(checked) =>
                                                        handleSelectFtag(ftag.id, checked as boolean)
                                                    }
                                                    aria-label={`Select F-Tag ${ftag.code}`}
                                                />
                                            </TableCell>
                                        )}
                                        <TableCell className="text-right font-mono tabular-nums">
                                            {ftag.id}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="font-mono font-semibold text-base px-3 py-1">
                                                {ftag.code}
                                            </Badge>
                                        </TableCell>
                                        {canDeleteFtags && (
                                            <TableCell>
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                            disabled={deleteFtag.isPending}
                                                        >
                                                            <TrashIcon className="h-4 w-4" />
                                                            <span className="sr-only">Delete F-Tag</span>
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent className="max-w-md">
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>
                                                                <div className="flex items-center gap-2">
                                                                    <TrashIcon className="h-5 w-5 text-destructive" />
                                                                    Delete F-Tag
                                                                </div>
                                                            </AlertDialogTitle>
                                                            <AlertDialogDescription className="text-sm text-muted-foreground">
                                                                Are you sure you want to delete F-Tag <span className="font-semibold text-foreground">"{ftag.code}"</span>?
                                                                This action cannot be undone and will remove this F-Tag
                                                                and all its associations from the system.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <div className="flex justify-end gap-3 mt-6">
                                                            <AlertDialogCancel>
                                                                Cancel
                                                            </AlertDialogCancel>
                                                            <Button
                                                                variant="destructive"
                                                                size="sm"
                                                                onClick={() => deleteFtag.mutate({ id: ftag.id })}
                                                                disabled={deleteFtag.isPending}
                                                            >
                                                                {deleteFtag.isPending ? (
                                                                    <>
                                                                        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                                                        Deleting...
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <TrashIcon className="mr-2 h-4 w-4" />
                                                                        Delete
                                                                    </>
                                                                )}
                                                            </Button>
                                                        </div>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </TableCell>
                                        )}
                                    </TableRow>
                                ))}
                        </TableBody>
                    </Table>
                </div>

                <div className="mt-4 flex items-center justify-between px-4">
                    <div className="text-muted-foreground hidden flex-1 text-sm lg:flex">
                        {selectedFtags.size > 0 && (
                            <span>{selectedFtags.size} of {ftags.data?.data.length || 0} F-Tag(s) selected</span>
                        )}
                    </div>
                    <div className="flex w-full items-center gap-8 lg:w-fit">
                        <div className="hidden items-center gap-2 lg:flex">
                            <Label htmlFor="rows-per-page" className="text-sm font-medium">
                                Rows per page
                            </Label>
                            <Select
                                value={pageSize.toString()}
                                onValueChange={(value) => handlePageSize(Number(value))}
                            >
                                <SelectTrigger size="sm" className="w-20" id="rows-per-page">
                                    <SelectValue placeholder={pageSize} />
                                </SelectTrigger>
                                <SelectContent side="top">
                                    {PAGE_SIZES.map((pageSize) => (
                                        <SelectItem key={pageSize} value={`${pageSize}`}>
                                            {pageSize}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        {ftags.data ? (
                            <div className="flex w-fit items-center justify-center text-sm font-medium">
                                Page {page} of {ftags.data.totalPages}
                            </div>
                        ) : (
                            <Skeleton className="h-4 w-[50px]" />
                        )}
                        <div className="ml-auto flex items-center gap-2 lg:ml-0">
                            <Button
                                variant="outline"
                                className="hidden h-8 w-8 p-0 lg:flex"
                                onClick={() => handlePage(1)}
                                disabled={page === 1}
                            >
                                <span className="sr-only">Go to first page</span>
                                <ChevronsLeftIcon />
                            </Button>
                            <Button
                                variant="outline"
                                className="size-8"
                                size="icon"
                                onClick={() => handlePage(page - 1)}
                                disabled={page === 1}
                            >
                                <span className="sr-only">Go to previous page</span>
                                <ChevronLeftIcon />
                            </Button>
                            <Button
                                variant="outline"
                                className="size-8"
                                size="icon"
                                onClick={() => handlePage(page + 1)}
                                disabled={
                                    ftags.data ? page === ftags.data.totalPages : true
                                }
                            >
                                <span className="sr-only">Go to next page</span>
                                <ChevronRightIcon />
                            </Button>
                            <Button
                                variant="outline"
                                className="hidden size-8 lg:flex"
                                size="icon"
                                onClick={() =>
                                    ftags.data && handlePage(ftags.data.totalPages)
                                }
                                disabled={
                                    ftags.data ? page === ftags.data.totalPages : true
                                }
                            >
                                <span className="sr-only">Go to last page</span>
                                <ChevronsRightIcon />
                            </Button>
                        </div>
                    </div>
                </div>
            </main>
        </>
    );
}
