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

const PAGE_SIZES = [10, 50, 100];

export default function () {
  const router = useRouter();
  const searchParams = useSearchParams();

  const page = Number(searchParams.get("page") ?? 1);
  const pageSize = Number(searchParams.get("pageSize") ?? PAGE_SIZES[0]);

  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [facilityToDelete, setFacilityToDelete] = useState<{
    id: number;
    name: string;
  } | null>(null);

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
    router.replace(`?${newSearchParams.toString()}`);
  }
  function handlePage(page: number) {
    const newSearchParams = new URLSearchParams(searchParams.toString());
    newSearchParams.set("page", String(page));
    router.replace(`?${newSearchParams.toString()}`);
  }

  const hasNewFacilityPermission = useQuery({
    queryKey: [],
    queryFn: async () =>
      (
        await authClient.organization.hasPermission({
          permissions: { organization: ["update"] },
        })
      ).data?.success ?? false,
  });
  const hasDeleteFacilityPermission = useQuery({
    queryKey: [],
    queryFn: async () =>
      (
        await authClient.organization.hasPermission({
          permissions: { organization: ["delete"] },
        })
      ).data?.success ?? false,
  });

  return (
    <>
      <QISVHeader crumbs={[{ label: "Facilities" }]} />
      <main className="px-4 py-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Facilities</h1>
            <p className="text-muted-foreground">Manage facilities</p>
          </div>
          {hasNewFacilityPermission.data && (
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
                <NewFacilityForm />
              </DialogContent>
            </Dialog>
          )}
        </div>
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow className="bg-secondary text-secondary-foreground">
                <TableHead className="w-[80px] text-right">ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Address</TableHead>
                {hasDeleteFacilityPermission.data && (
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
                    {Array.from({ length: 2 }).map((_, i) => (
                      <TableCell key={i}>
                        <Skeleton className="h-6" />
                      </TableCell>
                    ))}
                    {hasDeleteFacilityPermission.data && (
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
                      colSpan={hasDeleteFacilityPermission.data ? 4 : 3}
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
                    <TableCell className="font-medium">
                      {facility.name}
                    </TableCell>
                    <TableCell>{facility.address}</TableCell>
                    {hasDeleteFacilityPermission.data && (
                      <TableCell>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            {/* The button opens the dialog, and we set facilityToDelete state HERE */}
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
