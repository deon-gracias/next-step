"use client";

import { api } from "@/trpc/react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { PlusIcon, XIcon, CirclePlusIcon, CalendarIcon } from "lucide-react";
import { authClient } from "@/components/providers/auth-client";
import React, { useState, useMemo, Suspense } from "react";
import { canUI } from "@/lib/ui-permissions";
import { ButtonGroup } from "@/components/ui/button-group";
import type { RowSelectionState } from "@tanstack/react-table";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
import { Skeleton } from "@/components/ui/skeleton";
import { useParams } from "next/navigation";
import { QISVHeader, type Crumb } from "@/app/qisv/_components/header";
import { SurveyEmptyState } from "../../_components/survey-empty-state";
import { SurveyBatchActions } from "../../_components/survey-batch-actions";
import { UserMultiComboBox } from "@/app/qisv/_components/user-dropdown";
import { SurveyPagination } from "../../_components/survey-pagination";
import { DailySurveyTable } from "../../_components/daily-survey-table";
import { TemplateComboBox } from "@/app/qisv/_components/template-dropdown";
import { cn } from "@/lib/utils";

const PAGE_SIZES = [5, 10, 15, 20];

// --- 1. Dedicated Skeleton Component ---
function SurveyListSkeleton() {
  return (
    <div className="w-full rounded-md border bg-white">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="flex h-14 items-center border-b px-4 last:border-0"
        >
          {/* Mimic the Calendar Icon + Date Text */}
          <div className="flex w-full items-center gap-4">
            <Skeleton className="h-4 w-4 rounded-full" />
            <Skeleton className="h-5 w-48 max-w-[50%]" />
          </div>
          {/* Mimic the Chevron */}
          <Skeleton className="h-4 w-4 rounded-full opacity-50" />
        </div>
      ))}
    </div>
  );
}

// ... [SurveyDatePicker and surveyParamsParser remain unchanged] ...

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

const surveyParamsParser = {
  page: parseAsInteger.withDefault(1),
  pageSize: parseAsInteger.withDefault(10),
  poc: parseAsBoolean,
  locked: parseAsBoolean,
  template: parseAsInteger,
  surveyors: parseAsArrayOf(parseAsString).withDefault([]),
  date: parseAsIsoDate,
};

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

// --- 2. Main Content Component ---
function SurveysPageContent() {
  const params = useParams();
  const facilityId = params.facilityId ? Number(params.facilityId) : undefined;

  const currentUser = authClient.useSession();
  const { data: memberRole } = useUserRole();
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const { filters, updateFilters, clearFilters } = useSurveyFilters();

  // Permissions
  const canViewSurveys = canUI(memberRole, "surveys.view");
  const canManageSurveys =
    canUI(memberRole, "surveys.manage") && memberRole !== "surveyor";

  // Optional: Fetch facility name for header context if needed
  const facilityQuery = api.facility.byId.useQuery(
    { id: facilityId! },
    { enabled: !!facilityId },
  );

  const datesQuery = api.survey.listSurveyDates.useQuery(
    {
      page: filters.page,
      pageSize: filters.pageSize,
      pocGenerated: filters.poc ?? undefined,
      isLocked: filters.locked ?? undefined,
      facilityId: facilityId ?? undefined,
      surveyorId: filters.surveyors ?? undefined,
      templateId: filters.template ? [filters.template] : undefined,
    },
    {
      enabled: canViewSurveys && !!currentUser.data,
      refetchOnWindowFocus: true,
      // UX Improvement: Keep old data visible while fetching next page
      placeholderData: (previousData) => previousData,
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
      facilityId ||
      filters.template ||
      filters.surveyors?.length ||
      filters.date
    );
  }, [filters]);

  // Header Breadcrumbs Logic
  const crumbs = [{ label: "Surveys" }] as Crumb[];
  if (facilityId) {
    crumbs.push({
      label: facilityQuery.isLoading ? (
        <Skeleton className="h-4 w-24" />
      ) : (
        (facilityQuery.data?.name ?? `Facility #${facilityId}`)
      ),
    });
  }

  // Show empty state when no data and no filters (and not loading)
  if (
    !datesQuery.isLoading &&
    !datesQuery.data?.data.length &&
    !hasActiveFilters
  ) {
    return (
      <>
        <QISVHeader crumbs={crumbs} />
        <main className="grid gap-2 px-4 pb-10">
          <SurveyEmptyState />
        </main>
      </>
    );
  }

  return (
    <>
      <QISVHeader crumbs={crumbs} />

      <main className="grid gap-4 px-4 pb-10">
        {/* Header Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {selectedSurveyIds.length > 0 && (
              <SurveyBatchActions
                selectedIds={selectedSurveyIds}
                onClearSelection={() => setRowSelection({})}
                canGeneratePoc={canUI(memberRole, "surveys.generatePoc")}
                onSuccess={() => {
                  setRowSelection({});
                  datesQuery.refetch();
                }}
              />
            )}
          </div>

          {canManageSurveys && (
            <Link href="/qisv/surveys/new" className={buttonVariants()}>
              <PlusIcon className="mr-2 h-4 w-4" />
              New Survey
            </Link>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* ... [Existing Filter UI Code remains exactly the same] ... */}
          {/* (To save space, I am not repeating the ButtonGroup/Dropdown blocks here, paste them back in) */}
          {/* PASTE FILTER BLOCKS HERE */}

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

          {/* Status Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="border-dashed">
                <CirclePlusIcon className="mr-2 h-4 w-4" />
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

          {/* Clear All */}
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Clear filters
            </Button>
          )}
        </div>

        {/* Data List */}
        <div
          className={cn(
            "w-full max-w-full overflow-scroll rounded-md border",
            datesQuery.isFetching &&
            !datesQuery.isLoading &&
            "opacity-60 transition-opacity",
          )}
        >
          {datesQuery.isLoading ? (
            <SurveyListSkeleton />
          ) : datesQuery.data?.data.length === 0 ? (
            <div className="text-muted-foreground p-8 text-center">
              No dates found matching filters.
            </div>
          ) : (
            <Accordion type="multiple" className="w-full">
              {datesQuery.data?.data.map((dateString: string) => {
                const dateObj = new Date(dateString);

                return (
                  <AccordionItem
                    key={dateString}
                    value={dateString}
                    className="border-b last:border-0"
                  >
                    <AccordionTrigger className="hover:bg-muted/50 px-4 transition-colors hover:no-underline">
                      <div className="flex items-center gap-4">
                        <CalendarIcon className="text-muted-foreground h-4 w-4" />
                        <span className="font-medium">
                          {format(dateObj, "EEEE, MMMM do, yyyy")}
                        </span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="p-0">
                      <DailySurveyTable
                        rowSelection={rowSelection}
                        onRowSelection={setRowSelection}
                        date={dateString}
                        filters={{
                          poc: filters.poc,
                          locked: filters.locked,
                          facility: facilityId, // Ensure facilityId is passed if in URL
                        }}
                      />
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          )}
        </div>

        {/* Pagination */}
        <SurveyPagination
          currentPage={filters.page}
          pageSize={filters.pageSize}
          pageCount={datesQuery.data?.meta.pageCount ?? 0}
          totalResults={datesQuery.data?.meta.totalCount ?? 0}
          onPageChange={(page) => updateFilters({ page })}
          onPageSizeChange={(pageSize) => updateFilters({ pageSize, page: 1 })}
          pageSizes={PAGE_SIZES}
          isLoading={datesQuery.isLoading}
        />
      </main>
    </>
  );
}

// --- 3. Default Export Wrapped in Suspense ---
export default function SurveysPage() {
  return (
    <Suspense
      fallback={
        <>
          <QISVHeader crumbs={[{ label: "Surveys" }]} />
          <main className="container mx-auto space-y-4 p-4">
            {/* Simple page skeleton while nuqs initializes */}
            <div className="flex justify-between">
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-10 w-32" />
            </div>
            <Skeleton className="h-10 w-full" />
            <SurveyListSkeleton />
          </main>
        </>
      }
    >
      <SurveysPageContent />
    </Suspense>
  );
}
