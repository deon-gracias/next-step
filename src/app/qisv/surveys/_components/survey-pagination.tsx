"use client";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChevronsLeftIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsRightIcon,
} from "lucide-react";

interface SurveyPaginationProps {
  currentPage: number;
  pageSize: number;
  pageCount: number;
  totalResults: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  pageSizes?: number[];
  isLoading?: boolean;
}

export function SurveyPagination({
  currentPage,
  pageSize,
  pageCount,
  totalResults,
  onPageChange,
  onPageSizeChange,
  pageSizes = [10, 25, 50],
  isLoading = false,
}: SurveyPaginationProps) {
  const canGoPrevious = currentPage > 1;
  const canGoNext = currentPage < pageCount;

  return (
    <div className="flex items-center justify-between px-4">
      {/* Rows per page selector */}
      <div className="flex w-full items-center gap-8 lg:w-fit">
        <div className="hidden items-center gap-2 lg:flex">
          <Label htmlFor="rows-per-page" className="text-sm font-medium">
            Rows per page
          </Label>
          <Select
            value={pageSize.toString()}
            onValueChange={(value) => onPageSizeChange(Number(value))}
          >
            <SelectTrigger size="sm" className="w-20" id="rows-per-page">
              <SelectValue placeholder={pageSize.toString()} />
            </SelectTrigger>
            <SelectContent side="top">
              {pageSizes.map((size) => (
                <SelectItem key={size} value={size.toString()}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Page info and navigation */}
      <div className="flex w-full items-center gap-8 lg:w-fit">
        <div className="flex w-fit items-center justify-center text-sm font-medium">
          {isLoading ? (
            <Skeleton className="h-5 w-28" />
          ) : pageCount > 0 ? (
            <>
              Page {currentPage} of {pageCount}
            </>
          ) : (
            "No pages"
          )}
        </div>

        <div className="ml-auto flex items-center gap-2 lg:ml-0">
          <Button
            variant="outline"
            className="hidden h-8 w-8 p-0 lg:flex"
            onClick={() => onPageChange(1)}
            disabled={!canGoPrevious || isLoading}
            aria-label="Go to first page"
          >
            <ChevronsLeftIcon />
          </Button>
          <Button
            variant="outline"
            className="size-8"
            size="icon"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={!canGoPrevious || isLoading}
            aria-label="Go to previous page"
          >
            <ChevronLeftIcon />
          </Button>
          <Button
            variant="outline"
            className="size-8"
            size="icon"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={!canGoNext || isLoading}
            aria-label="Go to next page"
          >
            <ChevronRightIcon />
          </Button>
          <Button
            variant="outline"
            className="hidden size-8 lg:flex"
            size="icon"
            onClick={() => onPageChange(pageCount)}
            disabled={!canGoNext || isLoading}
            aria-label="Go to last page"
          >
            <ChevronsRightIcon />
          </Button>
        </div>
      </div>
    </div>
  );
}
