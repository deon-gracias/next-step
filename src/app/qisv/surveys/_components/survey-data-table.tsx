"use client";

import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  type VisibilityState,
  type RowSelectionState,
  type SortingState,
  getSortedRowModel,
  type OnChangeFn,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import React, { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { SettingsIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  isLoading?: boolean;
  pageSize?: number;
  pageCount: number;
  className?: string;
  columnVisibility?: VisibilityState;
  rowSelection?: RowSelectionState;
  onRowSelection?: OnChangeFn<RowSelectionState> | undefined;
  onColumnVisibilityChange?: (visibility: VisibilityState) => void;
}

export function SurveyDataTable<TData, TValue>({
  columns,
  data,
  isLoading = false,
  pageSize = 10,
  pageCount: controlledPageCount,
  columnVisibility: externalColumnVisibility,
  onColumnVisibilityChange,
  rowSelection = {},
  onRowSelection,
  className,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [internalColumnVisibility, setInternalColumnVisibility] =
    useState<VisibilityState>({});

  // Use external column visibility if provided, otherwise use internal state
  const columnVisibility = externalColumnVisibility ?? internalColumnVisibility;

  const handleColumnVisibilityChange = (
    updater: VisibilityState | ((old: VisibilityState) => VisibilityState),
  ) => {
    const newVisibility =
      typeof updater === "function" ? updater(columnVisibility) : updater;

    if (onColumnVisibilityChange) {
      onColumnVisibilityChange(newVisibility);
    } else {
      setInternalColumnVisibility(newVisibility);
    }
  };

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: true,
    pageCount: controlledPageCount,
    onSortingChange: setSorting,
    onColumnVisibilityChange: handleColumnVisibilityChange,
    onRowSelectionChange: onRowSelection,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
    },
    getRowId: (row: any) => row.id?.toString() ?? row.key?.toString(),
  });

  return (
    <>
      {/* Column Visibility Toggle */}
      {/* <div className="flex items-center justify-end"> */}
      {/*   <DropdownMenu> */}
      {/*     <DropdownMenuTrigger asChild> */}
      {/*       <Button variant="outline" size="sm"> */}
      {/*         <SettingsIcon /> */}
      {/*         View */}
      {/*       </Button> */}
      {/*     </DropdownMenuTrigger> */}
      {/*     <DropdownMenuContent align="end" className="w-[200px]"> */}
      {/*       <DropdownMenuLabel>Toggle columns</DropdownMenuLabel> */}
      {/*       <DropdownMenuSeparator /> */}
      {/*       {table */}
      {/*         .getAllColumns() */}
      {/*         .filter((column) => column.getCanHide()) */}
      {/*         .map((column) => { */}
      {/*           return ( */}
      {/*             <DropdownMenuCheckboxItem */}
      {/*               key={column.id} */}
      {/*               className="capitalize" */}
      {/*               checked={column.getIsVisible()} */}
      {/*               onCheckedChange={(value) => */}
      {/*                 column.toggleVisibility(!!value) */}
      {/*               } */}
      {/*             > */}
      {/*               {column.id} */}
      {/*             </DropdownMenuCheckboxItem> */}
      {/*           ); */}
      {/*         })} */}
      {/*     </DropdownMenuContent> */}
      {/*   </DropdownMenu> */}
      {/* </div> */}

      {/* Table */}
      <div className="max-w-full overflow-x-scroll">
        <Table className="max-w-full overflow-x-scroll">
          <TableHeader className="bg-background sticky top-0">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id} className="bg-background">
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody className="max-w-full overflow-x-scroll">
            {isLoading ? (
              Array.from({ length: pageSize }).map((_, rowIndex) => (
                <TableRow key={rowIndex}>
                  {columns.map((_, colIndex) => (
                    <TableCell key={colIndex} className="py-2">
                      <Skeleton className="h-6 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className="group"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="w-fit p-2">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  <div className="text-muted-foreground flex flex-col items-center justify-center gap-2">
                    <p className="text-sm">No surveys found</p>
                    <p className="text-xs">Try adjusting your filters</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
