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
  UploadIcon,
  FileTextIcon,
  TrashIcon,
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
import { useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { authClient } from "@/components/providers/auth-client";
import { FacilityHoverCard } from "../_components/facility-card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

function FacilityValue({ id }: { id: number }) {
  const facility = api.facility.byId.useQuery({ id });

  if (facility.isPending) return <Skeleton className="h-4 w-[100px]" />;

  if (!facility.data)
    return <span className="text-muted-foreground text-sm">No facility</span>;

  return <FacilityHoverCard facility={facility.data} />;
}

const PAGE_SIZES = [10, 50, 100];

export default function ResidentsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const page = Number(searchParams.get("page") ?? 1);
  const pageSize = Number(searchParams.get("pageSize") ?? PAGE_SIZES[0]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [isUploadingCSV, setIsUploadingCSV] = useState(false);
  const [residentToDelete, setResidentToDelete] = useState<{ id: number; name: string } | null>(null);

  const activeOrganization = authClient.useActiveOrganization();

  const residents = api.resident.list.useQuery({
    page,
    pageSize,
  });

  const utils = api.useUtils();

  const bulkCreateResidents = api.resident.bulkCreate.useMutation({
    onSuccess: (data) => {
      toast.success(`Successfully added ${data.count} residents`);
      void utils.resident.list.invalidate();
      setIsUploadingCSV(false);
    },
    onError: (error) => {
      toast.error(`Failed to upload residents: ${error.message}`);
      setIsUploadingCSV(false);
    },
  });

  const deleteResident = api.resident.delete.useMutation({
    onSuccess: () => {
      toast.success("Resident deleted successfully");
      void utils.resident.list.invalidate();
      setResidentToDelete(null);
    },
    onError: (error) => {
      toast.error(`Failed to delete resident: ${error.message}`);
      setResidentToDelete(null);
    },
  });

  const hasNewResidentPermission = useQuery({
    queryKey: ["residentPermission"],
    queryFn: async () =>
      (
        await authClient.organization.hasPermission({
          permissions: { member: ["create"] },
        })
      ).data?.success ?? false,
  });

  const hasDeleteResidentPermission = useQuery({
    queryKey: ["residentDeletePermission"],
    queryFn: async () =>
      (
        await authClient.organization.hasPermission({
          permissions: { member: ["delete"] },
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

  const parseCSV = (csvContent: string): any[] => {
    const lines = csvContent.trim().split('\n');
    if (lines.length < 2) {
      throw new Error('CSV must have at least a header row and one data row');
    }

    const firstLine = lines[0];
    if (!firstLine) {
      throw new Error('CSV header row is empty');
    }

    const headers = firstLine.split(',').map(h => h.trim().toLowerCase());

    const requiredHeaders = ['name', 'facilityid', 'roomid', 'pcciid'];
    const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));

    if (missingHeaders.length > 0) {
      throw new Error(`Missing required columns: ${missingHeaders.join(', ')}`);
    }

    const residents = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;

      const values = line.split(',').map(v => v.trim());
      const resident: any = {};

      headers.forEach((header, index) => {
        let value = values[index] || '';

        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.slice(1, -1);
        }

        switch (header) {
          case 'name':
            resident.name = value;
            break;
          case 'facilityid':
            resident.facilityId = parseInt(value);
            if (isNaN(resident.facilityId)) {
              throw new Error(`Invalid facility ID on row ${i + 1}: ${value}`);
            }
            break;
          case 'roomid':
            resident.roomId = value;
            break;
          case 'pcciid':
            resident.pcciId = value; // This will map to ppci_id in your schema
            break;
        }
      });

      if (!resident.name || !resident.facilityId || !resident.roomId || !resident.pcciId) {
        throw new Error(`Missing required data on row ${i + 1}`);
      }

      residents.push(resident);
    }

    return residents;
  };

  const handleCSVUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast.error('Please select a CSV file');
      return;
    }

    setIsUploadingCSV(true);

    try {
      const csvContent = await file.text();
      const residents = parseCSV(csvContent);

      if (residents.length === 0) {
        toast.error('No valid resident data found in CSV');
        setIsUploadingCSV(false);
        return;
      }

      await bulkCreateResidents.mutateAsync({ residents });

    } catch (error: any) {
      toast.error(error.message || 'Failed to process CSV file');
      setIsUploadingCSV(false);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const triggerCSVUpload = () => {
    fileInputRef.current?.click();
  };

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
            <div className="flex items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleCSVUpload}
                className="hidden"
              />
              <Button
                variant="outline"
                onClick={triggerCSVUpload}
                disabled={isUploadingCSV}
              >
                {isUploadingCSV ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <UploadIcon className="mr-2 size-4" />
                    Attach CSV
                  </>
                )}
              </Button>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <PlusIcon className="mr-2 size-4" />
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
            </div>
          )}
        </div>
        <div className="mb-4 rounded-lg bg-muted/50 p-4">
          <div className="flex items-start gap-2">
            <FileTextIcon className="mt-0.5 size-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">CSV Format</p>
              <p className="text-xs text-muted-foreground">
                Required columns: <code>name, facilityId, roomId, pcciId</code>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Example: <code>John Doe,1,Room-101,PCCI-001</code>
              </p>
            </div>
          </div>
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
                {hasDeleteResidentPermission.data && (
                  <TableHead className="w-[100px]">Actions</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {residents.isPending &&
                Array.from({ length: pageSize }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-right">
                      <Skeleton className="ml-auto h-6 w-12" />
                    </TableCell>
                    {Array.from({ length: 4 }).map((_, i) => (
                      <TableCell key={i}>
                        <Skeleton className="h-6" />
                      </TableCell>
                    ))}
                    {hasDeleteResidentPermission.data && (
                      <TableCell>
                        <Skeleton className="h-8 w-8" />
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              {!residents.isPending &&
                residents.data &&
                residents.data.data.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={hasDeleteResidentPermission.data ? 6 : 5}
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
                    <TableCell className="font-medium">{resident.name}</TableCell>
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
                    {hasDeleteResidentPermission.data && (
                      <TableCell>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() =>
                                setResidentToDelete({
                                  id: resident.id,
                                  name: resident.name,
                                })
                              }
                              disabled={deleteResident.isPending}
                            >
                              <TrashIcon className="h-4 w-4" />
                              <span className="sr-only">Delete resident</span>
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Are you absolutely sure?
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                This action cannot be undone. This will
                                permanently delete the resident "
                                {residentToDelete?.id === resident.id
                                  ? residentToDelete.name
                                  : resident.name}
                                " and remove all data from our servers.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel
                                onClick={() => setResidentToDelete(null)}
                                disabled={deleteResident.isPending}
                              >
                                Cancel
                              </AlertDialogCancel>
                              <AlertDialogAction
                                className="px-6 py-2 rounded-lg bg-destructive text-white font-semibold transition-colors duration-150 hover:bg-red-700 active:bg-red-800 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                                onClick={() => {
                                  setResidentToDelete(null);
                                  deleteResident.mutate({ id: resident.id });
                                }}
                                disabled={deleteResident.isPending}
                              >
                                {deleteResident.isPending
                                  ? "Deleting..."
                                  : "Delete"}
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
