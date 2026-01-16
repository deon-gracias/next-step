"use client";

import { api } from "@/trpc/react";
import { QISVHeader } from "../_components/header";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import {
  PlusIcon,
  XIcon,
  CirclePlusIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
  CalendarIcon,
} from "lucide-react";
import { authClient } from "@/components/providers/auth-client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import React, { useState, useMemo, useCallback } from "react";
import { canUI, type AppRole } from "@/lib/ui-permissions";
import { ButtonGroup } from "@/components/ui/button-group";
import { SurveyDataTable } from "./_components/survey-data-table";
import { surveyColumns } from "./_components/survey-columns";
import { Label } from "@/components/ui/label";
import type { RowSelectionState } from "@tanstack/react-table";
import { FacilityComboBox } from "../_components/facility-dropdown";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { TemplateComboBox } from "../_components/template-dropdown";
import { UserMultiComboBox } from "../_components/user-dropdown";
import { SurveyPagination } from "./_components/survey-pagination";
import { SurveyBatchActions } from "./_components/survey-batch-actions";
import { SurveyEmptyState } from "./_components/survey-empty-state";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { ChevronDownIcon } from "lucide-react";
import {
  useQueryStates,
  parseAsInteger,
  parseAsBoolean,
  parseAsArrayOf,
  parseAsString,
  parseAsIsoDate,
} from "nuqs";
import { useUserRole } from "@/hooks/use-user-role";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { DailySurveyTable } from "./_components/daily-survey-table";
import { Skeleton } from "@/components/ui/skeleton";

interface SurveyDatePickerProps {
  date: Date | undefined;
  onDateChange: (date: Date | undefined) => void;
}

function SurveyDatePicker({ date, onDateChange }: SurveyDatePickerProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          id="date"
          className="justify-between font-normal"
        >
          {date ? format(date, "PPP") : "Select date"}
          <ChevronDownIcon />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto overflow-hidden p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          captionLayout="dropdown"
          onSelect={(selectedDate) => {
            onDateChange(selectedDate);
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

// Helper Functions
const surveyParamsParser = {
  page: parseAsInteger.withDefault(1),
  pageSize: parseAsInteger.withDefault(10),
  poc: parseAsBoolean,
  locked: parseAsBoolean,
  facility: parseAsInteger,
  template: parseAsInteger,
  surveyors: parseAsArrayOf(parseAsString).withDefault([]),
  date: parseAsIsoDate,
};

// Custom Hooks

function useSurveyFilters() {
  const [filters, setFilters] = useQueryStates(surveyParamsParser, {
    history: "replace",
    shallow: false,
  });

  const clearFilters = () => setFilters(null);

  return {
    filters,
    updateFilters: setFilters,
    clearFilters,
  };
}

// Main Component
export default function SurveysPage() {
  const currentUser = authClient.useSession();
  const { data: memberRole, isLoading: isRoleLoading } = useUserRole();
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const { filters, updateFilters, clearFilters } = useSurveyFilters();

  // Permissions
  const canViewSurveys = canUI(memberRole, "surveys.view");
  const canManageSurveys =
    canUI(memberRole, "surveys.manage") && memberRole !== "surveyor";

  // Apply role-based filtering
  const surveyorIdFilter = useMemo(() => {
    if (memberRole === "surveyor" && currentUser.data?.user?.id) {
      return [currentUser.data.user.id];
    }
    return filters.surveyors;
  }, [memberRole, currentUser.data?.user?.id, filters.surveyors]);

  // Fetch surveys
  const surveysQuery = api.survey.list.useQuery(
    {
      page: filters.page,
      pageSize: filters.pageSize,
      surveyDate: filters.date ? format(filters.date, "yyyy-MM-dd") : undefined,
      pocGenerated: filters.poc ?? undefined,
      isLocked: filters.locked ?? undefined,
      surveyorId: surveyorIdFilter,
      facilityId: filters.facility ? [filters.facility] : undefined,
      templateId: filters.template ? [filters.template] : undefined,
    },
    {
      enabled: canViewSurveys && !!currentUser.data,
      refetchOnWindowFocus: true,
    },
  );

  const datesQuery = api.survey.listSurveyDates.useQuery(
    {
      page: filters.page, // Use the page filter for "Date Pages"
      pageSize: 10, // How many "Days" to show per page
      pocGenerated: filters.poc ?? undefined,
      isLocked: filters.locked ?? undefined,
      facilityId: filters.facility ?? undefined,
      surveyorId: filters.surveyors ?? undefined,
      templateId: filters.template ? [filters.template] : undefined,
    },
    {
      enabled: canViewSurveys && !!currentUser.data,
      refetchOnWindowFocus: true,
    },
  );

  // Calculate selected survey IDs
  const selectedSurveyIds = useMemo(() => {
    return Object.keys(rowSelection)
      .filter((key) => rowSelection[key])
      .map(Number);
  }, [rowSelection]);

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return !!(
      filters.poc !== undefined ||
      filters.locked !== undefined ||
      filters.facility ||
      filters.template ||
      filters.surveyors?.length ||
      filters.date
    );
  }, [filters]);

  // Show empty state when no data and no filters
  if (
    !surveysQuery.isLoading &&
    !surveysQuery.data?.data.length &&
    !hasActiveFilters
  ) {
    return (
      <>
        <QISVHeader crumbs={[{ label: "Surveys" }]} />
        <main className="grid gap-2 px-4 pb-10">
          <SurveyEmptyState />
        </main>
      </>
    );
  }

  return (
    <>
      <QISVHeader crumbs={[{ label: "Surveys" }]} />

      <main className="grid gap-4 px-4 pb-10">
        {/* Header Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {selectedSurveyIds.length > 0 && (
              <SurveyBatchActions
                selectedIds={selectedSurveyIds}
                onClearSelection={() => setRowSelection({})}
                onSuccess={() => {
                  setRowSelection({});
                  surveysQuery.refetch();
                }}
              />
            )}
          </div>

          {canManageSurveys && (
            <Link href="/qisv/surveys/new" className={buttonVariants()}>
              <PlusIcon />
              New Survey
            </Link>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {/* Date Filter */}
            <ButtonGroup>
              {filters.date && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => updateFilters({ date: null })}
                >
                  <XIcon />
                </Button>
              )}
              <SurveyDatePicker
                date={filters.date ?? undefined}
                onDateChange={(date) => updateFilters({ date })}
              />
            </ButtonGroup>

            {/* Surveyors Filter */}
            {memberRole !== "surveyor" && (
              <ButtonGroup>
                {filters.surveyors && filters.surveyors.length > 0 && (
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => updateFilters({ surveyors: null })}
                  >
                    <XIcon />
                  </Button>
                )}
                <UserMultiComboBox
                  align="start"
                  selectedItems={filters.surveyors ?? []}
                  onChange={(users) =>
                    updateFilters({
                      surveyors: users.length > 0 ? users : undefined,
                    })
                  }
                />
              </ButtonGroup>
            )}

            {/* Template Filter */}
            <ButtonGroup>
              {filters.template && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => updateFilters({ template: null })}
                >
                  <XIcon />
                </Button>
              )}
              <TemplateComboBox
                align="start"
                selectedItem={filters.template ?? undefined}
                onSelect={(template) => updateFilters({ template: template })}
              />
            </ButtonGroup>

            {/* Facility Filter */}
            <ButtonGroup>
              {filters.facility && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => updateFilters({ facility: null })}
                >
                  <XIcon />
                </Button>
              )}
              <FacilityComboBox
                selectedItem={filters.facility ?? undefined}
                onSelect={(facility) => updateFilters({ facility: facility })}
              />
            </ButtonGroup>

            {/* Status Filter */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="border-dashed">
                  <CirclePlusIcon />
                  Status
                  {(filters.poc !== null || filters.locked !== null) && (
                    <>
                      <Separator orientation="vertical" className="mx-2 h-4" />
                      {filters.poc !== null && (
                        <Badge
                          variant="secondary"
                          className="rounded-sm px-1 font-normal"
                        >
                          POC Generated
                        </Badge>
                      )}
                      {filters.locked !== null && (
                        <Badge
                          variant="secondary"
                          className="rounded-sm px-1 font-normal"
                        >
                          Locked
                        </Badge>
                      )}
                    </>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuCheckboxItem
                  checked={filters.poc === true}
                  onCheckedChange={(checked) =>
                    updateFilters({ poc: checked ? true : null })
                  }
                >
                  POC Generated
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={filters.locked === true}
                  onCheckedChange={(checked) =>
                    updateFilters({ locked: checked ? true : null })
                  }
                >
                  Locked
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Clear All Filters */}
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Clear filters
            </Button>
          )}
        </div>

        {/* <SurveyDataTable */}
        {/*   rowSelection={rowSelection} */}
        {/*   onRowSelection={setRowSelection} */}
        {/*   columns={surveyColumns} */}
        {/*   data={surveysQuery.data?.data ?? []} */}
        {/*   isLoading={surveysQuery.isLoading} */}
        {/*   pageSize={filters.pageSize} */}
        {/*   pageCount={surveysQuery.data?.meta.pageCount ?? 0} */}
        {/* /> */}
        {/* <SurveyPagination */}
        {/*   currentPage={filters.page} */}
        {/*   pageSize={filters.pageSize} */}
        {/*   pageCount={surveysQuery.data?.meta.pageCount ?? 0} */}
        {/*   totalResults={surveysQuery.data?.meta.totalCount ?? 0} */}
        {/*   onPageChange={(page) => updateFilters({ page })} */}
        {/*   onPageSizeChange={(pageSize) => updateFilters({ pageSize, page: 1 })} */}
        {/*   pageSizes={PAGE_SIZES} */}
        {/*   isLoading={surveysQuery.isLoading} */}
        {/* /> */}

        <div className="rounded-md border">
          {datesQuery.isLoading ? (
            <div className="flex flex-col gap-2 divide-y py-2">
              {Array.from({ length: 10 }).map((_, idx) => (
                <div className="px-2" key={`loading-${idx}`}>
                  <Skeleton className="mb-2 h-[2rem] w-full" />
                </div>
              ))}
            </div>
          ) : datesQuery.data?.dates.length === 0 ? (
            <div className="text-muted-foreground p-8 text-center">
              No dates found matching filters.
            </div>
          ) : (
            <Accordion type="multiple" className="max-w-full">
              {datesQuery.data?.dates.map((dateString: string) => {
                const dateObj = new Date(dateString);

                return (
                  <AccordionItem
                    key={dateString}
                    value={dateString}
                    className="max-w-full"
                  >
                    <AccordionTrigger className="max-w-full px-4">
                      <div className="flex items-center gap-4">
                        <CalendarIcon className="text-muted-foreground size-4" />
                        {format(dateObj, "EEEE, MMMM do, yyyy")}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="max-w-full">
                      <DailySurveyTable
                        rowSelection={rowSelection}
                        onRowSelection={setRowSelection}
                        date={dateString}
                        filters={{
                          poc: filters.poc,
                          locked: filters.locked,
                          facility: filters.facility,
                        }}
                      />
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          )}
        </div>

        {/* DATE PAGINATION (Outer Layer) */}
        <div className="flex items-center justify-end gap-2 py-4">
          <div className="text-muted-foreground mr-4 text-sm">
            Page {filters.page} of {datesQuery.data?.meta.pageCount ?? 1}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              updateFilters({ page: Math.max(1, filters.page - 1) })
            }
            disabled={filters.page <= 1 || datesQuery.isLoading}
          >
            <ChevronLeftIcon className="h-4 w-4" />
            Previous Days
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => updateFilters({ page: filters.page + 1 })}
            disabled={
              filters.page >= (datesQuery.data?.meta.pageCount ?? 1) ||
              datesQuery.isLoading
            }
          >
            Next Days
            <ChevronRightIcon className="h-4 w-4" />
          </Button>
        </div>
      </main>
    </>
  );
}
