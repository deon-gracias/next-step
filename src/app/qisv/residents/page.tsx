"use client";

import { QISVHeader } from "../_components/header";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import {
  MapPinIcon,
  PlusIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsRightIcon,
  ChevronsLeftIcon,
} from "lucide-react";
import { NewResidentForm } from "./_components/new-resident-form";
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
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Badge } from "@/components/ui/badge";
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

function FacilityValue({ id }: { id: number }) {
  const facility = api.facility.byId.useQuery({ id: id });

  if (facility.isPending) return <Skeleton className="h-4 w-[100px]" />;

  if (!facility.data)
    return <span className="text-muted-foreground text-sm">No facility</span>;

  return (
    <HoverCard>
      <HoverCardTrigger>
        <Badge
          variant="outline"
          className="hover:bg-muted cursor-pointer text-xs"
        >
          {facility.data.name}
        </Badge>
      </HoverCardTrigger>
      <HoverCardContent className="w-80">
        <div className="space-y-2">
          <h5 className="text-sm font-semibold">{facility.data.name}</h5>
          <p className="text-muted-foreground flex items-center gap-1 text-xs">
            <MapPinIcon className="size-3" />
            <span>{facility.data.address}</span>
          </p>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}

const PAGE_SIZES = [10, 50, 100];

export default function () {
  const router = useRouter();
  const searchParams = useSearchParams();

  const page = Number(searchParams.get("page") ?? 1);
  const pageSize = Number(searchParams.get("pageSize") ?? PAGE_SIZES[0]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const residents = api.resident.list.useQuery({
    page,
    pageSize,
  });

  const hasNewResidentPermission = useQuery({
    queryKey: [],
    queryFn: async () =>
      (
        await authClient.organization.hasPermission({
          permissions: { resident: ["create"] },
        })
      ).data?.success ?? false,
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

  return (
    <>
      <QISVHeader crumbs={[{ label: "Residents" }]} />
      <main className="px-4 py-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Residents</h1>
            <p className="text-muted-foreground">
              Manage residents and their facility assignments
            </p>
          </div>

          {hasNewResidentPermission.data && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <PlusIcon className="size-4" />
                  New Resident
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[400px] sm:w-[540px]">
                <DialogHeader>
                  <DialogTitle>Add New Resident</DialogTitle>
                </DialogHeader>
                <NewResidentForm />
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
                <TableHead>Facility</TableHead>
                <TableHead>Room</TableHead>
                <TableHead>PCCI ID</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {residents.isPending &&
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
                  </TableRow>
                ))}

              {!residents.isPending &&
                residents.data &&
                residents.data.data.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-muted-foreground py-8 text-center"
                    >
                      No residents found. Add your first resident to get
                      started.
                    </TableCell>
                  </TableRow>
                )}

              {!residents.isPending &&
                residents.data &&
                residents.data.data.map((resident) => (
                  <TableRow key={resident.id}>
                    <TableCell className="text-right font-mono tabular-nums">
                      {resident.id}
                    </TableCell>
                    <TableCell className="font-medium">
                      {resident.name}
                    </TableCell>
                    <TableCell>
                      <FacilityValue id={resident.facilityId} />
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">
                        {resident.roomId}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <code className="bg-muted rounded px-2 py-1 text-xs">
                        {resident.pcciId}
                      </code>
                    </TableCell>
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
            {residents.data ? (
              <div className="flex w-fit items-center justify-center text-sm font-medium">
                Page {page} of {residents.data.totalPages}
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
                  residents.data ? page === residents.data.totalPages : true
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
                  residents.data && handlePage(residents.data.totalPages)
                }
                disabled={
                  residents.data ? page === residents.data.totalPages : true
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
