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


  // State to store POC status for each survey
  const [surveyPocStatus, setSurveyPocStatus] = React.useState<Map<number, boolean>>(new Map());


  // DELETE FUNCTIONALITY - ADDED ONLY THIS
  const [surveyToDelete, setSurveyToDelete] = useState<{ id: number; name: string } | null>(null);


  // Fetch POC status for all surveys
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!surveys.data || surveys.data.length === 0) return;


      try {
        const pocStatusMap = new Map<number, boolean>();
        
        // Check each survey for POC existence
        await Promise.all(
          surveys.data.map(async (survey) => {
            try {
              // Use the utils to fetch POC data for this survey and template
              const residents = await utils.survey.listResidents.fetch({ surveyId: survey.id });
              if (!residents || residents.length === 0) {
                pocStatusMap.set(survey.id, false);
                return;
              }


              // Check if any resident has POC for this survey/template combination
              const pocResults = await Promise.all(
                residents.map(r => utils.poc.list.fetch({ surveyId: survey.id, residentId: r.residentId }))
              );


              let hasPOC = false;
              outer: for (const pocRows of pocResults) {
                for (const pocRow of pocRows ?? []) {
                  if (pocRow.pocText && pocRow.pocText.trim() && pocRow.templateId === survey.templateId) {
                    hasPOC = true;
                    break outer;
                  }
                }
              }


              pocStatusMap.set(survey.id, hasPOC);
            } catch (error) {
              console.error(`Failed to check POC for survey ${survey.id}:`, error);
              pocStatusMap.set(survey.id, false);
            }
          })
        );


        if (!cancelled) {
          setSurveyPocStatus(pocStatusMap);
        }
      } catch (error) {
        console.error("Failed to fetch POC status:", error);
      }
    })();


    return () => {
      cancelled = true;
    };
  }, [surveys.data]);


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


  // Access utils for POC fetching
  const utils = api.useUtils();


  // DELETE FUNCTIONALITY - ADDED ONLY THIS
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


  // Group surveys by facility with date filtering
  const groupedSurveys = React.useMemo(() => {
    if (!surveys.data) return { closed: [], pending: [] };


    const closedSurveys = filterAndSortSurveys(surveys.data.filter(s => s.isLocked));
    const pendingSurveys = filterAndSortSurveys(surveys.data.filter(s => !s.isLocked));


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


        // Calculate completion for pending surveys
        if (!survey.isLocked) {
          const isCompleted = survey.responses && survey.responses.length > 0;
          if (isCompleted) group.completedSurveys++;
        }


        // Calculate POC count for closed surveys - check if survey has POC in our status map
        if (survey.isLocked) {
          const hasPOC = surveyPocStatus.get(survey.id) || false;
          if (hasPOC) group.pocCount++;
        }
      });


      return Array.from(facilityMap.values());
    };


    return {
      closed: groupByFacility(closedSurveys),
      pending: groupByFacility(pendingSurveys),
    };
  }, [surveys.data, filterAndSortSurveys, surveyPocStatus]);


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
              {group.surveys.length} template{group.surveys.length !== 1 ? 's' : ''}
            </Badge>
          </div>
        </TableCell>
        <TableCell>
          {type === 'closed' ? (
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              POC: {group.pocCount}/{group.totalTemplates}
            </Badge>
          ) : (
            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
              Completed: {group.completedSurveys}/{group.totalTemplates}
            </Badge>
          )}
        </TableCell>
        <TableCell className="text-right">
          <Badge variant="outline">
            {isExpanded ? 'Collapse' : 'Expand'}
          </Badge>
        </TableCell>
      </TableRow>
      
      {isExpanded && group.surveys.map((survey) => {
        const surveyDate = survey.surveyDate ? new Date(survey.surveyDate) : null;
        const formattedDate = surveyDate && !isNaN(surveyDate.getTime()) ? format(surveyDate, "yyyy-MM-dd") : "No date";
        
        // Check POC status for individual survey from our status map
        const hasPOC = surveyPocStatus.get(survey.id) || false;
        
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
              {type === 'closed' ? (
                <Badge variant={hasPOC ? "default" : "secondary"}>
                  {hasPOC ? "POC Generated" : "No POC"}
                </Badge>
              ) : (
                <Badge variant={survey.isCompleted ? "default" : "secondary"}>
                  {survey.isCompleted ? "Completed" : "In Progress"}
                </Badge>
              )}
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


            {/* Completed Surveys (Locked) */}
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
                    <TableHead className="w-[80px] text-right text-green-800">ID</TableHead>
                    <TableHead className="text-green-800">Date</TableHead>
                    <TableHead className="text-green-800">Surveyor</TableHead>
                    <TableHead className="text-green-800">Template</TableHead>
                    <TableHead className="text-green-800">POC Status</TableHead>
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
                        {Array.from({ length: 5 }).map((_, j) => (
                          <TableCell key={`closed-skel-cell-${i}-${j}`}>
                            <Skeleton className="h-6" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : filteredClosedGroups.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-muted-foreground py-8 text-center">
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


            {/* Pending Surveys (Unlocked) */}
            <div className="mb-8 rounded-lg border border-blue-200 bg-blue-50/30">
              <div className="flex items-center justify-between p-4 border-b border-blue-200 bg-blue-100/50">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-blue-500"></div>
                  <span className="font-semibold text-blue-800">Pending Surveys</span>
                  <Badge variant="secondary" className="bg-blue-200 text-blue-800">
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
                  <TableRow className="bg-blue-100 hover:bg-blue-100">
                    <TableHead className="w-[80px] text-right text-blue-800">ID</TableHead>
                    <TableHead className="text-blue-800">Date</TableHead>
                    <TableHead className="text-blue-800">Surveyor</TableHead>
                    <TableHead className="text-blue-800">Template</TableHead>
                    <TableHead className="text-blue-800">Progress</TableHead>
                    <TableHead className="text-right text-blue-800">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {surveys.isPending ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <TableRow key={`pending-skel-${i}`}>
                        <TableCell className="text-right">
                          <Skeleton className="ml-auto h-6 w-10" />
                        </TableCell>
                        {Array.from({ length: 5 }).map((_, j) => (
                          <TableCell key={`pending-skel-cell-${i}-${j}`}>
                            <Skeleton className="h-6" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : filteredPendingGroups.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-muted-foreground py-8 text-center">
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
