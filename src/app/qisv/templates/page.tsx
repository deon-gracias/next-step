"use client";

import { QISVHeader } from "../_components/header";
import { api } from "@/trpc/react";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
  PlusIcon,
  ExternalLinkIcon,
  TrashIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { NewTemplateForm } from "./_components/new-template-form";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { authClient } from "@/components/providers/auth-client";
import { Badge } from "@/components/ui/badge";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import { toast } from "sonner";

// Score Badge Component with conditional styling
function ScoreBadge({ score }: { score: number }) {
  const isOptimal = score === 100;
  const isProblematic = score < 100 || score > 100;

  return (
    <div className="flex items-center gap-2">
      <Badge 
        variant={isOptimal ? "default" : "secondary"}
        className={cn(
          "text-sm font-semibold px-3 py-1 flex items-center gap-1",
          isOptimal && "bg-green-100 text-green-800 hover:bg-green-100 border-green-200",
          isProblematic && "bg-red-100 text-red-800 hover:bg-red-100 border-red-200"
        )}
      >
        {isOptimal && <CheckCircleIcon className="h-3 w-3" />}
        {isProblematic && <AlertTriangleIcon className="h-3 w-3" />}
        {score} pts
      </Badge>
    </div>
  );
}

const PAGE_SIZES = [10, 50, 100];

export default function TemplatePage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const page = Number(searchParams.get("page") ?? 1);
  const pageSize = Number(searchParams.get("pageSize") ?? PAGE_SIZES[0]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<{ id: number; name: string } | null>(null);

  const templates = api.template.list.useQuery({
    page,
    pageSize,
  });

  const utils = api.useUtils();

  const deleteTemplate = api.template.delete.useMutation({
    onSuccess: () => {
      toast.success("Template deleted successfully");
      void utils.template.list.invalidate();
      setTemplateToDelete(null);
    },
    onError: (error) => {
      toast.error(`Failed to delete template: ${error.message}`);
      setTemplateToDelete(null);
    },
  });

  const hasNewTemplatePermission = useQuery({
    queryKey: [],
    queryFn: async () =>
      (
        await authClient.organization.hasPermission({
          permissions: { organization: ["update"] },
        })
      ).data?.success ?? false,
  });

  const hasDeleteTemplatePermission = useQuery({
    queryKey: ["templateDeletePermission"],
    queryFn: async () =>
      (
        await authClient.organization.hasPermission({
          permissions: { organization: ["delete"] },
        })
      ).data?.success ?? false,
  });

  function handlePage(newPage: number) {
    const newSearchParams = new URLSearchParams(searchParams.toString());
    newSearchParams.set("page", String(newPage));
    router.replace(`?${newSearchParams.toString()}`);
  }

  function handlePageSize(newSize: number) {
    const newSearchParams = new URLSearchParams(searchParams.toString());
    newSearchParams.set("pageSize", String(newSize));
    newSearchParams.set("page", "1"); // reset page to 1 when page size changes
    router.replace(`?${newSearchParams.toString()}`);
  }

  return (
    <>
      <QISVHeader crumbs={[{ label: "Templates" }]} />
      <main className="px-4 py-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Templates</h1>
            <p className="text-muted-foreground">
              Manage survey templates and their scoring systems
            </p>
          </div>

          {hasNewTemplatePermission.data && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <PlusIcon className="size-4" />
                  New Template
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[400px] sm:w-[540px]">
                <DialogHeader>
                  <DialogTitle>New Template</DialogTitle>
                </DialogHeader>
                <NewTemplateForm onSuccess={() => setDialogOpen(false)} />
              </DialogContent>
            </Dialog>
          )}
        </div>

        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow className="bg-secondary text-secondary-foreground">
                <TableHead className="w-[80px] text-right">System ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Question Count</TableHead>
                <TableHead className="text-center">Total Score</TableHead>
                <TableHead className="max-w-fit w-[100px]">Actions</TableHead>
                <TableHead className="max-w-fit"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.isPending &&
                Array.from({ length: pageSize }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell className="flex justify-end">
                      <Skeleton className="ml-auto h-6 w-full" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-6 w-full" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-6 w-full" />
                    </TableCell>
                    <TableCell className="flex justify-end">
                      <Skeleton className="h-6 w-full" />
                    </TableCell>
                    <TableCell className="text-center">
                      <Skeleton className="h-6 w-20 mx-auto" />
                    </TableCell>
                    <TableCell className="max-w-fit">
                      <Skeleton className="ml-auto size-6" />
                    </TableCell>
                    <TableCell className="max-w-fit">
                      <Skeleton className="ml-auto size-6" />
                    </TableCell>
                  </TableRow>
                ))}

              {!templates.isPending && templates.data?.data.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-muted-foreground py-8 text-center"
                  >
                    No templates found. Add your first template to get started.
                  </TableCell>
                </TableRow>
              )}

              {!templates.isPending &&
                templates.data &&
                templates.data.data.map((template) => (
                  <TableRow key={template.id}>
                    <TableCell className="text-right font-mono tabular-nums">
                      {template.id}
                    </TableCell>
                    <TableCell className="font-medium">{template.name}</TableCell>
                    <TableCell className="font-medium">
                      <Badge variant={"secondary"}>{template.type}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {template.questionCount}
                    </TableCell>
                    <TableCell className="text-center">
                      <ScoreBadge score={template.totalPoints ? Number(template.totalPoints) : 0} />
                    </TableCell>

                    <TableCell className="max-w-fit text-right">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() =>
                              setTemplateToDelete({
                                id: template.id,
                                name: template.name,
                              })
                            }
                            disabled={deleteTemplate.isPending}
                          >
                            <TrashIcon className="h-4 w-4" />
                            <span className="sr-only">Delete template</span>
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="max-w-md">
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              <div className="flex items-center gap-2">
                                <TrashIcon className="h-5 w-5 text-destructive" />
                                Delete Template
                              </div>
                            </AlertDialogTitle>
                            <AlertDialogDescription className="text-sm text-muted-foreground">
                              Are you sure you want to delete <span className="font-semibold text-foreground">"{template.name}"</span>?
                              This action cannot be undone and will permanently remove this template 
                              and all related data from the system.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter className="gap-2">
                            <AlertDialogCancel
                              onClick={() => setTemplateToDelete(null)}
                              disabled={deleteTemplate.isPending}
                              className="mt-0"
                            >
                              Cancel
                            </AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => {
                                setTemplateToDelete(null);
                                deleteTemplate.mutate({ id: template.id });
                              }}
                              disabled={deleteTemplate.isPending}
                              className="bg-red-600 text-white shadow-lg hover:bg-red-700 hover:shadow-xl focus:ring-2 focus:ring-red-500 focus:ring-offset-2 active:bg-red-800 transition-all duration-200 font-medium px-4 py-2 rounded-md border-0 min-w-[100px] flex items-center justify-center gap-2"
                            >
                              {deleteTemplate.isPending ? (
                                <>
                                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                  <span>Deleting...</span>
                                </>
                              ) : (
                                <>
                                  <TrashIcon className="h-4 w-4" />
                                  <span>Delete</span>
                                </>
                              )}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                    
                    <TableCell className="text-right">
                      <Link
                        href={`/qisv/templates/${template.id}`}
                        className={cn(buttonVariants({ size: "icon", variant: "outline" }))}
                      >
                        <ExternalLinkIcon className="size-4" />
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>

        <div className="mt-4 flex items-center justify-between px-4">
          <div className="text-muted-foreground hidden flex-1 text-sm lg:flex" />

          <div className="flex w-full items-center gap-8 lg:w-fit">
            <div className="hidden items-center gap-2 lg:flex">
              <Label htmlFor="rows-per-page" className="text-sm font-medium">
                Rows per page
              </Label>
              <Select
                value={pageSize.toString()}
                onValueChange={(v) => handlePageSize(Number(v))}
              >
                <SelectTrigger size="sm" className="w-20" id="rows-per-page">
                  <SelectValue placeholder={pageSize} />
                </SelectTrigger>
                <SelectContent side="top">
                  {PAGE_SIZES.map((size) => (
                    <SelectItem key={size} value={`${size}`}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {templates.data ? (
              <div className="text-sm font-medium">
                Page {page} of {templates.data.totalPages}
              </div>
            ) : (
              <Skeleton className="h-4 w-[50px]" />
            )}

            <div className="ml-auto flex items-center gap-2 lg:ml-0">
              <Button
                variant="outline"
                className="hidden size-8 p-0 lg:flex"
                onClick={() => handlePage(1)}
                disabled={page === 1}
              >
                <ChevronsLeftIcon />
              </Button>
              <Button
                variant="outline"
                className="size-8"
                onClick={() => handlePage(page - 1)}
                disabled={page === 1}
              >
                <ChevronLeftIcon />
              </Button>
              <Button
                variant="outline"
                className="size-8"
                onClick={() => handlePage(page + 1)}
                disabled={
                  templates.data ? page === templates.data.totalPages : true
                }
              >
                <ChevronRightIcon />
              </Button>
              <Button
                variant="outline"
                className="hidden size-8 lg:flex"
                onClick={() => handlePage(templates.data?.totalPages ?? 1)}
                disabled={
                  templates.data ? page === templates.data.totalPages : true
                }
              >
                <ChevronsRightIcon />
              </Button>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
