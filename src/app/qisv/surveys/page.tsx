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

const PAGE_SIZES = [10, 50, 100];

type GroupedSurvey = {
  facilityId: number;
  facilityName: string;
  facility: any;
  surveys: any[];
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

  // Expanded states for facility groups
  const [expandedClosed, setExpandedClosed] = React.useState<Set<number>>(new Set());
  const [expandedPending, setExpandedPending] = React.useState<Set<number>>(new Set());

  // State to store survey scores
  const [surveyScores, setSurveyScores] = React.useState<Map<number, { score: number; totalPossible: number }>>(new Map());

  // DELETE FUNCTIONALITY
  const [surveyToDelete, setSurveyToDelete] = useState<{ id: number; name: string } | null>(null);

  // Access utils for API calls
  const utils = api.useUtils();

  // Fetch survey scores using the EXACT same logic as the detail page
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!surveys.data || surveys.data.length === 0) return;

      try {
        const scoresMap = new Map<number, { score: number; totalPossible: number }>();
        
        // Calculate score for each survey using the EXACT same logic
        await Promise.all(
          surveys.data.map(async (survey) => {
            try {
              // Get residents and questions
              const residents = await utils.survey.listResidents.fetch({ surveyId: survey.id });
              const questions = await utils.question.list.fetch({ templateId: survey.templateId });

              if (!residents || !questions || residents.length === 0 || questions.length === 0) {
                scoresMap.set(survey.id, { score: 0, totalPossible: 0 });
                return;
              }

              // Fetch all responses for this survey (same as detail page)
              const allResponses: Array<{ residentId: number; questionId: number; status: string | null; findings: string | null }> = [];
              
              await Promise.all(
                residents.map(async (r) => {
                  const rows = await utils.survey.listResponses.fetch({ surveyId: survey.id, residentId: r.residentId });
                  for (const rr of rows ?? []) {
                    allResponses.push({
                      residentId: r.residentId,
                      questionId: rr.questionId,
                      status: rr.requirementsMetOrUnmet ?? null,
                      findings: rr.findings ?? null,
                    });
                  }
                })
              );

              // Create byResident map (same as detail page)
              const byResident = new Map<number, Map<number, { status: string | null; findings: string | null }>>();
              for (const r of allResponses) {
                const inner = byResident.get(r.residentId) ?? new Map();
                inner.set(r.questionId, { status: r.status, findings: r.findings });
                byResident.set(r.residentId, inner);
              }

              // Score calculation - EXACT same logic as detail page
              let awarded = 0;
              for (const q of questions) {
                let anyUnmetOrUnanswered = false;
                let anyMet = false;
                
                for (const r of residents) {
                  const cell = byResident.get(r.residentId)?.get(q.id);
                  if (!cell?.status) {
                    anyUnmetOrUnanswered = true;
                    break;
                  }
                  if (cell.status === "unmet") {
                    anyUnmetOrUnanswered = true;
                    break;
                  }
                  if (cell.status === "met") anyMet = true;
                }
                
                // Award points only if no unmet/unanswered AND at least one met
                if (!anyUnmetOrUnanswered && anyMet) {
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

  // UPDATED: Helper function to determine survey category
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
    return (scorePercentage >= 75 || survey.pocGenerated) ? 'completed' : 'pending';
  };

  // UPDATED: Group surveys by facility with MIXED GROUPING LOGIC
  const groupedSurveys = React.useMemo(() => {
    if (!surveys.data) return { closed: [], pending: [] };

    // Apply date filters to all surveys first
    const filteredSurveys = filterAndSortSurveys(surveys.data);

    // Separate into completed and pending based on the new logic
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
    console.log('Survey categorization:', {
      total: filteredSurveys.length,
      completed: completedSurveys.length,
      pending: pendingSurveys.length,
      completedSurveys: completedSurveys.map(s => ({ id: s.id, isLocked: s.isLocked, pocGenerated: s.pocGenerated })),
      pendingSurveys: pendingSurveys.map(s => ({ id: s.id, isLocked: s.isLocked, pocGenerated: s.pocGenerated }))
    });

    const groupByFacility = (surveyList: any[]) => {
      const facilityMap = new Map<number, GroupedSurvey>();

      surveyList.forEach((survey) => {
        const facilityId = survey.facilityId;
        const facilityName = survey.facility?.name || `Facility ${facilityId}`;

        if (!facilityMap.has(facilityId)) {
          facilityMap.set(facilityId, {
            facilityId,
            facilityName,
            facility: survey.facility,
            surveys: [],
            totalTemplates: 0,
            completedSurveys: 0,
            pocCount: 0,
          });
        }

        const group = facilityMap.get(facilityId)!;
        group.surveys.push(survey);
        group.totalTemplates++;

        // Count completion based on survey type
        if (survey.isLocked) {
          const scoreData = surveyScores.get(survey.id);
          const scorePercentage = scoreData && scoreData.totalPossible > 0 
            ? Math.round((scoreData.score / scoreData.totalPossible) * 100)
            : 0;

          if (scorePercentage >= 75) {
            group.completedSurveys++; // High score surveys
          } else if (survey.pocGenerated) {
            group.pocCount++; // Low score but POC completed
          }
        } else {
          // For unlocked surveys, check if they have responses
          const isCompleted = survey.responses && survey.responses.length > 0;
          if (isCompleted) group.completedSurveys++;
        }
      });

      return Array.from(facilityMap.values());
    };

    return {
      closed: groupByFacility(completedSurveys), // "Completed" surveys
      pending: groupByFacility(pendingSurveys),   // "Pending" surveys
    };
  }, [surveys.data, filterAndSortSurveys, surveyScores]);

  const toggleExpanded = (facilityId: number, type: 'closed' | 'pending') => {
    if (type === 'closed') {
      const newExpanded = new Set(expandedClosed);
      if (newExpanded.has(facilityId)) {
        newExpanded.delete(facilityId);
      } else {
        newExpanded.add(facilityId);
      }
      setExpandedClosed(newExpanded);
    } else {
      const newExpanded = new Set(expandedPending);
      if (newExpanded.has(facilityId)) {
        newExpanded.delete(facilityId);
      } else {
        newExpanded.add(facilityId);
      }
      setExpandedPending(newExpanded);
    }
  };

  // Filter groups
  const filteredClosedGroups = React.useMemo(() => {
    return groupedSurveys.closed.filter(group => 
      closedFacilityFilter === "all" || String(group.facilityId) === closedFacilityFilter
    );
  }, [groupedSurveys.closed, closedFacilityFilter]);

  const filteredPendingGroups = React.useMemo(() => {
    return groupedSurveys.pending.filter(group => 
      pendingFacilityFilter === "all" || String(group.facilityId) === pendingFacilityFilter
    );
  }, [groupedSurveys.pending, pendingFacilityFilter]);

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

  // Clear all filters
  const clearAllFilters = () => {
    setSelectedDate(undefined);
    setDateSortOrder(null);
    setClosedFacilityFilter("all");
    setPendingFacilityFilter("all");
  };

  // Check if any filters are active
  const hasActiveFilters = selectedDate || dateSortOrder || closedFacilityFilter !== "all" || pendingFacilityFilter !== "all";

  // Helper function to get POC status based on score
  const getPocStatus = (survey: any, scoreData: { score: number; totalPossible: number } | undefined) => {
    // For unlocked surveys
    if (!survey.isLocked) {
      const isCompleted = survey.responses && survey.responses.length > 0;
      return {
        status: isCompleted ? "In Progress" : "Not Started",
        variant: "secondary" as const,
        className: isCompleted ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-800"
      };
    }

    // For locked surveys
    const scorePercentage = scoreData && scoreData.totalPossible > 0 
      ? Math.round((scoreData.score / scoreData.totalPossible) * 100)
      : 0;

    // If score >= 75%, no POC required
    if (scorePercentage >= 75) {
      return {
        status: "No POC Required",
        variant: "secondary" as const,
        className: "bg-green-100 text-green-800"
      };
    }

    // If score < 75%, check pocGenerated flag
    if (survey.pocGenerated) {
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
            {group.facility && <FacilityHoverCard facility={group.facility} />}
            <Badge variant="outline" className="ml-2">
              {group.surveys.length} survey{group.surveys.length !== 1 ? 's' : ''}
            </Badge>
          </div>
        </TableCell>
        <TableCell>
          
        </TableCell>
        <TableCell>-</TableCell> {/* Score column for group row */}
        <TableCell className="text-right">
          <Badge variant="outline">
            {isExpanded ? 'Collapse' : 'Expand'}
          </Badge>
        </TableCell>
      </TableRow>
      
      {isExpanded && group.surveys.map((survey) => {
        const surveyDate = survey.surveyDate ? new Date(survey.surveyDate) : null;
        const formattedDate = surveyDate && !isNaN(surveyDate.getTime()) ? format(surveyDate, "yyyy-MM-dd") : "No date";
        
        // Get survey score
        const scoreData = surveyScores.get(survey.id);
        const scorePercentage = scoreData && scoreData.totalPossible > 0 
          ? Math.round((scoreData.score / scoreData.totalPossible) * 100)
          : 0;

        // Get POC status based on score and pocGenerated flag
        const pocStatus = getPocStatus(survey, scoreData);
        
        return (
          <TableRow key={`${type}-survey-${survey.id}`} className="bg-background">
            <TableCell className="text-right font-mono tabular-nums pl-8">
              {survey.id}
            </TableCell>
            <TableCell>
              <Badge variant="secondary">{formattedDate}</Badge>
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
                    <AlertDialogTitle>Delete Survey</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete the survey "
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
                    <SelectTrigger className="h-8 w-44 bg-white">
                      <SelectValue placeholder="Filter by facility" />
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
                        isExpanded={expandedClosed.has(group.facilityId)}
                        onToggle={() => toggleExpanded(group.facilityId, 'closed')}
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
                    <SelectTrigger className="h-8 w-44 bg-white">
                      <SelectValue placeholder="Filter by facility" />
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
                        isExpanded={expandedPending.has(group.facilityId)}
                        onToggle={() => toggleExpanded(group.facilityId, 'pending')}
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
