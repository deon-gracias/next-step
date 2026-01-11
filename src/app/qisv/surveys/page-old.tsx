"use client";

import { api } from "@/trpc/react";
import { QISVHeader } from "../_components/header";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import {
  ExternalLinkIcon,
  PlusIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CalendarIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  XIcon,
  TrashIcon,
} from "lucide-react";
import { authClient } from "@/components/providers/auth-client";
import { Badge } from "@/components/ui/badge";
import { useSearchParams } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { FacilityHoverCard } from "../_components/facility-card";
import { TemplateHoverCard } from "../_components/template-card";
import React, { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Combobox } from "@/components/ui/combobox";
import { canUI, type AppRole } from "@/lib/ui-permissions";

const PAGE_SIZES = [10, 50, 100];

type GroupedSurvey = {
  facilityId: number;
  facilityName: string;
  facility: any;
  dates: Map<
    string,
    {
      date: string;
      surveys: any[];
      totalTemplates: number;
      completedSurveys: number;
      pocCount: number;
    }
  >;
  totalTemplates: number;
  completedSurveys: number;
  pocCount: number;
};

type DateSortOrder = "asc" | "desc" | null;
type StatusVal = "met" | "unmet" | "not_applicable";

const isFinalStatus = (v: string | null | undefined): v is StatusVal =>
  v === "met" || v === "unmet" || v === "not_applicable";

// ✅ Add normalizeRole function
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
  const activeOrg = authClient.useActiveOrganization();
  const searchParams = useSearchParams();

  const { data: appRole, isLoading: roleLoading } = useQuery({
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

  const canViewSurveys = canUI(appRole, "surveys.view");
  const canCreateSurveys =
    canUI(appRole, "surveys.manage") && appRole != "surveyor";

  const assignedFacility = api.user.getAssignedFacilities.useQuery({});

  const currentUser = authClient.useSession();
  const surveyorIdFilter =
    appRole === "surveyor" ? currentUser.data?.user.id : undefined;

  const page = Number(searchParams.get("page") ?? 1);
  const pageSize = Number(searchParams.get("pageSize") ?? 100);

  const [closedTemplateFilter, setClosedTemplateFilter] =
    React.useState<string>("all");
  const [pendingTemplateFilter, setPendingTemplateFilter] =
    React.useState<string>("all");
  const [closedStatusFilter, setClosedStatusFilter] =
    React.useState<string>("all");
  const [pendingStatusFilter, setPendingStatusFilter] =
    React.useState<string>("all");

  // Get all surveys
  const surveys = api.survey.list.useQuery(
    {
      facilityId: Array.isArray(assignedFacility.data)
        ? undefined
        : assignedFacility.data?.id,
      surveyorId: surveyorIdFilter,
      page,
      pageSize,
    },
    { enabled: !!assignedFacility.data && canViewSurveys },
  );

  // Access utils for API calls
  const utils = api.useUtils();

  // Generate POC functionality
  const markPocGenerated = api.survey.markPocGenerated.useMutation({
    onSuccess: () => {
      utils.survey.list.invalidate();
    },
    onError: (error) => {
      toast.error(`Failed to generate POC: ${error.message}`);
    },
  });

  const handleGeneratePocForDate = async (surveys: Array<{ id: number }>) => {
    try {
      await Promise.all(
        surveys.map((survey) =>
          markPocGenerated.mutateAsync({ surveyId: survey.id }),
        ),
      );
      toast.success("POC generated successfully for all templates");
    } catch (error) {
      toast.error("Failed to generate POC for some templates");
    }
  };

  // Date filtering states
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(
    undefined,
  );
  const [dateSortOrder, setDateSortOrder] = React.useState<DateSortOrder>(null);
  const [datePopoverOpen, setDatePopoverOpen] = React.useState(false);

  // Filters
  const [closedFacilityFilter, setClosedFacilityFilter] =
    React.useState<string>("all");
  const [pendingFacilityFilter, setPendingFacilityFilter] =
    React.useState<string>("all");

  // Expanded states for facility, date, and template groups
  const [expandedClosedFacilities, setExpandedClosedFacilities] =
    React.useState<Set<number>>(new Set());
  const [expandedPendingFacilities, setExpandedPendingFacilities] =
    React.useState<Set<number>>(new Set());
  const [expandedClosedDates, setExpandedClosedDates] = React.useState<
    Set<string>
  >(new Set());
  const [expandedPendingDates, setExpandedPendingDates] = React.useState<
    Set<string>
  >(new Set());

  // State to store survey scores
  const [surveyScores, setSurveyScores] = React.useState<
    Map<number, { score: number; totalPossible: number }>
  >(new Map());

  // State to store POC existence for each survey from survey_poc table (for display only)
  const [surveyPocExists, setSurveyPocExists] = React.useState<
    Map<number, boolean>
  >(new Map());

  // DELETE FUNCTIONALITY
  const [surveyToDelete, setSurveyToDelete] = useState<{
    id: number;
    name: string;
  } | null>(null);

  // ... [REST OF YOUR USEEFFECTS - KEEP THEM EXACTLY AS THEY WERE]

  // [I'll include them all below, keeping your exact logic]

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!surveys.data || surveys.data.length === 0) return;

      try {
        const scoresMap = new Map<
          number,
          { score: number; totalPossible: number }
        >();

        await Promise.all(
          surveys.data.map(async (survey) => {
            try {
              const residents = await utils.survey.listResidents.fetch({
                surveyId: survey.id,
              });
              const cases = await utils.survey.listCases.fetch({
                surveyId: survey.id,
              });
              const questions = await utils.question.list.fetch({
                templateId: survey.templateId,
              });

              if (!questions || questions.length === 0) {
                scoresMap.set(survey.id, { score: 0, totalPossible: 0 });
                return;
              }

              const allResponses: Array<{
                residentId: number | null;
                surveyCaseId: number | null;
                questionId: number;
                status: string | null;
                findings: string | null;
              }> = [];

              if (residents && residents.length > 0) {
                await Promise.all(
                  residents.map(async (r) => {
                    const rows = await utils.survey.listResponses.fetch({
                      surveyId: survey.id,
                      residentId: r.residentId,
                    });
                    for (const rr of rows ?? []) {
                      allResponses.push({
                        residentId: r.residentId,
                        surveyCaseId: null,
                        questionId: rr.questionId,
                        status: rr.requirementsMetOrUnmet ?? null,
                        findings: rr.findings ?? null,
                      });
                    }
                  }),
                );
              }

              if (cases && cases.length > 0) {
                await Promise.all(
                  cases.map(async (c) => {
                    const rows = await utils.survey.listResponses.fetch({
                      surveyId: survey.id,
                      surveyCaseId: c.id,
                    });
                    for (const rr of rows ?? []) {
                      allResponses.push({
                        residentId: null,
                        surveyCaseId: c.id,
                        questionId: rr.questionId,
                        status: rr.requirementsMetOrUnmet ?? null,
                        findings: rr.findings ?? null,
                      });
                    }
                  }),
                );
              }

              if (
                (!residents || residents.length === 0) &&
                (!cases || cases.length === 0)
              ) {
                const rows = await utils.survey.listResponses.fetch({
                  surveyId: survey.id,
                  residentId: null,
                  surveyCaseId: null,
                });
                for (const rr of rows ?? []) {
                  allResponses.push({
                    residentId: null,
                    surveyCaseId: null,
                    questionId: rr.questionId,
                    status: rr.requirementsMetOrUnmet ?? null,
                    findings: rr.findings ?? null,
                  });
                }
              }

              const byEntity = new Map<
                string,
                Map<number, { status: string | null; findings: string | null }>
              >();
              for (const r of allResponses) {
                const entityKey = r.residentId
                  ? `resident-${r.residentId}`
                  : r.surveyCaseId
                    ? `case-${r.surveyCaseId}`
                    : "general";
                const inner = byEntity.get(entityKey) ?? new Map();
                inner.set(r.questionId, {
                  status: r.status,
                  findings: r.findings,
                });
                byEntity.set(entityKey, inner);
              }

              let awarded = 0;
              for (const q of questions) {
                let anyUnmetOrUnanswered = false;
                let anyMet = false;
                let allNA = true;

                if (
                  (!residents || residents.length === 0) &&
                  (!cases || cases.length === 0)
                ) {
                  const cell = byEntity.get("general")?.get(q.id);
                  if (!cell?.status) {
                    anyUnmetOrUnanswered = true;
                    allNA = false;
                  } else if (cell.status === "unmet") {
                    anyUnmetOrUnanswered = true;
                    allNA = false;
                  } else if (cell.status === "met") {
                    anyMet = true;
                    allNA = false;
                  }
                } else {
                  if (residents && residents.length > 0) {
                    for (const r of residents) {
                      const cell = byEntity
                        .get(`resident-${r.residentId}`)
                        ?.get(q.id);
                      if (!cell?.status) {
                        anyUnmetOrUnanswered = true;
                        allNA = false;
                        break;
                      }
                      if (cell.status === "unmet") {
                        anyUnmetOrUnanswered = true;
                        allNA = false;
                        break;
                      }
                      if (cell.status === "met") {
                        anyMet = true;
                        allNA = false;
                      }
                    }
                  }

                  if (!anyUnmetOrUnanswered && cases && cases.length > 0) {
                    for (const c of cases) {
                      const cell = byEntity.get(`case-${c.id}`)?.get(q.id);
                      if (!cell?.status) {
                        anyUnmetOrUnanswered = true;
                        allNA = false;
                        break;
                      }
                      if (cell.status === "unmet") {
                        anyUnmetOrUnanswered = true;
                        allNA = false;
                        break;
                      }
                      if (cell.status === "met") {
                        anyMet = true;
                        allNA = false;
                      }
                    }
                  }
                }

                if (!anyUnmetOrUnanswered && (anyMet || allNA)) {
                  awarded += q.points ?? 0;
                }
              }

              const max = questions.reduce((s, q) => s + (q.points ?? 0), 0);

              scoresMap.set(survey.id, {
                score: awarded,
                totalPossible: max,
              });
            } catch (error) {
              console.error(
                `Failed to calculate score for survey ${survey.id}:`,
                error,
              );
              scoresMap.set(survey.id, { score: 0, totalPossible: 0 });
            }
          }),
        );

        if (!cancelled && surveys.data) {
          surveys.data.forEach(async (survey) => {
            const residents = await utils.survey.listResidents.fetch({
              surveyId: survey.id,
            });
            const cases = await utils.survey.listCases.fetch({
              surveyId: survey.id,
            });
            const questions = await utils.question.list.fetch({
              templateId: survey.templateId,
            });

            if (!questions || questions.length === 0) {
              (survey as any)._isComplete = false;
              return;
            }

            const allResponses: Array<{
              residentId: number | null;
              surveyCaseId: number | null;
              questionId: number;
              status: string | null;
            }> = [];

            if (residents && residents.length > 0) {
              for (const r of residents) {
                const rows = await utils.survey.listResponses.fetch({
                  surveyId: survey.id,
                  residentId: r.residentId,
                });
                for (const rr of rows ?? []) {
                  allResponses.push({
                    residentId: r.residentId,
                    surveyCaseId: null,
                    questionId: rr.questionId,
                    status: rr.requirementsMetOrUnmet ?? null,
                  });
                }
              }
            }

            if (cases && cases.length > 0) {
              for (const c of cases) {
                const rows = await utils.survey.listResponses.fetch({
                  surveyId: survey.id,
                  surveyCaseId: c.id,
                });
                for (const rr of rows ?? []) {
                  allResponses.push({
                    residentId: null,
                    surveyCaseId: c.id,
                    questionId: rr.questionId,
                    status: rr.requirementsMetOrUnmet ?? null,
                  });
                }
              }
            }

            if (
              (!residents || residents.length === 0) &&
              (!cases || cases.length === 0)
            ) {
              const rows = await utils.survey.listResponses.fetch({
                surveyId: survey.id,
                residentId: null,
                surveyCaseId: null,
              });
              for (const rr of rows ?? []) {
                allResponses.push({
                  residentId: null,
                  surveyCaseId: null,
                  questionId: rr.questionId,
                  status: rr.requirementsMetOrUnmet ?? null,
                });
              }
            }

            const byEntity = new Map<
              string,
              Map<number, { status: string | null }>
            >();
            for (const r of allResponses) {
              const entityKey = r.residentId
                ? `resident-${r.residentId}`
                : r.surveyCaseId
                  ? `case-${r.surveyCaseId}`
                  : "general";
              const inner = byEntity.get(entityKey) ?? new Map();
              inner.set(r.questionId, { status: r.status });
              byEntity.set(entityKey, inner);
            }

            const isSurveyComplete = questions.every((q: any) => {
              if (
                (!residents || residents.length === 0) &&
                (!cases || cases.length === 0)
              ) {
                const cell = byEntity.get("general")?.get(q.id);
                return cell?.status && isFinalStatus(cell.status);
              }

              if (residents && residents.length > 0) {
                return residents.every((r: any) => {
                  const cell = byEntity
                    .get(`resident-${r.residentId}`)
                    ?.get(q.id);
                  return cell?.status && isFinalStatus(cell.status);
                });
              }

              if (cases && cases.length > 0) {
                return cases.every((c: any) => {
                  const cell = byEntity.get(`case-${c.id}`)?.get(q.id);
                  return cell?.status && isFinalStatus(cell.status);
                });
              }

              return false;
            });

            (survey as any)._isComplete = isSurveyComplete;
          });
        }

        if (!cancelled) {
          setSurveyScores(scoresMap);
        }
      } catch (error) {
        console.error("Failed to fetch survey scores:", error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [surveys.data, utils]);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!surveys.data || surveys.data.length === 0) return;

      try {
        const pocExistsMap = new Map<number, boolean>();

        await Promise.all(
          surveys.data.map(async (survey) => {
            try {
              const residents = await utils.survey.listResidents.fetch({
                surveyId: survey.id,
              });
              const cases = await utils.survey.listCases.fetch({
                surveyId: survey.id,
              });

              let hasPOC = false;

              if (
                (!residents || residents.length === 0) &&
                (!cases || cases.length === 0)
              ) {
                const pocRows = await utils.poc.list.fetch({
                  surveyId: survey.id,
                });
                for (const pocRow of pocRows ?? []) {
                  if (
                    pocRow.pocText &&
                    pocRow.pocText.trim() &&
                    pocRow.templateId === survey.templateId
                  ) {
                    hasPOC = true;
                    break;
                  }
                }
              } else {
                if (residents && residents.length > 0) {
                  const pocResults = await Promise.all(
                    residents.map((r) =>
                      utils.poc.list.fetch({
                        surveyId: survey.id,
                        residentId: r.residentId,
                      }),
                    ),
                  );

                  outer: for (const pocRows of pocResults) {
                    for (const pocRow of pocRows ?? []) {
                      if (
                        pocRow.pocText &&
                        pocRow.pocText.trim() &&
                        pocRow.templateId === survey.templateId
                      ) {
                        hasPOC = true;
                        break outer;
                      }
                    }
                  }
                }

                if (!hasPOC && cases && cases.length > 0) {
                  const pocResults = await Promise.all(
                    cases.map((c) =>
                      utils.poc.list.fetch({
                        surveyId: survey.id,
                        surveyCaseId: c.id,
                      }),
                    ),
                  );

                  outer: for (const pocRows of pocResults) {
                    for (const pocRow of pocRows ?? []) {
                      if (
                        pocRow.pocText &&
                        pocRow.pocText.trim() &&
                        pocRow.templateId === survey.templateId
                      ) {
                        hasPOC = true;
                        break outer;
                      }
                    }
                  }
                }
              }

              pocExistsMap.set(survey.id, hasPOC);
            } catch (error) {
              console.error(
                `Failed to check POC for survey ${survey.id}:`,
                error,
              );
              pocExistsMap.set(survey.id, false);
            }
          }),
        );

        if (!cancelled) {
          setSurveyPocExists(pocExistsMap);
        }
      } catch (error) {
        console.error("Failed to fetch POC existence:", error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [surveys.data, utils]);

  const deleteSurvey = api.survey.delete.useMutation({
    onSuccess: () => {
      toast.success("Survey deleted successfully");
      utils.survey.list.invalidate();
      setSurveyToDelete(null);
    },
    onError: (error) => {
      toast.error(`Failed to delete survey: ${error.message}`);
      setSurveyToDelete(null);
    },
  });

  const doesDateMatch = (
    surveyDate: string | Date | null | undefined,
    selectedDate: Date,
  ): boolean => {
    if (!surveyDate || !selectedDate) return false;

    try {
      let surveyDateObj: Date;

      if (typeof surveyDate === "string") {
        surveyDateObj = new Date(surveyDate);
      } else {
        surveyDateObj = surveyDate;
      }

      if (isNaN(surveyDateObj.getTime()) || isNaN(selectedDate.getTime())) {
        return false;
      }

      return (
        surveyDateObj.getFullYear() === selectedDate.getFullYear() &&
        surveyDateObj.getMonth() === selectedDate.getMonth() &&
        surveyDateObj.getDate() === selectedDate.getDate()
      );
    } catch (error) {
      console.warn("Date comparison error:", error);
      return false;
    }
  };

  const filterAndSortSurveys = React.useCallback(
    (surveyList: any[]) => {
      let filtered = [...surveyList];

      if (selectedDate) {
        filtered = filtered.filter((survey) => {
          return doesDateMatch(survey.surveyDate, selectedDate);
        });
      }

      if (dateSortOrder) {
        filtered.sort((a, b) => {
          const dateA = new Date(a.surveyDate || 0);
          const dateB = new Date(b.surveyDate || 0);

          if (isNaN(dateA.getTime()) && isNaN(dateB.getTime())) return 0;
          if (isNaN(dateA.getTime())) return 1;
          if (isNaN(dateB.getTime())) return -1;

          return dateSortOrder === "asc"
            ? dateA.getTime() - dateB.getTime()
            : dateB.getTime() - dateA.getTime();
        });
      }

      return filtered;
    },
    [selectedDate, dateSortOrder],
  );

  const getSurveyCategory = (survey: any) => {
    return survey.pocGenerated ? "completed" : "pending";
  };

  const groupedSurveys = React.useMemo(() => {
    if (!surveys.data) return { closed: [], pending: [] };

    const filteredSurveys = filterAndSortSurveys(surveys.data);

    const completedSurveys: any[] = [];
    const pendingSurveys: any[] = [];

    filteredSurveys.forEach((survey) => {
      const category = getSurveyCategory(survey);

      if (category === "completed") {
        completedSurveys.push(survey);
      } else {
        pendingSurveys.push(survey);
      }
    });

    const groupByFacilityAndDate = (surveyList: any[]) => {
      const facilityMap = new Map<number, GroupedSurvey>();

      surveyList.forEach((survey) => {
        const facilityId = survey.facilityId;
        const facilityName = survey.facility?.name || `Facility ${facilityId}`;
        const surveyDate = survey.surveyDate
          ? new Date(survey.surveyDate)
          : null;
        const dateKey =
          surveyDate && !isNaN(surveyDate.getTime())
            ? format(surveyDate, "yyyy-MM-dd")
            : "No date";

        if (!facilityMap.has(facilityId)) {
          facilityMap.set(facilityId, {
            facilityId,
            facilityName,
            facility: survey.facility,
            dates: new Map<
              string,
              {
                date: string;
                surveys: any[];
                totalTemplates: number;
                completedSurveys: number;
                pocCount: number;
              }
            >(),
            totalTemplates: 0,
            completedSurveys: 0,
            pocCount: 0,
          });
        }

        const facilityGroup = facilityMap.get(facilityId)!;

        if (!facilityGroup.dates.has(dateKey)) {
          facilityGroup.dates.set(dateKey, {
            date: dateKey,
            surveys: [],
            totalTemplates: 0,
            completedSurveys: 0,
            pocCount: 0,
          });
        }

        const dateGroup = facilityGroup.dates.get(dateKey)!;

        dateGroup.surveys.push(survey);
        dateGroup.totalTemplates++;
        facilityGroup.totalTemplates++;
      });

      return Array.from(facilityMap.values());
    };

    return {
      closed: groupByFacilityAndDate(completedSurveys),
      pending: groupByFacilityAndDate(pendingSurveys),
    };
  }, [surveys.data, filterAndSortSurveys, surveyScores, surveyPocExists]);

  const toggleFacilityExpanded = (
    facilityId: number,
    type: "closed" | "pending",
  ) => {
    if (type === "closed") {
      const newExpanded = new Set(expandedClosedFacilities);
      if (newExpanded.has(facilityId)) {
        newExpanded.delete(facilityId);
      } else {
        newExpanded.add(facilityId);
      }
      setExpandedClosedFacilities(newExpanded);
    } else {
      const newExpanded = new Set(expandedPendingFacilities);
      if (newExpanded.has(facilityId)) {
        newExpanded.delete(facilityId);
      } else {
        newExpanded.add(facilityId);
      }
      setExpandedPendingFacilities(newExpanded);
    }
  };

  const toggleDateExpanded = (
    facilityId: number,
    dateKey: string,
    type: "closed" | "pending",
  ) => {
    const expandKey = `${facilityId}-${dateKey}`;
    if (type === "closed") {
      const newExpanded = new Set(expandedClosedDates);
      if (newExpanded.has(expandKey)) {
        newExpanded.delete(expandKey);
      } else {
        newExpanded.add(expandKey);
      }
      setExpandedClosedDates(newExpanded);
    } else {
      const newExpanded = new Set(expandedPendingDates);
      if (newExpanded.has(expandKey)) {
        newExpanded.delete(expandKey);
      } else {
        newExpanded.add(expandKey);
      }
      setExpandedPendingDates(newExpanded);
    }
  };

  const filteredClosedGroups = React.useMemo(() => {
    return groupedSurveys.closed
      .map((group) => ({
        ...group,
        dates: new Map(
          Array.from(group.dates.entries())
            .map(([dateKey, dateGroup]): [string, typeof dateGroup] => {
              if (!dateGroup || typeof dateGroup === "string") {
                return [
                  dateKey,
                  {
                    date: dateKey,
                    surveys: [],
                    totalTemplates: 0,
                    completedSurveys: 0,
                    pocCount: 0,
                  },
                ];
              }

              const filteredSurveys = dateGroup.surveys.filter((survey) => {
                const matchesFacility =
                  closedFacilityFilter === "all" ||
                  String(group.facilityId) === closedFacilityFilter;
                const matchesTemplate =
                  closedTemplateFilter === "all" ||
                  String(survey.templateId) === closedTemplateFilter;

                const pocExists = surveyPocExists.get(survey.id) || false;
                const scoreData = surveyScores.get(survey.id);
                const scorePercentage =
                  scoreData && scoreData.totalPossible > 0
                    ? Math.round(
                      (scoreData.score / scoreData.totalPossible) * 100,
                    )
                    : 0;
                const isPocCompleted = pocExists || scorePercentage >= 85;

                const matchesStatus =
                  closedStatusFilter === "all" ||
                  (closedStatusFilter === "poc-completed" && isPocCompleted) ||
                  (closedStatusFilter === "poc-pending" && !isPocCompleted);

                return matchesFacility && matchesTemplate && matchesStatus;
              });

              return [dateKey, { ...dateGroup, surveys: filteredSurveys }];
            })
            .filter(
              (
                entry,
              ): entry is [
                string,
                {
                  surveys: any[];
                  date: string;
                  totalTemplates: number;
                  completedSurveys: number;
                  pocCount: number;
                },
              ] =>
                entry[1] &&
                Array.isArray(entry[1].surveys) &&
                entry[1].surveys.length > 0,
            ),
        ),
      }))
      .filter((group) => group.dates.size > 0);
  }, [
    groupedSurveys.closed,
    closedFacilityFilter,
    closedTemplateFilter,
    closedStatusFilter,
    surveyPocExists,
    surveyScores,
  ]);

  const filteredPendingGroups = React.useMemo(() => {
    return groupedSurveys.pending
      .map((group) => ({
        ...group,
        dates: new Map(
          Array.from(group.dates.entries())
            .map(([dateKey, dateGroup]): [string, typeof dateGroup] => {
              if (typeof dateGroup === "string") {
                return [
                  dateKey,
                  {
                    date: dateKey,
                    surveys: [],
                    totalTemplates: 0,
                    completedSurveys: 0,
                    pocCount: 0,
                  },
                ];
              }
              const filteredSurveys = dateGroup.surveys.filter((survey) => {
                const matchesFacility =
                  pendingFacilityFilter === "all" ||
                  String(group.facilityId) === pendingFacilityFilter;
                const matchesTemplate =
                  pendingTemplateFilter === "all" ||
                  String(survey.templateId) === pendingTemplateFilter;
                const matchesStatus =
                  pendingStatusFilter === "all" ||
                  (pendingStatusFilter === "locked" && survey.isLocked) ||
                  (pendingStatusFilter === "unlocked" && !survey.isLocked);
                return matchesFacility && matchesTemplate && matchesStatus;
              });
              return [dateKey, { ...dateGroup, surveys: filteredSurveys }];
            })
            .filter(
              (
                entry,
              ): entry is [
                string,
                {
                  surveys: any[];
                  date: string;
                  totalTemplates: number;
                  completedSurveys: number;
                  pocCount: number;
                },
              ] => {
                const [_, dateGroup] = entry;
                return (
                  typeof dateGroup !== "string" && dateGroup.surveys.length > 0
                );
              },
            ),
        ),
      }))
      .filter((group) => group.dates.size > 0);
  }, [
    groupedSurveys.pending,
    pendingFacilityFilter,
    pendingTemplateFilter,
    pendingStatusFilter,
  ]);

  const facilityOptions = React.useMemo(() => {
    const allFacilities = [...groupedSurveys.closed, ...groupedSurveys.pending];
    const uniqueFacilities = new Map();

    allFacilities.forEach((group) => {
      if (!uniqueFacilities.has(group.facilityId)) {
        uniqueFacilities.set(group.facilityId, {
          id: group.facilityId,
          name: group.facilityName,
        });
      }
    });

    return Array.from(uniqueFacilities.values());
  }, [groupedSurveys]);

  const templateOptions = React.useMemo(() => {
    const allSurveys = [...(surveys.data ?? [])];
    const uniqueTemplates = new Map();
    allSurveys.forEach((survey) => {
      if (survey.template && survey.templateId) {
        uniqueTemplates.set(survey.templateId, {
          id: survey.templateId,
          name: survey.template.name || `Template ${survey.templateId}`,
        });
      }
    });
    return Array.from(uniqueTemplates.values());
  }, [surveys.data]);

  const clearAllFilters = () => {
    setSelectedDate(undefined);
    setDateSortOrder(null);
    setClosedFacilityFilter("all");
    setPendingFacilityFilter("all");
    setClosedTemplateFilter("all");
    setPendingTemplateFilter("all");
    setClosedStatusFilter("all");
    setPendingStatusFilter("all");
  };

  const hasActiveFilters =
    selectedDate ||
    dateSortOrder ||
    closedFacilityFilter !== "all" ||
    pendingFacilityFilter !== "all" ||
    closedTemplateFilter !== "all" ||
    pendingTemplateFilter !== "all" ||
    closedStatusFilter !== "all" ||
    pendingStatusFilter !== "all";

  const getPocStatus = (
    survey: any,
    scoreData: { score: number; totalPossible: number } | undefined,
    sectionType: "completed" | "pending" = "completed",
  ) => {
    if (sectionType === "pending") {
      if (survey.isLocked) {
        return {
          status: "Locked",
          variant: "secondary" as const,
          className: "bg-gray-100 text-gray-800",
        };
      }

      if (survey._isComplete === true) {
        return {
          status: "Completed",
          variant: "default" as const,
          className: "bg-green-100 text-green-800",
        };
      }

      return {
        status: "In Progress",
        variant: "secondary" as const,
        className: "bg-blue-100 text-blue-800",
      };
    }

    if (!survey.isLocked) {
      const isCompleted = survey.responses && survey.responses.length > 0;
      return {
        status: isCompleted ? "In Progress" : "POC Not Started (Unlocked)",
        variant: "secondary" as const,
        className: isCompleted
          ? "bg-blue-100 text-blue-800"
          : "bg-gray-100 text-gray-800",
      };
    }

    const scorePercentage =
      scoreData && scoreData.totalPossible > 0
        ? Math.round((scoreData.score / scoreData.totalPossible) * 100)
        : 0;

    if (scorePercentage >= 85) {
      return {
        status: "No POC Required",
        variant: "secondary" as const,
        className: "bg-green-100 text-green-800",
      };
    }

    const pocExists = surveyPocExists.get(survey.id) || false;
    if (pocExists) {
      return {
        status: "POC Completed",
        variant: "default" as const,
        className: "bg-blue-100 text-blue-800",
      };
    } else {
      return {
        status: "POC In Progress",
        variant: "secondary" as const,
        className: "bg-amber-100 text-amber-800",
      };
    }
  };

  const FacilityGroupRow = ({
    group,
    type,
    isExpanded,
    onToggle,
  }: {
    group: GroupedSurvey;
    type: "closed" | "pending";
    isExpanded: boolean;
    onToggle: () => void;
  }) => (
    <>
      <TableRow
        className="bg-muted/50 hover:bg-muted/70 cursor-pointer font-medium"
        onClick={onToggle}
      >
        <TableCell className="pl-0 text-center font-mono">
          <Button variant="ghost" size="sm" className="h-auto p-0">
            {isExpanded ? (
              <ChevronDownIcon className="h-4 w-4" />
            ) : (
              <ChevronRightIcon className="h-4 w-4" />
            )}
          </Button>
        </TableCell>
        <TableCell colSpan={3}>
          <div className="flex items-center gap-2">
            🏢{" "}
            {group.facility && <FacilityHoverCard facility={group.facility} />}
            <Badge variant="outline" className="ml-2">
              {group.totalTemplates} template
              {group.totalTemplates !== 1 ? "s" : ""}
            </Badge>
          </div>
        </TableCell>
        <TableCell></TableCell>
        <TableCell>-</TableCell>
      </TableRow>

      {isExpanded &&
        Array.from(group.dates.entries()).map(([dateKey, dateGroup]) => {
          const expandKey = `${group.facilityId}-${dateKey}`;
          const isDateExpanded =
            type === "closed"
              ? expandedClosedDates.has(expandKey)
              : expandedPendingDates.has(expandKey);

          return (
            <React.Fragment key={dateKey}>
              <TableRow
                className="bg-muted/30 hover:bg-muted/50 cursor-pointer"
                onClick={() =>
                  toggleDateExpanded(group.facilityId, dateKey, type)
                }
              >
                <TableCell className="pl-0 text-center font-mono">
                  <Button variant="ghost" size="sm" className="h-auto p-0">
                    {isDateExpanded ? (
                      <ChevronDownIcon className="h-4 w-4" />
                    ) : (
                      <ChevronRightIcon className="h-4 w-4" />
                    )}
                  </Button>
                </TableCell>
                <TableCell colSpan={2}>
                  <div className="flex items-center gap-2">
                    📅 <Badge variant="secondary">{dateKey}</Badge>
                  </div>
                </TableCell>
                <TableCell>
                  {type === "pending"
                    ? (() => {
                      const completedCount = dateGroup.surveys.filter(
                        (s) => s._isComplete === true,
                      ).length;
                      const lockedCount = dateGroup.surveys.filter(
                        (s) => s.isLocked,
                      ).length;
                      const totalCount = dateGroup.surveys.length;
                      const allCompleted = completedCount === totalCount;

                      return (
                        <Badge
                          className={cn(
                            allCompleted
                              ? "border-green-300 bg-green-100 text-green-800"
                              : "border-yellow-300 bg-yellow-100 text-yellow-800",
                          )}
                        >
                          {!allCompleted
                            ? `${completedCount}/${totalCount} Templates Completed`
                            : `${lockedCount}/${totalCount} Templates Locked`}
                        </Badge>
                      );
                    })()
                    : (() => {
                      const requiresPoc = dateGroup.surveys.filter((s) => {
                        const scoreData = surveyScores.get(s.id);
                        const pct =
                          scoreData && scoreData.totalPossible > 0
                            ? Math.round(
                              (scoreData.score / scoreData.totalPossible) *
                              100,
                            )
                            : 0;
                        return pct < 85;
                      });

                      const totalRequiring = requiresPoc.length;

                      if (totalRequiring === 0) {
                        return (
                          <Badge className="border-slate-300 bg-slate-100 text-slate-800">
                            No POC Required
                          </Badge>
                        );
                      }

                      const completedCount = requiresPoc.filter((s) => {
                        const pocExists = surveyPocExists.get(s.id) || false;
                        return pocExists;
                      }).length;

                      const allDone = completedCount === totalRequiring;

                      return (
                        <Badge
                          className={cn(
                            allDone
                              ? "border-green-300 bg-green-100 text-green-800"
                              : "border-blue-300 bg-blue-100 text-blue-800",
                          )}
                        >
                          {completedCount}/{totalRequiring} POC completed
                        </Badge>
                      );
                    })()}
                </TableCell>

                <TableCell>-</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    {type === "pending" &&
                      dateGroup.surveys.length > 0 &&
                      dateGroup.surveys.every((s) => s.isLocked) && (
                        <Button
                          variant="destructive"
                          size="sm"
                          className="h-7 bg-red-600 text-white hover:bg-red-700"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleGeneratePocForDate(dateGroup.surveys);
                          }}
                          disabled={markPocGenerated.isPending}
                        >
                          {markPocGenerated.isPending
                            ? "Generating..."
                            : "Generate POC"}
                        </Button>
                      )}
                  </div>
                </TableCell>
              </TableRow>

              {isDateExpanded && (
                <TableRow>
                  <TableCell colSpan={7} className="bg-muted/20 p-4">
                    <div
                      className={cn(
                        "overflow-hidden rounded-lg border-2",
                        type === "closed"
                          ? "border-green-300 bg-white"
                          : "border-amber-300 bg-white",
                      )}
                    >
                      <Table>
                        <TableHeader>
                          <TableRow
                            className={cn(
                              "border-b-2",
                              type === "closed"
                                ? "border-green-200 bg-green-50 hover:bg-green-50"
                                : "border-amber-200 bg-amber-50 hover:bg-amber-50",
                            )}
                          >
                            <TableHead
                              className={cn(
                                "w-[80px] text-right font-semibold",
                                type === "closed"
                                  ? "text-green-800"
                                  : "text-amber-800",
                              )}
                            >
                              System ID
                            </TableHead>
                            <TableHead
                              className={cn(
                                "font-semibold",
                                type === "closed"
                                  ? "text-green-800"
                                  : "text-amber-800",
                              )}
                            >
                              Date
                            </TableHead>
                            <TableHead
                              className={cn(
                                "font-semibold",
                                type === "closed"
                                  ? "text-green-800"
                                  : "text-amber-800",
                              )}
                            >
                              Surveyor
                            </TableHead>
                            <TableHead
                              className={cn(
                                "font-semibold",
                                type === "closed"
                                  ? "text-green-800"
                                  : "text-amber-800",
                              )}
                            >
                              Template
                            </TableHead>
                            <TableHead
                              className={cn(
                                "font-semibold",
                                type === "closed"
                                  ? "text-green-800"
                                  : "text-amber-800",
                              )}
                            >
                              Status
                            </TableHead>
                            <TableHead
                              className={cn(
                                "text-center font-semibold",
                                type === "closed"
                                  ? "text-green-800"
                                  : "text-amber-800",
                              )}
                            >
                              Score
                            </TableHead>
                            <TableHead
                              className={cn(
                                "text-right font-semibold",
                                type === "closed"
                                  ? "text-green-800"
                                  : "text-amber-800",
                              )}
                            >
                              Action
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {dateGroup.surveys.map((survey) => {
                            const scoreData = surveyScores.get(survey.id);
                            const scorePercentage =
                              scoreData && scoreData.totalPossible > 0
                                ? Math.round(
                                  (scoreData.score /
                                    scoreData.totalPossible) *
                                  100,
                                )
                                : 0;
                            const pocStatus = getPocStatus(
                              survey,
                              scoreData,
                              type === "pending" ? "pending" : "completed",
                            );

                            return (
                              <TableRow
                                key={`${type}-survey-${survey.id}`}
                                className="hover:bg-muted/50"
                              >
                                <TableCell className="text-right font-mono tabular-nums">
                                  {survey.id}
                                </TableCell>
                                <TableCell>
                                  <Badge variant="secondary">{dateKey}</Badge>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    {survey.surveyor ? (
                                      <>
                                        <span>{survey.surveyor.name}</span>
                                        <Badge
                                          variant="outline"
                                          className="text-xs"
                                        >
                                          {survey.surveyor.email}
                                        </Badge>
                                      </>
                                    ) : (
                                      "-"
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {survey.template && (
                                    <TemplateHoverCard
                                      template={survey.template}
                                    />
                                  )}
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    variant={pocStatus.variant}
                                    className={pocStatus.className}
                                  >
                                    {pocStatus.status}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    {scoreData ? (
                                      <div className="flex flex-col items-center">
                                        <Badge
                                          variant="outline"
                                          className={cn(
                                            "font-mono",
                                            scorePercentage >= 80
                                              ? "border-green-300 bg-green-100 text-green-800"
                                              : scorePercentage >= 60
                                                ? "border-yellow-300 bg-yellow-100 text-yellow-800"
                                                : "border-red-300 bg-red-100 text-red-800",
                                          )}
                                        >
                                          {scoreData.score}/
                                          {scoreData.totalPossible}
                                        </Badge>
                                      </div>
                                    ) : (
                                      <Skeleton className="h-6 w-12" />
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell className="text-right">
                                  <Link
                                    href={`/qisv/surveys/${survey.id}`}
                                    className={cn(
                                      buttonVariants({
                                        variant: "outline",
                                        size: "icon",
                                      }),
                                      "size-6",
                                    )}
                                  >
                                    <ExternalLinkIcon className="h-3 w-3" />
                                  </Link>

                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="text-destructive hover:text-destructive ml-2 h-6 w-6"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSurveyToDelete({
                                            id: survey.id,
                                            name:
                                              survey.template?.name ??
                                              `Survey ${survey.id}`,
                                          });
                                        }}
                                        disabled={deleteSurvey.isPending}
                                      >
                                        <TrashIcon className="h-4 w-4" />
                                        <span className="sr-only">
                                          Delete survey
                                        </span>
                                      </Button>
                                    </AlertDialogTrigger>

                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>
                                          Delete Template
                                        </AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Are you sure you want to delete the
                                          template "
                                          {surveyToDelete?.id === survey.id
                                            ? surveyToDelete?.id
                                            : (survey.template?.name ??
                                              `Survey ${survey.id}`)}
                                          "? This action cannot be undone and
                                          will delete all associated data.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel
                                          onClick={() =>
                                            setSurveyToDelete(null)
                                          }
                                          disabled={deleteSurvey.isPending}
                                        >
                                          Cancel
                                        </AlertDialogCancel>
                                        <AlertDialogAction
                                          className="bg-destructive rounded-lg px-4 py-2 text-white transition-colors duration-150 hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:outline-none active:bg-red-800"
                                          onClick={() => {
                                            setSurveyToDelete(null);
                                            deleteSurvey.mutate({
                                              id: survey.id,
                                            });
                                          }}
                                          disabled={deleteSurvey.isPending}
                                        >
                                          {deleteSurvey.isPending
                                            ? "Deleting..."
                                            : "Delete"}
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </React.Fragment>
          );
        })}
    </>
  );

  return (
    <>
      <QISVHeader crumbs={[{ label: "Surveys" }]} />

      <main className="px-4 py-6">
        {roleLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="border-primary mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-t-transparent"></div>
              <p className="text-muted-foreground">Loading permissions...</p>
            </div>
          </div>
        ) : !canViewSurveys ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <p className="text-destructive mb-2 text-lg font-semibold">
                Access Denied
              </p>
              <p className="text-muted-foreground">
                You don't have permission to view surveys.
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Surveys</h1>
                <p className="text-muted-foreground">
                  Manage surveys by facility
                </p>
              </div>

              {canCreateSurveys && (
                <Link
                  href={`/qisv/surveys/new`}
                  className={cn(buttonVariants())}
                >
                  <PlusIcon className="mr-2 h-4 w-4" /> Create Survey
                </Link>
              )}
            </div>

            {/* Global Filters */}
            <div className="bg-muted/30 mb-6 rounded-lg border p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold">Filters</h3>
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearAllFilters}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <XIcon className="mr-1 h-3 w-3" />
                    Clear All
                  </Button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground text-xs font-medium">
                    Date:
                  </span>
                  <Popover
                    open={datePopoverOpen}
                    onOpenChange={setDatePopoverOpen}
                  >
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "h-8 justify-start text-left font-normal",
                          !selectedDate && "text-muted-foreground",
                          selectedDate && "bg-primary/10 border-primary/20",
                        )}
                      >
                        <CalendarIcon className="mr-2 h-3 w-3" />
                        {selectedDate
                          ? format(selectedDate, "MMM dd, yyyy")
                          : "Select date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={(date) => {
                          setSelectedDate(date);
                          setDatePopoverOpen(false);
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  {selectedDate && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedDate(undefined)}
                      className="h-6 w-6 p-0"
                    >
                      <XIcon className="h-3 w-3" />
                    </Button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground text-xs font-medium">
                    Sort:
                  </span>
                  <div className="flex rounded-md border">
                    <Button
                      variant={dateSortOrder === "asc" ? "default" : "ghost"}
                      size="sm"
                      onClick={() =>
                        setDateSortOrder(dateSortOrder === "asc" ? null : "asc")
                      }
                      className="h-8 rounded-r-none border-r"
                    >
                      <ArrowUpIcon className="h-3 w-3" />
                      Oldest
                    </Button>
                    <Button
                      variant={dateSortOrder === "desc" ? "default" : "ghost"}
                      size="sm"
                      onClick={() =>
                        setDateSortOrder(
                          dateSortOrder === "desc" ? null : "desc",
                        )
                      }
                      className="h-8 rounded-l-none"
                    >
                      <ArrowDownIcon className="h-3 w-3" />
                      Newest
                    </Button>
                  </div>
                </div>

                {selectedDate && (
                  <Badge
                    variant="secondary"
                    className="bg-primary/10 text-primary"
                  >
                    Date: {format(selectedDate, "MMM dd, yyyy")}
                  </Badge>
                )}
                {dateSortOrder && (
                  <Badge
                    variant="secondary"
                    className="bg-primary/10 text-primary"
                  >
                    Sort:{" "}
                    {dateSortOrder === "asc" ? "Oldest First" : "Newest First"}
                  </Badge>
                )}
              </div>
            </div>

            {/* Completed Surveys */}
            <div className="mb-8 overflow-hidden rounded-lg border border-[#0c2152] bg-[#0c2152]">
              <div className="bg-[#0c2152]-100/50 flex items-center justify-between border-b border-[#0c2152] p-4">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-green-500"></div>
                  <span className="font-semibold text-white">
                    Completed Surveys
                  </span>
                  <Badge
                    variant="secondary"
                    className="bg-green-200 text-green-800"
                  >
                    {filteredClosedGroups.length} facilit
                    {filteredClosedGroups.length !== 1 ? "ies" : "y"}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Select
                    value={closedFacilityFilter}
                    onValueChange={setClosedFacilityFilter}
                  >
                    <SelectTrigger className="h-8 w-36 bg-white">
                      <SelectValue placeholder="All Facilities" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Facilities</SelectItem>
                      {facilityOptions.map((f) => (
                        <SelectItem key={f.id} value={String(f.id)}>
                          {f.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Combobox
                    options={templateOptions}
                    value={closedTemplateFilter}
                    onChange={setClosedTemplateFilter}
                    placeholder="All Templates"
                    className="w-40"
                  />

                  <Select
                    value={closedStatusFilter}
                    onValueChange={setClosedStatusFilter}
                  >
                    <SelectTrigger className="h-8 w-40 bg-white">
                      <SelectValue placeholder="POC Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="poc-completed">
                        POC Completed
                      </SelectItem>
                      <SelectItem value="poc-pending">
                        POC In Progress
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Table className="bg-white">
                <TableBody>
                  {surveys.isPending ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <TableRow key={`closed-skel-${i}`}>
                        <TableCell className="text-right">
                          <Skeleton className="ml-auto h-6 w-10" />
                        </TableCell>
                        {Array.from({ length: 6 }).map((_, j) => (
                          <TableCell key={`closed-skel-cell-${i}-${j}`}>
                            <Skeleton className="h-6" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : filteredClosedGroups.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="text-muted-foreground py-8 text-center"
                      >
                        {hasActiveFilters
                          ? "No completed surveys found with current filters."
                          : "No completed surveys found."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredClosedGroups.map((group) => (
                      <FacilityGroupRow
                        key={`closed-group-${group.facilityId}`}
                        group={group}
                        type="closed"
                        isExpanded={expandedClosedFacilities.has(
                          group.facilityId,
                        )}
                        onToggle={() =>
                          toggleFacilityExpanded(group.facilityId, "closed")
                        }
                      />
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pending Surveys */}
            <div className="mb-8 rounded-lg border border-[#0c2152] bg-[#0C2152]">
              <div className="flex items-center justify-between border-b border-[#0c2152] p-4">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-amber-500"></div>
                  <span className="font-semibold text-white">
                    Pending Surveys
                  </span>
                  <Badge
                    variant="secondary"
                    className="bg-amber-200 text-amber-800"
                  >
                    {filteredPendingGroups.length} facilit
                    {filteredPendingGroups.length !== 1 ? "ies" : "y"}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Select
                    value={pendingFacilityFilter}
                    onValueChange={setPendingFacilityFilter}
                  >
                    <SelectTrigger className="h-8 w-36 bg-white">
                      <SelectValue placeholder="All Facilities" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Facilities</SelectItem>
                      {facilityOptions.map((f) => (
                        <SelectItem key={f.id} value={String(f.id)}>
                          {f.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Combobox
                    options={templateOptions}
                    value={pendingTemplateFilter}
                    onChange={setPendingTemplateFilter}
                    placeholder="All Templates"
                    className="w-40"
                  />

                  <Select
                    value={pendingStatusFilter}
                    onValueChange={setPendingStatusFilter}
                  >
                    <SelectTrigger className="h-8 w-40 bg-white">
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="locked">Locked</SelectItem>
                      <SelectItem value="unlocked">In Progress</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Table>
                <TableBody className="rounded-lg border-white bg-white">
                  {surveys.isPending ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <TableRow key={`pending-skel-${i}`}>
                        <TableCell className="text-right">
                          <Skeleton className="ml-auto h-6 w-10" />
                        </TableCell>
                        {Array.from({ length: 6 }).map((_, j) => (
                          <TableCell key={`pending-skel-cell-${i}-${j}`}>
                            <Skeleton className="h-6" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : filteredPendingGroups.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="text-muted-foreground py-8 text-center"
                      >
                        {hasActiveFilters
                          ? "No pending surveys found with current filters."
                          : "No pending surveys found."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredPendingGroups.map((group) => (
                      <FacilityGroupRow
                        key={`pending-group-${group.facilityId}`}
                        group={group}
                        type="pending"
                        isExpanded={expandedPendingFacilities.has(
                          group.facilityId,
                        )}
                        onToggle={() =>
                          toggleFacilityExpanded(group.facilityId, "pending")
                        }
                      />
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </main>
    </>
  );
}
