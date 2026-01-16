"use client";

import { api } from "@/trpc/react";
import { QISVHeader } from "../_components/header";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { PlusIcon, XIcon, CirclePlusIcon } from "lucide-react";
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

const PAGE_SIZES = [10, 25, 50];
const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 10;

// Helper Functions
function normalizeRole(role: unknown): AppRole | null {
  const r = String(role ?? "")
    .toLowerCase()
    .trim();
  if (r === "owner") return "admin";
  if (r === "admin") return "admin";
  if (r === "member") return "viewer";
  if (
    [
      "viewer",
      "lead_surveyor",
      "surveyor",
      "facility_coordinator",
      "facility_viewer",
    ].includes(r)
  ) {
    return r as AppRole;
  }
  return null;
}

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
function useUserRole() {
  const activeOrg = authClient.useActiveOrganization();

  return useQuery({
    queryKey: ["active-member-role", activeOrg.data?.id],
    queryFn: async () => {
      const res = await authClient.organization.getActiveMemberRole();
      const rawRole = (res as any)?.data?.role;
      return normalizeRole(rawRole);
    },
    enabled: !!activeOrg.data,
    staleTime: Infinity,
    gcTime: 1000 * 60 * 60,
    refetchOnWindowFocus: false,
    retry: false,
  });
}

export function useSurveyFilters() {
  const [filters, setFilters] = useQueryStates(surveyParamsParser, {
    history: "replace",
    shallow: false,
  });

  const clearFilters = () => setFilters(undefined);

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
      surveyDate: filters.date
        ? filters.date.toISOString().split("T")[0]
        : undefined,
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
                  onClick={() => updateFilters({ date: undefined })}
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
                    onClick={() => updateFilters({ surveyors: undefined })}
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

        {/* Table */}
        <SurveyDataTable
          rowSelection={rowSelection}
          onRowSelection={setRowSelection}
          columns={surveyColumns}
          data={surveysQuery.data?.data ?? []}
          isLoading={surveysQuery.isLoading}
          pageSize={filters.pageSize}
          pageCount={surveysQuery.data?.meta.pageCount ?? 0}
        />

        {/* Pagination */}
        <SurveyPagination
          currentPage={filters.page}
          pageSize={filters.pageSize}
          pageCount={surveysQuery.data?.meta.pageCount ?? 0}
          totalResults={surveysQuery.data?.meta.totalCount ?? 0}
          onPageChange={(page) => updateFilters({ page })}
          onPageSizeChange={(pageSize) => updateFilters({ pageSize, page: 1 })}
          pageSizes={PAGE_SIZES}
          isLoading={surveysQuery.isLoading}
        />
      </main>
    </>
  );
}
