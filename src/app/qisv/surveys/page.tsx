"use client";

import { api } from "@/trpc/react";
import { QISVHeader } from "../_components/header";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { ExternalLinkIcon, PlusIcon, ChevronDownIcon, ChevronRightIcon, CalendarIcon, ArrowUpIcon, ArrowDownIcon, XIcon, TrashIcon } from "lucide-react";
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

const PAGE_SIZES = [10, 50, 100];

type GroupedSurvey = {
  facilityId: number;
  facilityName: string;
  facility: any;
  dates: Map<string, {
    date: string;
    surveys: any[];
    totalTemplates: number;
    completedSurveys: number;
    pocCount: number;
  }>;
  totalTemplates: number;
  completedSurveys: number;
  pocCount: number;
};

type DateSortOrder = "asc" | "desc" | null;

export default function SurveysPage() {
  const session = authClient.useSession();
  const searchParams = useSearchParams();

  const assignedFacility = api.user.getForOrg.useQuery({});

  const page = Number(searchParams.get("page") ?? 1);
  const pageSize = Number(searchParams.get("pageSize") ?? 100);

  const [closedTemplateFilter, setClosedTemplateFilter] = React.useState<string>("all");
  const [pendingTemplateFilter, setPendingTemplateFilter] = React.useState<string>("all");
  const [closedStatusFilter, setClosedStatusFilter] = React.useState<string>("all");
  const [pendingStatusFilter, setPendingStatusFilter] = React.useState<string>("all");


  // Get all surveys
  const surveys = api.survey.list.useQuery(
    {
      facilityId: Array.isArray(assignedFacility.data) ? undefined : assignedFacility.data?.id,
      page,
      pageSize,
    },
    { enabled: !!assignedFacility.data }
  );

  const hasViewSurveyPermission = useQuery({
    queryKey: ["permissions", "read-survey", session.data?.user.id],
    queryFn: async () =>
      (
        await authClient.organization.hasPermission({
          permissions: { organization: ["update"] },
        })
      ).data?.success ?? false,
  });

  const hasNewSurveyPermission = useQuery({
    queryKey: ["permissions", "new-survey", session.data?.user.id],
    queryFn: async () =>
      (
        await authClient.organization.hasPermission({
          permissions: { organization: ["update"] },
        })
      ).data?.success ?? false,
  });

  // Date filtering states
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(undefined);
  const [dateSortOrder, setDateSortOrder] = React.useState<DateSortOrder>(null);
  const [datePopoverOpen, setDatePopoverOpen] = React.useState(false);

  // Filters
  const [closedFacilityFilter, setClosedFacilityFilter] = React.useState<string>("all");
  const [pendingFacilityFilter, setPendingFacilityFilter] = React.useState<string>("all");

  // Expanded states for facility, date, and template groups
  const [expandedClosedFacilities, setExpandedClosedFacilities] = React.useState<Set<number>>(new Set());
  const [expandedPendingFacilities, setExpandedPendingFacilities] = React.useState<Set<number>>(new Set());
  const [expandedClosedDates, setExpandedClosedDates] = React.useState<Set<string>>(new Set());
  const [expandedPendingDates, setExpandedPendingDates] = React.useState<Set<string>>(new Set());

  // State to store survey scores
  const [surveyScores, setSurveyScores] = React.useState<Map<number, { score: number; totalPossible: number }>>(new Map());

  // State to store POC existence for each survey from survey_poc table (for display only)
  const [surveyPocExists, setSurveyPocExists] = React.useState<Map<number, boolean>>(new Map());

  // DELETE FUNCTIONALITY
  const [surveyToDelete, setSurveyToDelete] = useState<{ id: number; name: string } | null>(null);

  // Access utils for API calls
  const utils = api.useUtils();

  // ✅ UPDATED: Fetch survey scores including GENERAL, CASE, and RESIDENT responses
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!surveys.data || surveys.data.length === 0) return;

      try {
        const scoresMap = new Map<number, { score: number; totalPossible: number }>();

        // Calculate score for each survey using UPDATED logic to include all survey types
        await Promise.all(
          surveys.data.map(async (survey) => {
            try {
              // Get residents, cases, and questions
              const residents = await utils.survey.listResidents.fetch({ surveyId: survey.id });
              const cases = await utils.survey.listCases.fetch({ surveyId: survey.id });
              const questions = await utils.question.list.fetch({ templateId: survey.templateId });

              if (!questions || questions.length === 0) {
                scoresMap.set(survey.id, { score: 0, totalPossible: 0 });
                return;
              }

              // ✅ UPDATED: Fetch responses for RESIDENTS, CASES, AND GENERAL
              const allResponses: Array<{
                residentId: number | null;
                surveyCaseId: number | null;
                questionId: number;
                status: string | null;
                findings: string | null
              }> = [];

              // Fetch resident responses
              if (residents && residents.length > 0) {
                await Promise.all(
                  residents.map(async (r) => {
                    const rows = await utils.survey.listResponses.fetch({
                      surveyId: survey.id,
                      residentId: r.residentId
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
                  })
                );
              }

              // ✅ Fetch case responses
              if (cases && cases.length > 0) {
                await Promise.all(
                  cases.map(async (c) => {
                    const rows = await utils.survey.listResponses.fetch({
                      surveyId: survey.id,
                      surveyCaseId: c.id
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
                  })
                );
              }

              // ✅ NEW: Fetch general responses (no resident or case ID)
              if ((!residents || residents.length === 0) && (!cases || cases.length === 0)) {
                const rows = await utils.survey.listResponses.fetch({
                  surveyId: survey.id,
                  residentId: null,
                  surveyCaseId: null
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

              // ✅ UPDATED: Create byEntity map to handle residents, cases, AND general
              const byEntity = new Map<string, Map<number, { status: string | null; findings: string | null }>>();
              for (const r of allResponses) {
                const entityKey = r.residentId
                  ? `resident-${r.residentId}`
                  : r.surveyCaseId
                    ? `case-${r.surveyCaseId}`
                    : 'general'; // ✅ NEW: Handle general responses
                const inner = byEntity.get(entityKey) ?? new Map();
                inner.set(r.questionId, { status: r.status, findings: r.findings });
                byEntity.set(entityKey, inner);
              }

              // ✅ UPDATED: Score calculation - handle all three survey types
              // ✅ UPDATED: Score calculation - handle all three survey types + N/A logic
              let awarded = 0;
              for (const q of questions) {
                let anyUnmetOrUnanswered = false;
                let anyMet = false;
                let allNA = true; // ✅ ADD THIS LINE

                // ✅ NEW: Handle general surveys (no residents or cases)
                if ((!residents || residents.length === 0) && (!cases || cases.length === 0)) {
                  // This is a general survey
                  const cell = byEntity.get('general')?.get(q.id);
                  if (!cell?.status) {
                    anyUnmetOrUnanswered = true;
                    allNA = false; // ✅ ADD THIS
                  } else if (cell.status === "unmet") {
                    anyUnmetOrUnanswered = true;
                    allNA = false; // ✅ ADD THIS
                  } else if (cell.status === "met") {
                    anyMet = true;
                    allNA = false; // ✅ ADD THIS
                  }
                  // ✅ N/A keeps allNA = true
                } else {
                  // Check resident responses
                  if (residents && residents.length > 0) {
                    for (const r of residents) {
                      const cell = byEntity.get(`resident-${r.residentId}`)?.get(q.id);
                      if (!cell?.status) {
                        anyUnmetOrUnanswered = true;
                        allNA = false; // ✅ ADD THIS
                        break;
                      }
                      if (cell.status === "unmet") {
                        anyUnmetOrUnanswered = true;
                        allNA = false; // ✅ ADD THIS
                        break;
                      }
                      if (cell.status === "met") {
                        anyMet = true;
                        allNA = false; // ✅ ADD THIS
                      }
                      // ✅ N/A keeps allNA = true
                    }
                  }

                  // Check case responses
                  if (!anyUnmetOrUnanswered && cases && cases.length > 0) {
                    for (const c of cases) {
                      const cell = byEntity.get(`case-${c.id}`)?.get(q.id);
                      if (!cell?.status) {
                        anyUnmetOrUnanswered = true;
                        allNA = false; // ✅ ADD THIS
                        break;
                      }
                      if (cell.status === "unmet") {
                        anyUnmetOrUnanswered = true;
                        allNA = false; // ✅ ADD THIS
                        break;
                      }
                      if (cell.status === "met") {
                        anyMet = true;
                        allNA = false; // ✅ ADD THIS
                      }
                      // ✅ N/A keeps allNA = true
                    }
                  }
                }

                // ✅ CHANGE THIS LINE:
                // OLD: Award points only if no unmet/unanswered AND at least one met
                // NEW: Award points if no unmet/unanswered AND (at least one met OR all N/A)
                if (!anyUnmetOrUnanswered && (anyMet || allNA)) {
                  awarded += q.points ?? 0;
                }
              }


              const max = questions.reduce((s, q) => s + (q.points ?? 0), 0);

              scoresMap.set(survey.id, {
                score: awarded,
                totalPossible: max
              });

            } catch (error) {
              console.error(`Failed to calculate score for survey ${survey.id}:`, error);
              scoresMap.set(survey.id, { score: 0, totalPossible: 0 });
            }
          })
        );

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

  // ✅ UPDATED: Fetch POC existence for ALL survey types (resident, case, AND general)
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!surveys.data || surveys.data.length === 0) return;

      try {
        const pocExistsMap = new Map<number, boolean>();

        // Check each survey for actual POC existence in survey_poc table
        await Promise.all(
          surveys.data.map(async (survey) => {
            try {
              // Get residents and cases for this survey
              const residents = await utils.survey.listResidents.fetch({ surveyId: survey.id });
              const cases = await utils.survey.listCases.fetch({ surveyId: survey.id });

              let hasPOC = false;

              // ✅ NEW: Handle general surveys (no residents or cases)
              if ((!residents || residents.length === 0) && (!cases || cases.length === 0)) {
                // This is a general survey - check for general POCs
                const pocRows = await utils.poc.list.fetch({ surveyId: survey.id });
                for (const pocRow of pocRows ?? []) {
                  if (pocRow.pocText && pocRow.pocText.trim() && pocRow.templateId === survey.templateId) {
                    hasPOC = true;
                    break;
                  }
                }
              } else {
                // ✅ Check resident POCs
                if (residents && residents.length > 0) {
                  const pocResults = await Promise.all(
                    residents.map(r => utils.poc.list.fetch({ surveyId: survey.id, residentId: r.residentId }))
                  );

                  outer: for (const pocRows of pocResults) {
                    for (const pocRow of pocRows ?? []) {
                      if (pocRow.pocText && pocRow.pocText.trim() && pocRow.templateId === survey.templateId) {
                        hasPOC = true;
                        break outer;
                      }
                    }
                  }
                }

                // ✅ NEW: Check case POCs
                if (!hasPOC && cases && cases.length > 0) {
                  const pocResults = await Promise.all(
                    cases.map(c => utils.poc.list.fetch({ surveyId: survey.id, surveyCaseId: c.id }))
                  );

                  outer: for (const pocRows of pocResults) {
                    for (const pocRow of pocRows ?? []) {
                      if (pocRow.pocText && pocRow.pocText.trim() && pocRow.templateId === survey.templateId) {
                        hasPOC = true;
                        break outer;
                      }
                    }
                  }
                }
              }

              pocExistsMap.set(survey.id, hasPOC);
            } catch (error) {
              console.error(`Failed to check POC for survey ${survey.id}:`, error);
              pocExistsMap.set(survey.id, false);
            }
          })
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

  // DELETE FUNCTIONALITY
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

  // Helper function to check if survey date matches selected date (ignoring time)
  const doesDateMatch = (surveyDate: string | Date | null | undefined, selectedDate: Date): boolean => {
    if (!surveyDate || !selectedDate) return false;

    try {
      let surveyDateObj: Date;

      // Handle different date formats
      if (typeof surveyDate === 'string') {
        // Try parsing ISO format first (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss)
        surveyDateObj = new Date(surveyDate);
      } else {
        surveyDateObj = surveyDate;
      }

      // Check if date is valid
      if (isNaN(surveyDateObj.getTime()) || isNaN(selectedDate.getTime())) {
        return false;
      }

      // Compare year, month, and day only (ignoring time)
      return surveyDateObj.getFullYear() === selectedDate.getFullYear() &&
        surveyDateObj.getMonth() === selectedDate.getMonth() &&
        surveyDateObj.getDate() === selectedDate.getDate();
    } catch (error) {
      console.warn('Date comparison error:', error);
      return false;
    }
  };

  // Function to filter and sort surveys by date
  const filterAndSortSurveys = React.useCallback((surveyList: any[]) => {
    let filtered = [...surveyList];

    console.log('Filtering surveys:', {
      totalSurveys: filtered.length,
      selectedDate: selectedDate,
      selectedDateFormatted: selectedDate ? format(selectedDate, "yyyy-MM-dd") : null,
      sampleSurveyDates: filtered.slice(0, 3).map(s => ({
        id: s.id,
        surveyDate: s.surveyDate,
        type: typeof s.surveyDate
      }))
    });

    // Filter by specific date if selected
    if (selectedDate) {
      filtered = filtered.filter(survey => {
        const matches = doesDateMatch(survey.surveyDate, selectedDate);
        console.log(`Survey ${survey.id} (${survey.surveyDate}) matches ${format(selectedDate, "yyyy-MM-dd")}:`, matches);
        return matches;
      });

      console.log('After date filter:', filtered.length, 'surveys remain');
    }

    // Sort by date if order is specified
    if (dateSortOrder) {
      filtered.sort((a, b) => {
        const dateA = new Date(a.surveyDate || 0);
        const dateB = new Date(b.surveyDate || 0);

        if (isNaN(dateA.getTime()) && isNaN(dateB.getTime())) return 0;
        if (isNaN(dateA.getTime())) return 1;
        if (isNaN(dateB.getTime())) return -1;

        return dateSortOrder === "asc" ? dateA.getTime() - dateB.getTime() : dateB.getTime() - dateA.getTime();
      });
    }

    return filtered;
  }, [selectedDate, dateSortOrder]);

  // Helper function to determine survey category - BACK TO USING pocGenerated FLAG for grouping
  const getSurveyCategory = (survey: any, scoreData: { score: number; totalPossible: number } | undefined) => {
    // If survey is not locked, it goes to pending regardless of score/POC
    if (!survey.isLocked) {
      return 'pending';
    }

    const scorePercentage = scoreData && scoreData.totalPossible > 0
      ? Math.round((scoreData.score / scoreData.totalPossible) * 100)
      : 0;

    // For locked surveys:
    // If score >= 75% OR pocGenerated is true, it goes to completed
    // Otherwise, it goes to pending
    return (scorePercentage >= 85 || survey.pocGenerated) ? 'completed' : 'pending';
  };

  // Group surveys by facility → date → template hierarchy
  const groupedSurveys = React.useMemo(() => {
    if (!surveys.data) return { closed: [], pending: [] };

    // Apply date filters to all surveys first
    const filteredSurveys = filterAndSortSurveys(surveys.data);

    // Separate into completed and pending based on the logic
    const completedSurveys: any[] = [];
    const pendingSurveys: any[] = [];

    filteredSurveys.forEach(survey => {
      const scoreData = surveyScores.get(survey.id);
      const category = getSurveyCategory(survey, scoreData);

      if (category === 'completed') {
        completedSurveys.push(survey);
      } else {
        pendingSurveys.push(survey);
      }
    });

    // Debug logging
    console.log('Survey categorization (using pocGenerated for grouping, survey_poc for display):', {
      total: filteredSurveys.length,
      completed: completedSurveys.length,
      pending: pendingSurveys.length,
      completedSurveys: completedSurveys.map(s => ({
        id: s.id,
        isLocked: s.isLocked,
        pocGenerated: s.pocGenerated, // Used for grouping
        actualPocExists: surveyPocExists.get(s.id) // Used for display
      })),
      pendingSurveys: pendingSurveys.map(s => ({
        id: s.id,
        isLocked: s.isLocked,
        pocGenerated: s.pocGenerated, // Used for grouping
        actualPocExists: surveyPocExists.get(s.id) // Used for display
      }))
    });

    const groupByFacilityAndDate = (surveyList: any[]) => {
      const facilityMap = new Map<number, GroupedSurvey>();

      surveyList.forEach((survey) => {
        const facilityId = survey.facilityId;
        const facilityName = survey.facility?.name || `Facility ${facilityId}`;
        const surveyDate = survey.surveyDate ? new Date(survey.surveyDate) : null;
        const dateKey = surveyDate && !isNaN(surveyDate.getTime()) ? format(surveyDate, "yyyy-MM-dd") : "No date";

        // Get or create facility group
        if (!facilityMap.has(facilityId)) {
          facilityMap.set(facilityId, {
            facilityId,
            facilityName,
            facility: survey.facility,
            dates: new Map<string, {
              date: string;
              surveys: any[];
              totalTemplates: number;
              completedSurveys: number;
              pocCount: number;
            }>(),
            totalTemplates: 0,
            completedSurveys: 0,
            pocCount: 0,
          });
        }

        const facilityGroup = facilityMap.get(facilityId)!;

        // Get or create date group within facility
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

        // Add survey to date group
        dateGroup.surveys.push(survey);
        dateGroup.totalTemplates++;
        facilityGroup.totalTemplates++;
      });

      return Array.from(facilityMap.values());
    };

    return {
      closed: groupByFacilityAndDate(completedSurveys), // "Completed" surveys
      pending: groupByFacilityAndDate(pendingSurveys),   // "Pending" surveys
    };
  }, [surveys.data, filterAndSortSurveys, surveyScores, surveyPocExists]);

  // Toggle functions for hierarchical expansion
  const toggleFacilityExpanded = (facilityId: number, type: 'closed' | 'pending') => {
    if (type === 'closed') {
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

  const toggleDateExpanded = (facilityId: number, dateKey: string, type: 'closed' | 'pending') => {
    const expandKey = `${facilityId}-${dateKey}`;
    if (type === 'closed') {
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

  // Filter groups
  const filteredClosedGroups = React.useMemo(() => {
    return groupedSurveys.closed
      .map(group => ({
        ...group,
        dates: new Map(
          Array.from(group.dates.entries())
            .map(([dateKey, dateGroup]): [string, typeof dateGroup] => {
              if (!dateGroup || typeof dateGroup === 'string') {
                return [dateKey, {
                  date: dateKey,
                  surveys: [],
                  totalTemplates: 0,
                  completedSurveys: 0,
                  pocCount: 0
                }];
              }

              const filteredSurveys = dateGroup.surveys.filter(survey => {
                const matchesFacility = closedFacilityFilter === "all" || String(group.facilityId) === closedFacilityFilter;
                const matchesTemplate = closedTemplateFilter === "all" || String(survey.templateId) === closedTemplateFilter;

                // POC Status filtering
                const pocExists = surveyPocExists.get(survey.id) || false;
                const scoreData = surveyScores.get(survey.id);
                const scorePercentage = scoreData && scoreData.totalPossible > 0
                  ? Math.round((scoreData.score / scoreData.totalPossible) * 100)
                  : 0;
                const isPocCompleted = pocExists || scorePercentage >= 85;

                const matchesStatus = closedStatusFilter === "all" ||
                  (closedStatusFilter === "poc-completed" && isPocCompleted) ||
                  (closedStatusFilter === "poc-pending" && !isPocCompleted);

                return matchesFacility && matchesTemplate && matchesStatus;
              });

              return [dateKey, { ...dateGroup, surveys: filteredSurveys }];
            })
            .filter((entry): entry is [string, { surveys: any[]; date: string; totalTemplates: number; completedSurveys: number; pocCount: number; }] =>
              entry[1] && Array.isArray(entry[1].surveys) && entry[1].surveys.length > 0
            )
        )
      }))
      .filter(group => group.dates.size > 0);
  }, [groupedSurveys.closed, closedFacilityFilter, closedTemplateFilter, closedStatusFilter, surveyPocExists, surveyScores]);



  const filteredPendingGroups = React.useMemo(() => {
    return groupedSurveys.pending
      .map(group => ({
        ...group,
        dates: new Map(
          Array.from(group.dates.entries())
            .map(([dateKey, dateGroup]): [string, typeof dateGroup] => {
              if (typeof dateGroup === 'string') {
                return [dateKey, {
                  date: dateKey,
                  surveys: [],
                  totalTemplates: 0,
                  completedSurveys: 0,
                  pocCount: 0
                }];
              }
              const filteredSurveys = dateGroup.surveys.filter(survey => {
                const matchesFacility = pendingFacilityFilter === "all" || String(group.facilityId) === pendingFacilityFilter;
                const matchesTemplate = pendingTemplateFilter === "all" || String(survey.templateId) === pendingTemplateFilter;
                const matchesStatus = pendingStatusFilter === "all" ||
                  (pendingStatusFilter === "locked" && survey.isLocked) ||
                  (pendingStatusFilter === "unlocked" && !survey.isLocked);
                return matchesFacility && matchesTemplate && matchesStatus;
              });
              return [dateKey, { ...dateGroup, surveys: filteredSurveys }];
            })
            .filter((entry): entry is [string, { surveys: any[]; date: string; totalTemplates: number; completedSurveys: number; pocCount: number; }] => {
              const [_, dateGroup] = entry;
              return typeof dateGroup !== 'string' && dateGroup.surveys.length > 0;
            })
        )
      }))
      .filter(group => group.dates.size > 0);
  }, [groupedSurveys.pending, pendingFacilityFilter, pendingTemplateFilter, pendingStatusFilter]);



  // Build facility options for filters
  const facilityOptions = React.useMemo(() => {
    const allFacilities = [...groupedSurveys.closed, ...groupedSurveys.pending];
    const uniqueFacilities = new Map();

    allFacilities.forEach(group => {
      if (!uniqueFacilities.has(group.facilityId)) {
        uniqueFacilities.set(group.facilityId, {
          id: group.facilityId,
          name: group.facilityName
        });
      }
    });

    return Array.from(uniqueFacilities.values());
  }, [groupedSurveys]);

  const templateOptions = React.useMemo(() => {
    const allSurveys = [...surveys.data ?? []];
    const uniqueTemplates = new Map();
    allSurveys.forEach(survey => {
      if (survey.template && survey.templateId) {
        uniqueTemplates.set(survey.templateId, {
          id: survey.templateId,
          name: survey.template.name || `Template ${survey.templateId}`
        });
      }
    });
    return Array.from(uniqueTemplates.values());
  }, [surveys.data]);


  // Clear all filters
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


  // Check if any filters are active
  const hasActiveFilters = selectedDate || dateSortOrder ||
    closedFacilityFilter !== "all" || pendingFacilityFilter !== "all" ||
    closedTemplateFilter !== "all" || pendingTemplateFilter !== "all" ||
    closedStatusFilter !== "all" || pendingStatusFilter !== "all";


  // Helper function to get POC status - USES survey_poc table for display status
  // Helper function to get POC status - USES survey_poc table for display status
  const getPocStatus = (survey: any, scoreData: { score: number; totalPossible: number } | undefined, sectionType: 'completed' | 'pending' = 'completed') => {
    // ONLY for pending section, check if survey is locked or not
    if (sectionType === 'pending') {
      if (survey.isLocked) {
        return {
          status: "Survey Locked",
          variant: "secondary" as const,
          className: "bg-gray-100 text-gray-800"
        };
      } else {
        return {
          status: "Survey In Process",
          variant: "secondary" as const,
          className: "bg-blue-100 text-blue-800"
        };
      }
    }

    // KEEP ALL ORIGINAL LOGIC FOR COMPLETED SECTION
    if (!survey.isLocked) {
      const isCompleted = survey.responses && survey.responses.length > 0;
      return {
        status: isCompleted ? "In Progress" : "POC Not Started",
        variant: "secondary" as const,
        className: isCompleted ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-800"
      };
    }

    const scorePercentage = scoreData && scoreData.totalPossible > 0
      ? Math.round((scoreData.score / scoreData.totalPossible) * 100)
      : 0;

    // If score >= 85%, no POC required
    if (scorePercentage >= 85) {
      return {
        status: "No POC Required",
        variant: "secondary" as const,
        className: "bg-green-100 text-green-800"
      };
    }

    // If score < 85%, check if actual POC exists in survey_poc table (for display only)
    const pocExists = surveyPocExists.get(survey.id) || false;
    if (pocExists) {
      return {
        status: "POC Completed",
        variant: "default" as const,
        className: "bg-blue-100 text-blue-800"
      };
    } else {
      return {
        status: "POC Pending",
        variant: "secondary" as const,
        className: "bg-amber-100 text-amber-800"
      };
    }
  };


  // SIMPLIFIED: Clean hierarchical row components
  const FacilityGroupRow = ({
    group,
    type,
    isExpanded,
    onToggle
  }: {
    group: GroupedSurvey;
    type: 'closed' | 'pending';
    isExpanded: boolean;
    onToggle: () => void;
  }) => (
    <>
      {/* LEVEL 1: FACILITY ROW - Simple and Clean */}
      <TableRow
        className="bg-muted/50 hover:bg-muted/70 cursor-pointer font-medium"
        onClick={onToggle}
      >
        <TableCell className="text-right font-mono">
          <Button variant="ghost" size="sm" className="p-0 h-auto">
            {isExpanded ? <ChevronDownIcon className="h-4 w-4" /> : <ChevronRightIcon className="h-4 w-4" />}
          </Button>
        </TableCell>
        <TableCell colSpan={3}>
          <div className="flex items-center gap-2">
            🏢 {group.facility && <FacilityHoverCard facility={group.facility} />}
            <Badge variant="outline" className="ml-2">
              {group.totalTemplates} template{group.totalTemplates !== 1 ? 's' : ''}
            </Badge>
          </div>
        </TableCell>
        <TableCell></TableCell>
        <TableCell>-</TableCell>
        <TableCell className="text-right">
          <Badge variant="outline">
            {isExpanded ? 'Collapse' : 'Expand'}
          </Badge>
        </TableCell>
      </TableRow>

      {/* LEVEL 2: DATE GROUPS - Slightly Indented */}
      {isExpanded && Array.from(group.dates.entries()).map(([dateKey, dateGroup]) => {
        const expandKey = `${group.facilityId}-${dateKey}`;
        const isDateExpanded = type === 'closed'
          ? expandedClosedDates.has(expandKey)
          : expandedPendingDates.has(expandKey);

        return (
          <React.Fragment key={dateKey}>
            <TableRow
              className="bg-muted/30 hover:bg-muted/50 cursor-pointer"
              onClick={() => toggleDateExpanded(group.facilityId, dateKey, type)}
            >
              <TableCell className="text-right font-mono pl-8">
                <Button variant="ghost" size="sm" className="p-0 h-auto">
                  {isDateExpanded ? <ChevronDownIcon className="h-4 w-4" /> : <ChevronRightIcon className="h-4 w-4" />}
                </Button>
              </TableCell>
              <TableCell colSpan={2}>
                <div className="flex items-center gap-2">
                  📅 <Badge variant="secondary">{dateKey}</Badge>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="text-xs">
                  {dateGroup.surveys.length} template{dateGroup.surveys.length !== 1 ? 's' : ''}
                </Badge>
              </TableCell>
              <TableCell></TableCell>
              <TableCell>-</TableCell>
              <TableCell className="text-right">
                <Badge variant="outline" className="text-xs">
                  {isDateExpanded ? 'Collapse' : 'Expand'}
                </Badge>
              </TableCell>
            </TableRow>

            {/* LEVEL 3: SURVEY ROWS - More Indented */}
            {isDateExpanded && dateGroup.surveys.map((survey) => {
              const scoreData = surveyScores.get(survey.id);
              const scorePercentage = scoreData && scoreData.totalPossible > 0
                ? Math.round((scoreData.score / scoreData.totalPossible) * 100)
                : 0;
              const pocStatus = getPocStatus(survey, scoreData, type === 'pending' ? 'pending' : 'completed');

              return (
                <TableRow key={`${type}-survey-${survey.id}`} className="bg-background">
                  <TableCell className="text-right font-mono tabular-nums pl-12">
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
                          <Badge variant="outline" className="text-xs">{survey.surveyor.email}</Badge>
                        </>
                      ) : (
                        "-"
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {survey.template && <TemplateHoverCard template={survey.template} />}
                  </TableCell>
                  <TableCell>
                    <Badge variant={pocStatus.variant} className={pocStatus.className}>
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
                              scorePercentage >= 80 ? "bg-green-100 text-green-800 border-green-300" :
                                scorePercentage >= 60 ? "bg-yellow-100 text-yellow-800 border-yellow-300" :
                                  "bg-red-100 text-red-800 border-red-300"
                            )}
                          >
                            {scoreData.score}/{scoreData.totalPossible}
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
                      className={cn(buttonVariants({ variant: "outline", size: "icon" }), "size-6")}
                    >
                      <ExternalLinkIcon className="h-3 w-3" />
                    </Link>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="ml-2 h-6 w-6 text-destructive hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSurveyToDelete({
                              id: survey.id,
                              name: survey.template?.name ?? `Survey ${survey.id}`,
                            });
                          }}
                          disabled={deleteSurvey.isPending}
                        >
                          <TrashIcon className="h-4 w-4" />
                          <span className="sr-only">Delete survey</span>
                        </Button>
                      </AlertDialogTrigger>

                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Template</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete the template "
                            {surveyToDelete?.id === survey.id ? surveyToDelete?.id : survey.template?.name ?? `Survey ${survey.id}`}
                            "? This action cannot be undone and will delete all associated data.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel
                            onClick={() => setSurveyToDelete(null)}
                            disabled={deleteSurvey.isPending}
                          >
                            Cancel
                          </AlertDialogCancel>
                          <AlertDialogAction
                            className="px-4 py-2 rounded-lg bg-destructive text-white hover:bg-red-700 active:bg-red-800 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors duration-150"
                            onClick={() => {
                              setSurveyToDelete(null);
                              deleteSurvey.mutate({ id: survey.id });
                            }}
                            disabled={deleteSurvey.isPending}
                          >
                            {deleteSurvey.isPending ? "Deleting..." : "Delete"}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              );
            })}
          </React.Fragment>
        );
      })}
    </>
  );

  return (
    <>
      <QISVHeader crumbs={[{ label: "Surveys" }]} />

      <main className="px-4 py-6">
        {hasViewSurveyPermission.data && (
          <>
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Surveys</h1>
                <p className="text-muted-foreground">Manage surveys by facility</p>
              </div>

              {hasNewSurveyPermission.data && (
                <Link href={`/qisv/surveys/new`} className={cn(buttonVariants())}>
                  <PlusIcon className="mr-2 h-4 w-4" /> Create Survey
                </Link>
              )}
            </div>

            {/* Global Filters */}
            <div className="mb-6 rounded-lg border bg-muted/30 p-4">
              <div className="flex items-center justify-between mb-3">
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
                {/* Date Picker */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground">Date:</span>
                  <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "h-8 justify-start text-left font-normal",
                          !selectedDate && "text-muted-foreground",
                          selectedDate && "bg-primary/10 border-primary/20"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-3 w-3" />
                        {selectedDate ? format(selectedDate, "MMM dd, yyyy") : "Select date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={(date) => {
                          console.log('Date selected:', date, 'formatted as:', date ? format(date, "yyyy-MM-dd") : null);
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

                {/* Date Sort */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground">Sort:</span>
                  <div className="flex rounded-md border">
                    <Button
                      variant={dateSortOrder === "asc" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setDateSortOrder(dateSortOrder === "asc" ? null : "asc")}
                      className="h-8 rounded-r-none border-r"
                    >
                      <ArrowUpIcon className="h-3 w-3" />
                      Oldest
                    </Button>
                    <Button
                      variant={dateSortOrder === "desc" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setDateSortOrder(dateSortOrder === "desc" ? null : "desc")}
                      className="h-8 rounded-l-none"
                    >
                      <ArrowDownIcon className="h-3 w-3" />
                      Newest
                    </Button>
                  </div>
                </div>

                {/* Active Filter Indicators */}
                {selectedDate && (
                  <Badge variant="secondary" className="bg-primary/10 text-primary">
                    Date: {format(selectedDate, "MMM dd, yyyy")}
                  </Badge>
                )}
                {dateSortOrder && (
                  <Badge variant="secondary" className="bg-primary/10 text-primary">
                    Sort: {dateSortOrder === "asc" ? "Oldest First" : "Newest First"}
                  </Badge>
                )}
              </div>
            </div>

            {/* Completed Surveys */}
            <div className="mb-8 rounded-lg border border-green-200 bg-green-50/30">
              <div className="flex items-center justify-between p-4 border-b border-green-200 bg-green-100/50">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-green-500"></div>
                  <span className="font-semibold text-green-800">Completed Surveys</span>
                  <Badge variant="secondary" className="bg-green-200 text-green-800">
                    {filteredClosedGroups.length} facilit{filteredClosedGroups.length !== 1 ? 'ies' : 'y'}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Select value={closedFacilityFilter} onValueChange={setClosedFacilityFilter}>
                    <SelectTrigger className="h-8 w-36 bg-white">
                      <SelectValue placeholder="All Facilities" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Facilities</SelectItem>
                      {facilityOptions.map((f) => (
                        <SelectItem key={f.id} value={String(f.id)}>{f.name}</SelectItem>
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


                  <Select value={closedStatusFilter} onValueChange={setClosedStatusFilter}>
                    <SelectTrigger className="h-8 w-32 bg-white">
                      <SelectValue placeholder="POC Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="poc-completed">POC Completed</SelectItem>
                      <SelectItem value="poc-pending">POC Pending</SelectItem>
                    </SelectContent>
                  </Select>

                </div>

              </div>

              <Table>
                <TableHeader>
                  <TableRow className="bg-green-100 hover:bg-green-100">
                    <TableHead className="w-[80px] text-right text-green-800">System ID</TableHead>
                    <TableHead className="text-green-800">Date</TableHead>
                    <TableHead className="text-green-800">Surveyor</TableHead>
                    <TableHead className="text-green-800">Template</TableHead>
                    <TableHead className="text-green-800">Status</TableHead>
                    <TableHead className="text-green-800 text-center">Score</TableHead>
                    <TableHead className="text-right text-green-800">Action</TableHead>
                  </TableRow>
                </TableHeader>
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
                      <TableCell colSpan={7} className="text-muted-foreground py-8 text-center">
                        {hasActiveFilters ? "No completed surveys found with current filters." : "No completed surveys found."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredClosedGroups.map((group) => (
                      <FacilityGroupRow
                        key={`closed-group-${group.facilityId}`}
                        group={group}
                        type="closed"
                        isExpanded={expandedClosedFacilities.has(group.facilityId)}
                        onToggle={() => toggleFacilityExpanded(group.facilityId, 'closed')}
                      />
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pending Surveys */}
            <div className="mb-8 rounded-lg border border-amber-200 bg-amber-50/30">
              <div className="flex items-center justify-between p-4 border-b border-amber-200 bg-amber-100/50">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-amber-500"></div>
                  <span className="font-semibold text-amber-800">Pending Surveys</span>
                  <Badge variant="secondary" className="bg-amber-200 text-amber-800">
                    {filteredPendingGroups.length} facilit{filteredPendingGroups.length !== 1 ? 'ies' : 'y'}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Select value={pendingFacilityFilter} onValueChange={setPendingFacilityFilter}>
                    <SelectTrigger className="h-8 w-36 bg-white">
                      <SelectValue placeholder="All Facilities" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Facilities</SelectItem>
                      {facilityOptions.map((f) => (
                        <SelectItem key={f.id} value={String(f.id)}>{f.name}</SelectItem>
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



                  <Select value={pendingStatusFilter} onValueChange={setPendingStatusFilter}>
                    <SelectTrigger className="h-8 w-28 bg-white">
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="locked">Locked</SelectItem>
                      <SelectItem value="unlocked">Unlocked</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

              </div>

              <Table>
                <TableHeader>
                  <TableRow className="bg-amber-100 hover:bg-amber-100">
                    <TableHead className="w-[80px] text-right text-amber-800">System ID</TableHead>
                    <TableHead className="text-amber-800">Date</TableHead>
                    <TableHead className="text-amber-800">Surveyor</TableHead>
                    <TableHead className="text-amber-800">Template</TableHead>
                    <TableHead className="text-amber-800">Status</TableHead>
                    <TableHead className="text-amber-800 text-center">Score</TableHead>
                    <TableHead className="text-right text-amber-800">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
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
                      <TableCell colSpan={7} className="text-muted-foreground py-8 text-center">
                        {hasActiveFilters ? "No pending surveys found with current filters." : "No pending surveys found."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredPendingGroups.map((group) => (
                      <FacilityGroupRow
                        key={`pending-group-${group.facilityId}`}
                        group={group}
                        type="pending"
                        isExpanded={expandedPendingFacilities.has(group.facilityId)}
                        onToggle={() => toggleFacilityExpanded(group.facilityId, 'pending')}
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
