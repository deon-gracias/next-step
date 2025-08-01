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

const PAGE_SIZES = [10, 50, 100];

export default function () {
  const router = useRouter();
  const searchParams = useSearchParams();

  const page = Number(searchParams.get("page") ?? 1);
  const pageSize = Number(searchParams.get("pageSize") ?? PAGE_SIZES[0]);

  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const facilities = api.facility.list.useQuery({
    page,
    pageSize,
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
          permissions: { facility: ["create"] },
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
                  </TableRow>
                ))}

              {!facilities.isPending &&
                facilities.data &&
                facilities.data.data.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={5}
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
