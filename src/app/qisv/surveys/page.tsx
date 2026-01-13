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

type SurveyFilters = {
  page: number;
  pageSize: number;
  poc?: boolean;
  locked?: boolean;
  facilityId?: number;
  templateId?: number;
  surveyors?: string[];
  date?: Date;
};

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

function parseFiltersFromURL(searchParams: URLSearchParams): SurveyFilters {
  const dateParam = searchParams.get("date");

  return {
    page: Number(searchParams.get("page") ?? DEFAULT_PAGE),
    pageSize: Number(searchParams.get("pageSize") ?? DEFAULT_PAGE_SIZE),
    poc:
      searchParams.get("poc") === "true"
        ? true
        : searchParams.get("poc") === "false"
          ? false
          : undefined,
    locked:
      searchParams.get("locked") === "true"
        ? true
        : searchParams.get("locked") === "false"
          ? false
          : undefined,
    facilityId: searchParams.get("facility")
      ? Number(searchParams.get("facility"))
      : undefined,
    templateId: searchParams.get("template")
      ? Number(searchParams.get("template"))
      : undefined,
    surveyors: searchParams.get("surveyors")?.split(",").filter(Boolean),
    date: dateParam ? new Date(dateParam) : undefined,
  };
}

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

function useSurveyFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const filters = useMemo(
    () => parseFiltersFromURL(searchParams),
    [searchParams],
  );

  const updateFilters = useCallback(
    (updates: Partial<SurveyFilters>) => {
      const params = new URLSearchParams(searchParams.toString());

      Object.entries(updates).forEach(([key, value]) => {
        if (value === undefined || value === null) {
          params.delete(key);
        } else if (key === "surveyors" && Array.isArray(value)) {
          if (value.length === 0) {
            params.delete(key);
          } else {
            params.set(key, value.join(","));
          }
        } else if (key === "date" && value instanceof Date) {
          const date = value.toISOString().split("T")[0];
          if (date) {
            params.set(key, date);
          }
        } else {
          params.set(key, String(value));
        }
      });

      if (params.toString() !== searchParams.toString()) {
        router.push(`${pathname}?${params.toString()}`);
      }
    },
    [pathname, router, searchParams],
  );
  const clearFilters = useCallback(() => {
    router.push(pathname);
  }, [pathname, router]);

  return { filters, updateFilters, clearFilters };
}

// Main Component
export default function SurveysPage() {
  const currentUser = authClient.useSession();
  const { data: memberRole, isLoading: isRoleLoading } = useUserRole();
  const { filters, updateFilters, clearFilters } = useSurveyFilters();
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

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
      pocGenerated: filters.poc,
      surveyDate: filters.date
        ? filters.date.toISOString().split("T")[0]
        : undefined,
      isLocked: filters.locked,
      surveyorId: surveyorIdFilter,
      facilityId: filters.facilityId ? [filters.facilityId] : undefined,
      templateId: filters.templateId ? [filters.templateId] : undefined,
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
      filters.facilityId ||
      filters.templateId ||
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
                date={filters.date}
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
              {filters.templateId && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => updateFilters({ templateId: undefined })}
                >
                  <XIcon />
                </Button>
              )}
              <TemplateComboBox
                align="start"
                selectedItem={filters.templateId}
                onSelect={(template) => updateFilters({ templateId: template })}
              />
            </ButtonGroup>

            {/* Facility Filter */}
            <ButtonGroup>
              {filters.facilityId && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => updateFilters({ facilityId: undefined })}
                >
                  <XIcon />
                </Button>
              )}
              <FacilityComboBox
                selectedItem={filters.facilityId}
                onSelect={(facility) => updateFilters({ facilityId: facility })}
              />
            </ButtonGroup>

            {/* Status Filter */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="border-dashed">
                  <CirclePlusIcon />
                  Status
                  {(filters.poc !== undefined ||
                    filters.locked !== undefined) && (
                      <>
                        <Separator orientation="vertical" className="mx-2 h-4" />
                        {filters.poc !== undefined && (
                          <Badge
                            variant="secondary"
                            className="rounded-sm px-1 font-normal"
                          >
                            POC Generated
                          </Badge>
                        )}
                        {filters.locked !== undefined && (
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
                    updateFilters({ poc: checked ? true : undefined })
                  }
                >
                  POC Generated
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={filters.locked === true}
                  onCheckedChange={(checked) =>
                    updateFilters({ locked: checked ? true : undefined })
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
