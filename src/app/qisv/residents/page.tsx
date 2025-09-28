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
  Trash2Icon,
  FilterIcon,
  XIcon,
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
import { Checkbox } from "@/components/ui/checkbox";
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

function formatDate(date: Date | string) {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

const PAGE_SIZES = [10, 50, 100];

export default function ResidentsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const page = Number(searchParams.get("page") ?? 1);
  const pageSize = Number(searchParams.get("pageSize") ?? PAGE_SIZES[0]);
  const facilityFilter = searchParams.get("facility");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [isUploadingCSV, setIsUploadingCSV] = useState(false);
  const [residentToDelete, setResidentToDelete] = useState<{ id: number; name: string } | null>(null);
  const [selectedResidents, setSelectedResidents] = useState<Set<number>>(new Set());
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);

  const activeOrganization = authClient.useActiveOrganization();

  // Get facilities for the filter dropdown
  const facilities = api.facility.list.useQuery({ page: 1, pageSize: 100 });

  const residents = api.resident.list.useQuery({
    page,
    pageSize,
    facilityId: facilityFilter ? Number(facilityFilter) : undefined,
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

  const bulkDeleteResidents = api.resident.bulkDelete.useMutation({
    onSuccess: (data) => {
      toast.success(`Successfully deleted ${data.count} residents`);
      void utils.resident.list.invalidate();
      setSelectedResidents(new Set());
      setShowBulkDeleteDialog(false);
    },
    onError: (error) => {
      toast.error(`Failed to delete residents: ${error.message}`);
      setShowBulkDeleteDialog(false);
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
    newSearchParams.set("page", "1");
    router.replace(`?${newSearchParams.toString()}`);
    setSelectedResidents(new Set());
  }

  function handlePage(page: number) {
    const newSearchParams = new URLSearchParams(searchParams.toString());
    newSearchParams.set("page", String(page));
    router.replace(`?${newSearchParams.toString()}`);
    setSelectedResidents(new Set());
  }

  // Facility filter handlers
  function handleFacilityFilter(facilityId: string | null) {
    const newSearchParams = new URLSearchParams(searchParams.toString());
    if (facilityId && facilityId !== "all") {
      newSearchParams.set("facility", facilityId);
    } else {
      newSearchParams.delete("facility");
    }
    newSearchParams.set("page", "1");
    router.replace(`?${newSearchParams.toString()}`);
    setSelectedResidents(new Set());
  }

  function clearFilters() {
    const newSearchParams = new URLSearchParams(searchParams.toString());
    newSearchParams.delete("facility");
    newSearchParams.set("page", "1");
    router.replace(`?${newSearchParams.toString()}`);
    setSelectedResidents(new Set());
  }

  // Bulk selection handlers
  const handleSelectAll = (checked: boolean) => {
    if (!residents.data) return;

    if (checked) {
      const allIds = new Set(residents.data.data.map(resident => resident.id));
      setSelectedResidents(allIds);
    } else {
      setSelectedResidents(new Set());
    }
  };

  const handleSelectResident = (residentId: number, checked: boolean) => {
    const newSelected = new Set(selectedResidents);
    if (checked) {
      newSelected.add(residentId);
    } else {
      newSelected.delete(residentId);
    }
    setSelectedResidents(newSelected);
  };

  const handleBulkDelete = () => {
    const idsToDelete = Array.from(selectedResidents);
    bulkDeleteResidents.mutate({ ids: idsToDelete });
  };

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

    const requiredHeaders = ['initials', 'facilityCode', 'roomid', 'pccId#'];
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
          case 'initials':
            resident.name = value;
            break;
          case 'facilityCode':
            resident.facilityId = parseInt(value);
            if (isNaN(resident.facilityId)) {
              throw new Error(`Invalid facility ID on row ${i + 1}: ${value}`);
            }
            break;
          case 'roomNo':
            resident.roomId = value;
            break;
          case 'pccId#':
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

  const isAllSelected = residents.data ?
    residents.data.data.length > 0 && residents.data.data.every(resident => selectedResidents.has(resident.id)) :
    false;

  const isIndeterminate = residents.data ?
    selectedResidents.size > 0 && selectedResidents.size < residents.data.data.length :
    false;

  // Get the selected facility name for display
  const selectedFacilityName = facilityFilter 
    ? facilities.data?.data.find(f => f.id === Number(facilityFilter))?.name
    : null;

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
          <div className="flex items-center gap-3">
            {/* Bulk Delete Button */}
            {hasDeleteResidentPermission.data && selectedResidents.size > 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    <Trash2Icon className="mr-2 size-4" />
                    Delete Selected ({selectedResidents.size})
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Multiple Residents</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete {selectedResidents.size} selected residents?
                      This action cannot be undone and will permanently remove all selected residents
                      and their data from the system.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel
                      onClick={() => setShowBulkDeleteDialog(false)}
                      disabled={bulkDeleteResidents.isPending}
                    >
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleBulkDelete}
                      disabled={bulkDeleteResidents.isPending}
                      className="bg-red-600 text-white shadow-lg hover:bg-red-700 hover:shadow-xl focus:ring-2 focus:ring-red-500 focus:ring-offset-2 active:bg-red-800 transition-all duration-200 font-medium px-4 py-2 rounded-md border-0 min-w-[120px] flex items-center justify-center gap-2"
                    >
                      {bulkDeleteResidents.isPending ? (
                        <>
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          <span>Deleting...</span>
                        </>
                      ) : (
                        <>
                          <TrashIcon className="h-4 w-4" />
                          <span>Delete {selectedResidents.size} Residents</span>
                        </>
                      )}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}

            {hasNewResidentPermission.data && (
              <>
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
              </>
            )}
          </div>
        </div>

        {/* Facility Filter */}
        <div className="mb-4 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <FilterIcon className="h-4 w-4 text-muted-foreground" />
            <Label className="text-sm font-medium">Filter by Facility:</Label>
            <Select
              value={facilityFilter || "all"}
              onValueChange={(value) => handleFacilityFilter(value === "all" ? null : value)}
            >
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder="All facilities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All facilities</SelectItem>
                {facilities.data?.data.map((facility) => (
                  <SelectItem key={facility.id} value={facility.id.toString()}>
                    {facility.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Active Filter Display */}
          {selectedFacilityName && (
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="flex items-center gap-1">
                {selectedFacilityName}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 hover:bg-transparent"
                  onClick={clearFilters}
                >
                  <XIcon className="h-3 w-3" />
                </Button>
              </Badge>
            </div>
          )}

          {facilityFilter && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="text-muted-foreground hover:text-foreground"
            >
              Clear filters
            </Button>
          )}
        </div>

        <div className="mb-4 rounded-lg bg-muted/50 p-4">
          <div className="flex items-start gap-2">
            <FileTextIcon className="mt-0.5 size-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">CSV Format</p>
              <p className="text-xs text-muted-foreground">
                Required columns: <code>initials, facilityCode, roomNo, pccId#</code>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Example: <code>R,1,Room-101,PCC-001</code>
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow className="bg-secondary text-secondary-foreground">
                {hasDeleteResidentPermission.data && (
                  <TableHead className="w-[50px]">
                    <Checkbox
                      checked={isAllSelected}
                      ref={(el) => {
                        if (el) (el as HTMLInputElement).indeterminate = isIndeterminate;
                      }}
                      onCheckedChange={handleSelectAll}
                      aria-label="Select all residents"
                    />
                  </TableHead>
                )}
                <TableHead className="w-[80px] text-right">System ID</TableHead>
                <TableHead>Initials</TableHead>
                <TableHead>Facility</TableHead>
                <TableHead>Room No</TableHead>
                <TableHead>PCC ID #</TableHead>
                <TableHead>Added At</TableHead>
                {hasDeleteResidentPermission.data && (
                  <TableHead className="w-[100px]">Actions</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {residents.isPending &&
                Array.from({ length: pageSize }).map((_, i) => (
                  <TableRow key={i}>
                    {hasDeleteResidentPermission.data && (
                      <TableCell>
                        <Skeleton className="h-4 w-4" />
                      </TableCell>
                    )}
                    <TableCell className="text-right">
                      <Skeleton className="ml-auto h-6 w-12" />
                    </TableCell>
                    {Array.from({ length: 5 }).map((_, i) => (
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
                      colSpan={hasDeleteResidentPermission.data ? 8 : 6}
                      className="text-muted-foreground py-8 text-center"
                    >
                      {selectedFacilityName ? (
                        <div className="flex flex-col items-center gap-2">
                          <FilterIcon className="h-8 w-8 text-muted-foreground/50" />
                          <p>No residents found in "{selectedFacilityName}"</p>
                          <Button onClick={clearFilters} variant="ghost" size="sm">
                            View all residents
                          </Button>
                        </div>
                      ) : (
                        "No residents found. Add your first resident to get started."
                      )}
                    </TableCell>
                  </TableRow>
                )}
              {!residents.isPending &&
                residents.data &&
                residents.data.data.map((resident) => (
                  <TableRow key={resident.id}>
                    {hasDeleteResidentPermission.data && (
                      <TableCell>
                        <Checkbox
                          checked={selectedResidents.has(resident.id)}
                          onCheckedChange={(checked) =>
                            handleSelectResident(resident.id, checked as boolean)
                          }
                          aria-label={`Select resident ${resident.name}`}
                        />
                      </TableCell>
                    )}
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
                    <TableCell className="text-sm text-muted-foreground">
                      {resident.createdAt ? formatDate(resident.createdAt) : 'N/A'}
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
          <div className="text-muted-foreground hidden flex-1 text-sm lg:flex">
            {selectedResidents.size > 0 && (
              <span>{selectedResidents.size} of {residents.data?.data.length || 0} resident(s) selected</span>
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
