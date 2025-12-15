"use client";

import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import {
  PlusIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsRightIcon,
  ChevronsLeftIcon,
  TrashIcon,
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
import { NewFacilityForm } from "./_components/new-facility-form";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Label } from "@/components/ui/label";
import { Select } from "@radix-ui/react-select";
import {
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { authClient } from "@/components/providers/auth-client";
import { toast } from "sonner";
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

export default function FacilitiesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const page = Number(searchParams.get("page") ?? 1);
  const pageSize = Number(searchParams.get("pageSize") ?? PAGE_SIZES[0]);

  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [facilityToDelete, setFacilityToDelete] = useState<{
    id: number;
    name: string;
  } | null>(null);

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
  const canViewFacilities = canUI(appRole, "facilities.view");
  const canManageFacilities = canUI(appRole, "facilities.manage");
  const canDeleteFacilities = canUI(appRole, "facilities.manage");

  const facilities = api.facility.list.useQuery({
    page,
    pageSize,
  });

  const deleteFacility = api.facility.delete.useMutation({
    onSuccess: () => {
      toast.success("Facility deleted successfully");
      facilities.refetch();
      setFacilityToDelete(null);
    },
    onError: (error) => {
      toast.error(`Failed to delete facility: ${error.message}`);
      setFacilityToDelete(null);
    },
  });

  function handlePageSize(pageSize: number) {
    const newSearchParams = new URLSearchParams(searchParams.toString());
    newSearchParams.set("pageSize", String(pageSize));
    newSearchParams.set("page", "1");
    router.replace(`?${newSearchParams.toString()}`);
  }

  function handlePage(page: number) {
    const newSearchParams = new URLSearchParams(searchParams.toString());
    newSearchParams.set("page", String(page));
    router.replace(`?${newSearchParams.toString()}`);
  }

  // SAME LOGIC: Loading state
  if (roleLoading) {
    return (
      <>
        {/* <QISVHeader crumbs={[{ label: "Facilities" }]} /> */}
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
  if (!canViewFacilities) {
    return (
      <>
        {/* <QISVHeader crumbs={[{ label: "Facilities" }]} /> */}
        <main className="px-4 py-6">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <h2 className="text-lg font-semibold">Access Denied</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                You don't have permission to view facilities.
              </p>
            </div>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      {/* <QISVHeader crumbs={[{ label: "Facilities" }]} /> */}
      <main className="px-4 py-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Facilities</h1>
            <p className="text-muted-foreground">Manage facilities</p>
          </div>
          {canManageFacilities && (
            <Dialog open={isSheetOpen} onOpenChange={setIsSheetOpen}>
              <DialogTrigger asChild>
                <Button>
                  <PlusIcon className="size-4" />
                  New Facility
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[400px] sm:w-[540px]">
                <DialogHeader>
                  <DialogTitle>Add New Facility</DialogTitle>
                </DialogHeader>
                <div onSubmit={() => setIsSheetOpen(false)}>
                  <NewFacilityForm />
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow className="bg-secondary text-secondary-foreground">
                <TableHead className="w-[80px] text-right">System ID</TableHead>
                <TableHead className="w-[120px]">Facility Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Address</TableHead>
                {canDeleteFacilities && (
                  <TableHead className="w-[100px]">Actions</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {facilities.isPending &&
                Array.from({ length: pageSize }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-right">
                      <Skeleton className="ml-auto h-6" />
                    </TableCell>
                    {Array.from({ length: 3 }).map((_, i) => (
                      <TableCell key={i}>
                        <Skeleton className="h-6" />
                      </TableCell>
                    ))}
                    {canDeleteFacilities && (
                      <TableCell>
                        <Skeleton className="h-8 w-8" />
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              {!facilities.isPending &&
                facilities.data &&
                facilities.data.data.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={canDeleteFacilities ? 5 : 4}
                      className="text-muted-foreground py-8 text-center"
                    >
                      No facilities found. Add your first facility to get
                      started.
                    </TableCell>
                  </TableRow>
                )}
              {!facilities.isPending &&
                facilities.data &&
                facilities.data.data.map((facility) => (
                  <TableRow key={facility.id}>
                    <TableCell className="text-right font-mono tabular-nums">
                      {facility.id}
                    </TableCell>
                    <TableCell className="text-center font-mono tabular-nums">
                      {facility.facilityCode || "—"}
                    </TableCell>
                    <TableCell className="font-medium">
                      {facility.name}
                    </TableCell>
                    <TableCell>{facility.address}</TableCell>
                    {canDeleteFacilities && (
                      <TableCell>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() =>
                                setFacilityToDelete({
                                  id: facility.id,
                                  name: facility.name,
                                })
                              }
                              disabled={deleteFacility.isPending}
                            >
                              <TrashIcon className="h-4 w-4" />
                              <span className="sr-only">Delete facility</span>
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Are you absolutely sure?
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                This action cannot be undone. This will
                                permanently delete the facility "
                                {facilityToDelete?.id === facility.id
                                  ? facilityToDelete?.name
                                  : facility.name}
                                " and remove all data from our servers.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel
                                onClick={() => setFacilityToDelete(null)}
                                disabled={deleteFacility.isPending}
                              >
                                Cancel
                              </AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => {
                                  setFacilityToDelete(null);
                                  deleteFacility.mutate({ id: facility.id });
                                }}
                                className="px-6 py-2 rounded-lg bg-destructive text-white 
             font-semibold transition-colors duration-150
             hover:bg-red-700 active:bg-red-800 focus:outline-none
             focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                                disabled={deleteFacility.isPending}
                              >
                                {deleteFacility.isPending ? "Deleting..." : "Delete"}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>
        {/* Footer */}
        <div className="mt-4 flex items-center justify-between px-4">
          <div className="text-muted-foreground hidden flex-1 text-sm lg:flex"></div>
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
            {facilities.data ? (
              <div className="flex w-fit items-center justify-center text-sm font-medium">
                Page {page} of {facilities.data.totalPages}
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
                  facilities.data ? page === facilities.data.totalPages : true
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
                  facilities.data && handlePage(facilities.data.totalPages)
                }
                disabled={
                  facilities.data ? page === facilities.data.totalPages : true
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
