"use client";

import { api } from "@/trpc/react";
import { QISVHeader } from "../_components/header";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import {
  PlusIcon,
  Loader2Icon,
  ChevronsLeftIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsRightIcon,
  XIcon,
  CirclePlusIcon,
} from "lucide-react";
import { authClient } from "@/components/providers/auth-client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { canUI, type AppRole } from "@/lib/ui-permissions";
import { ButtonGroup } from "@/components/ui/button-group";
import { SurveyDataTable } from "./_components/survey-data-table";
import { surveyColumns } from "./_components/survey-columns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import type { VisibilityState } from "@tanstack/react-table";
import { FacilityComboBox } from "../_components/facility-dropdown";
import { Toggle } from "@/components/ui/toggle";
import { Combobox } from "@/components/ui/combobox";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { TemplateComboBox } from "../_components/template-dropdown";
import { UserMultiComboBox } from "../_components/user-dropdown";

const PAGE_SIZES = [10, 25, 50];

type StatusVal = "met" | "unmet" | "not_applicable";

function normalizeRole(role: unknown): AppRole | null {
  const r = String(role ?? "")
    .toLowerCase()
    .trim();
  if (r === "owner") return "admin";
  if (r === "admin") return "admin";
  if (r === "member") return "viewer";
  if (
    r === "viewer" ||
    r === "lead_surveyor" ||
    r === "surveyor" ||
    r === "facility_coordinator" ||
    r === "facility_viewer" ||
    r === "admin"
  ) {
    return r as AppRole;
  }
  return null;
}

export default function SurveysPage() {
  const router = useRouter();
  const pathname = usePathname();
  const activeOrg = authClient.useActiveOrganization();
  const searchParams = useSearchParams();

  const { data: memberRole, isLoading: isRoleLoading } = useQuery({
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

  const canViewSurveys = canUI(memberRole, "surveys.view");
  const canManageSurveys =
    canUI(memberRole, "surveys.manage") && memberRole != "surveyor";

  // const assignedFacility = api.user.getForOrg.useQuery({});
  const currentUser = authClient.useSession();

  const surveysPage = Number(searchParams.get("page") ?? 1);
  const surveysPageSize = Number(searchParams.get("pageSize") ?? 10);
  const surveyPoc =
    searchParams.get("poc") === "true"
      ? true
      : searchParams.get("poc") === "false"
        ? false
        : undefined;
  const surveyLocked =
    searchParams.get("locked") === "true"
      ? true
      : searchParams.get("locked") === "false"
        ? false
        : undefined;
  const surveysFacilityId = searchParams.get("facility")
    ? Number(searchParams.get("facility"))
    : undefined;
  const surveysTemplateId = searchParams.get("template")
    ? Number(searchParams.get("template"))
    : undefined;

  const surveySurveyors = searchParams.get("surveyors")
    ? searchParams.get("surveyors")?.split(",")
    : undefined;
  const surveyorIdFilter =
    memberRole === "surveyor"
      ? currentUser.data?.user?.id
        ? [currentUser.data.user.id]
        : undefined
      : surveySurveyors;

  // Get all surveys
  const surveysQuery = api.survey.list.useQuery(
    {
      page: surveysPage,
      pageSize: surveysPageSize,
      pocGenerated: surveyPoc,
      isLocked: surveyLocked,
      surveyorId: surveyorIdFilter,
      facilityId: surveysFacilityId ? [surveysFacilityId] : undefined,
      templateId: surveysTemplateId ? [surveysTemplateId] : undefined,
    },
    {
      enabled: canViewSurveys && !!currentUser.data,
      refetchOnWindowFocus: true,
    },
  );

  const updateQuery = (
    updates: Record<string, string | number | undefined>,
  ) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value === undefined || value === "" || value === 0) {
        params.delete(key);
      } else {
        params.set(key, String(value));
      }
    });

    // Prevent pushing duplicate state if nothing changed
    if (params.toString() !== searchParams.toString()) {
      router.push(`${pathname}?${params.toString()}`);
    }
  };

  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});

  return (
    <>
      <QISVHeader crumbs={[{ label: "Surveys" }]} />

      <main className={"grid gap-2 px-4 pb-10"}>
        <ButtonGroup>
          <ButtonGroup>
            <Button
              className={cn("flex gap-1")}
              variant={canViewSurveys ? "default" : "destructive"}
            >
              Can View Surveys
            </Button>
            <Button
              className={cn("flex gap-1")}
              variant={canViewSurveys ? "default" : "destructive"}
            >
              {memberRole ?? <Loader2Icon className="animate-spin" />}
            </Button>
          </ButtonGroup>
          <ButtonGroup>
            <Link href="/qisv/surveys/new" className={buttonVariants()}>
              <PlusIcon />
              New Survey{" "}
            </Link>{" "}
          </ButtonGroup>
        </ButtonGroup>

        <div className="grid max-w-full gap-4">
          <div className="flex items-center gap-2">
            <ButtonGroup>
              <UserMultiComboBox
                align={"start"}
                selectedItems={surveySurveyors ?? []}
                onChange={(users) =>
                  updateQuery({
                    surveyors: users.length > 0 ? users.join(",") : undefined,
                  })
                }
              />
              {surveysTemplateId !== undefined && (
                <Button
                  variant={"outline"}
                  size={"icon"}
                  onClick={() => updateQuery({ template: undefined })}
                >
                  <XIcon />
                </Button>
              )}
            </ButtonGroup>

            <ButtonGroup>
              <TemplateComboBox
                align="start"
                selectedItem={surveysTemplateId}
                onSelect={(template) => updateQuery({ template: template })}
              />
              {surveysTemplateId !== undefined && (
                <Button
                  variant={"outline"}
                  size={"icon"}
                  onClick={() => updateQuery({ template: undefined })}
                >
                  <XIcon />
                </Button>
              )}
            </ButtonGroup>

            <ButtonGroup>
              <FacilityComboBox
                selectedItem={surveysFacilityId}
                onSelect={(facility) => updateQuery({ facility: facility })}
              />
              {surveysFacilityId !== undefined && (
                <Button
                  variant={"outline"}
                  size={"icon"}
                  onClick={() => updateQuery({ facility: undefined })}
                >
                  <XIcon />
                </Button>
              )}
            </ButtonGroup>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="border-dashed">
                  <CirclePlusIcon />
                  Status
                  {(surveyPoc || surveyLocked) && (
                    <>
                      <Separator orientation="vertical" className="mx-2 h-4" />

                      {Object.entries({
                        completed: surveyPoc,
                        locked: surveyLocked,
                      }).map(
                        ([key, value]) =>
                          value && (
                            <Badge
                              key={key}
                              variant="secondary"
                              className="rounded-sm px-1 font-normal"
                            >
                              {key}
                            </Badge>
                          ),
                      )}
                    </>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuCheckboxItem
                  checked={surveyPoc}
                  onCheckedChange={(checked) =>
                    updateQuery({ poc: checked ? "true" : undefined })
                  }
                >
                  Completed
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={surveyLocked}
                  onCheckedChange={(checked) =>
                    updateQuery({ locked: checked ? "true" : undefined })
                  }
                >
                  Locked
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <SurveyDataTable
            columns={surveyColumns}
            data={surveysQuery.data?.data ?? []}
            isLoading={surveysQuery.isLoading}
            pageSize={surveysPageSize}
          />
        </div>

        <div className="flex items-center justify-between px-4">
          <div className="flex w-full items-center gap-8 lg:w-fit">
            <div className="hidden items-center gap-2 lg:flex">
              <Label htmlFor="rows-per-page" className="text-sm font-medium">
                Rows per page
              </Label>
              <Select
                value={surveysPageSize.toString()}
                onValueChange={(value) => {
                  updateQuery({ pageSize: value });
                }}
              >
                <SelectTrigger size="sm" className="w-20" id="rows-per-page">
                  <SelectValue placeholder={surveysPageSize.toString()} />
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
          </div>
          <div className="flex w-full items-center gap-8 lg:w-fit">
            <div className="flex w-fit items-center justify-center text-sm font-medium">
              {surveysQuery.data?.meta.pageCount ? (
                <>
                  Page {surveysPage} of {surveysQuery.data?.meta.pageCount}
                </>
              ) : (
                <Skeleton className="h-5 w-28" />
              )}
            </div>
            <div className="ml-auto flex items-center gap-2 lg:ml-0">
              <Button
                variant="outline"
                className="hidden h-8 w-8 p-0 lg:flex"
                onClick={() => updateQuery({ page: 1 })}
                disabled={surveysPage <= 1}
              >
                <span className="sr-only">Go to first page</span>
                <ChevronsLeftIcon />
              </Button>
              <Button
                variant="outline"
                className="size-8"
                size="icon"
                onClick={() => updateQuery({ page: surveysPage - 1 })}
                disabled={surveysPage <= 1}
              >
                <span className="sr-only">Go to previous page</span>
                <ChevronLeftIcon />
              </Button>
              <Button
                variant="outline"
                className="size-8"
                size="icon"
                onClick={() => updateQuery({ page: surveysPage + 1 })}
                disabled={
                  surveysPage >= (surveysQuery.data?.meta.pageCount ?? 0)
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
                  updateQuery({ page: surveysQuery.data?.meta.pageCount ?? 0 })
                }
                disabled={
                  surveysPage >= (surveysQuery.data?.meta.pageCount ?? 0)
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
