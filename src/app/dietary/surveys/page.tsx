"use client";

import { api } from "@/trpc/react";
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
  ChefHat,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";

type DateGroup = {
  date: string;
  surveys: any[];
  totalTemplates: number;
};

type GroupedSurvey = {
  facilityId: number;
  facilityName: string;
  facility: any;
  dates: Map<string, DateGroup>;
  totalTemplates: number;
};

type DateSortOrder = "asc" | "desc" | null;

export default function DietarySurveysPage() {
  const router = useRouter();

  // Filters
  const [closedFacilityFilter, setClosedFacilityFilter] = useState<string>("all");
  const [pendingFacilityFilter, setPendingFacilityFilter] = useState<string>("all");
  const [closedTemplateFilter, setClosedTemplateFilter] = useState<string>("all");
  const [pendingTemplateFilter, setPendingTemplateFilter] = useState<string>("all");
  const [closedStatusFilter, setClosedStatusFilter] = useState<string>("all");
  const [pendingStatusFilter, setPendingStatusFilter] = useState<string>("all");

  // Date filtering states
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [dateSortOrder, setDateSortOrder] = useState<DateSortOrder>(null);
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);

  // Expanded states for facility and date groups
  const [expandedClosedFacilities, setExpandedClosedFacilities] = useState<Set<number>>(
    new Set()
  );
  const [expandedPendingFacilities, setExpandedPendingFacilities] = useState<Set<number>>(
    new Set()
  );
  const [expandedClosedDates, setExpandedClosedDates] = useState<Set<string>>(new Set());
  const [expandedPendingDates, setExpandedPendingDates] = useState<Set<string>>(new Set());

  // DELETE FUNCTIONALITY
  const [surveyToDelete, setSurveyToDelete] = useState<{ id: number; name: string } | null>(
    null
  );

  // New survey dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedFacility, setSelectedFacility] = useState<string>("");
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [selectedCreateDate, setSelectedCreateDate] = useState<Date | undefined>(new Date());

  // Fetch surveys
  const surveys = api.dietary.list.useQuery({
    page: 1,
    pageSize: 100,
  });

  // Fetch facilities and templates
  const facilities = api.facility.list.useQuery({ page: 1, pageSize: 100 });
  const templates = api.dietary.listTemplates.useQuery({ page: 1, pageSize: 100 });

  // Mutations
  const utils = api.useUtils();

  const createSurvey = api.dietary.create.useMutation({
    onSuccess: (data) => {
      toast.success("Survey created successfully");
      void utils.dietary.list.invalidate();
      setCreateDialogOpen(false);
      setSelectedFacility("");
      setSelectedTemplate("");
      setSelectedCreateDate(new Date());
      if (data) {
        router.push(`/dietary/surveys/${data.id}`);
      }
    },
    onError: (error) => {
      toast.error(error.message ?? "Failed to create survey");
    },
  });

  const deleteSurvey = api.dietary.delete.useMutation({
    onSuccess: () => {
      toast.success("Survey deleted successfully");
      void utils.dietary.list.invalidate();
      setSurveyToDelete(null);
    },
    onError: (error) => {
      toast.error(`Failed to delete survey: ${error.message}`);
      setSurveyToDelete(null);
    },
  });

  const handleCreateSurvey = () => {
    if (!selectedFacility || !selectedTemplate || !selectedCreateDate) {
      toast.error("Please fill all fields");
      return;
    }

    createSurvey.mutate({
      facilityId: Number(selectedFacility),
      templateId: Number(selectedTemplate),
      surveyDate: selectedCreateDate,
    });
  };

  const doesDateMatch = (
    surveyDate: string | Date | null | undefined,
    selectedDate: Date
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
    [selectedDate, dateSortOrder]
  );

  const groupedSurveys = React.useMemo(() => {
    if (!surveys.data) return { closed: [], pending: [] };

    const filteredSurveys = filterAndSortSurveys(surveys.data);

    const completedSurveys: any[] = [];
    const pendingSurveys: any[] = [];

    filteredSurveys.forEach((survey) => {
      if (survey.isLocked) {
        completedSurveys.push(survey);
      } else {
        pendingSurveys.push(survey);
      }
    });

    const groupByFacilityAndDate = (surveyList: any[]): GroupedSurvey[] => {
      const facilityMap = new Map<number, GroupedSurvey>();

      surveyList.forEach((survey) => {
        const facilityId = survey.facilityId;
        const facilityName = survey.facility?.name || `Facility ${facilityId}`;
        const surveyDate = survey.surveyDate ? new Date(survey.surveyDate) : null;
        const dateKey =
          surveyDate && !isNaN(surveyDate.getTime())
            ? format(surveyDate, "yyyy-MM-dd")
            : "No date";

        if (!facilityMap.has(facilityId)) {
          facilityMap.set(facilityId, {
            facilityId,
            facilityName,
            facility: survey.facility,
            dates: new Map<string, DateGroup>(),
            totalTemplates: 0,
          });
        }

        const facilityGroup = facilityMap.get(facilityId)!;

        if (!facilityGroup.dates.has(dateKey)) {
          facilityGroup.dates.set(dateKey, {
            date: dateKey,
            surveys: [],
            totalTemplates: 0,
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
  }, [surveys.data, filterAndSortSurveys]);

  const toggleFacilityExpanded = (facilityId: number, type: "closed" | "pending") => {
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
    type: "closed" | "pending"
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
            .map(([dateKey, dateGroup]) => {
              const filteredSurveys = dateGroup.surveys.filter((survey) => {
                const matchesFacility =
                  closedFacilityFilter === "all" ||
                  String(group.facilityId) === closedFacilityFilter;
                const matchesTemplate =
                  closedTemplateFilter === "all" ||
                  String(survey.templateId) === closedTemplateFilter;
                const matchesStatus = closedStatusFilter === "all";

                return matchesFacility && matchesTemplate && matchesStatus;
              });

              return [
                dateKey,
                { ...dateGroup, surveys: filteredSurveys },
              ] as [string, DateGroup];
            })
            .filter(([_, dateGroup]) => dateGroup.surveys.length > 0)
        ),
      }))
      .filter((group) => group.dates.size > 0);
  }, [
    groupedSurveys.closed,
    closedFacilityFilter,
    closedTemplateFilter,
    closedStatusFilter,
  ]);

  const filteredPendingGroups = React.useMemo(() => {
    return groupedSurveys.pending
      .map((group) => ({
        ...group,
        dates: new Map(
          Array.from(group.dates.entries())
            .map(([dateKey, dateGroup]) => {
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

              return [
                dateKey,
                { ...dateGroup, surveys: filteredSurveys },
              ] as [string, DateGroup];
            })
            .filter(([_, dateGroup]) => dateGroup.surveys.length > 0)
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
        <TableCell className="text-center font-mono pl-0">
          <Button variant="ghost" size="sm" className="p-0 h-auto">
            {isExpanded ? (
              <ChevronDownIcon className="h-4 w-4" />
            ) : (
              <ChevronRightIcon className="h-4 w-4" />
            )}
          </Button>
        </TableCell>
        <TableCell colSpan={3}>
          <div className="flex items-center gap-2">
            🏢 <span className="font-medium">{group.facilityName}</span>
            <Badge variant="outline" className="ml-2">
              {group.totalTemplates} template{group.totalTemplates !== 1 ? "s" : ""}
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
                onClick={() => toggleDateExpanded(group.facilityId, dateKey, type)}
              >
                <TableCell className="text-center font-mono pl-0">
                  <Button variant="ghost" size="sm" className="p-0 h-auto">
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
                  <Badge
                    className={cn(
                      type === "pending"
                        ? "bg-yellow-100 text-yellow-800 border-yellow-300"
                        : "bg-green-100 text-green-800 border-green-300"
                    )}
                  >
                    {dateGroup.surveys.length} template{dateGroup.surveys.length !== 1 ? "s" : ""}
                  </Badge>
                </TableCell>
                <TableCell>-</TableCell>
                <TableCell className="text-right"></TableCell>
              </TableRow>

              {isDateExpanded && (
                <TableRow>
                  <TableCell colSpan={7} className="p-4 bg-muted/20">
                    <div
                      className={cn(
                        "rounded-lg border-2 overflow-hidden",
                        type === "closed"
                          ? "border-green-300 bg-white"
                          : "border-amber-300 bg-white"
                      )}
                    >
                      <Table>
                        <TableHeader>
                          <TableRow
                            className={cn(
                              "border-b-2",
                              type === "closed"
                                ? "bg-green-50 hover:bg-green-50 border-green-200"
                                : "bg-amber-50 hover:bg-amber-50 border-amber-200"
                            )}
                          >
                            <TableHead
                              className={cn(
                                "w-[80px] text-right font-semibold",
                                type === "closed" ? "text-green-800" : "text-amber-800"
                              )}
                            >
                              System ID
                            </TableHead>
                            <TableHead
                              className={cn(
                                "font-semibold",
                                type === "closed" ? "text-green-800" : "text-amber-800"
                              )}
                            >
                              Date
                            </TableHead>
                            <TableHead
                              className={cn(
                                "font-semibold",
                                type === "closed" ? "text-green-800" : "text-amber-800"
                              )}
                            >
                              Surveyor
                            </TableHead>
                            <TableHead
                              className={cn(
                                "font-semibold",
                                type === "closed" ? "text-green-800" : "text-amber-800"
                              )}
                            >
                              Template
                            </TableHead>
                            <TableHead
                              className={cn(
                                "font-semibold text-center",
                                type === "closed" ? "text-green-800" : "text-amber-800"
                              )}
                            >
                              Score
                            </TableHead>
                            <TableHead
                              className={cn(
                                "text-right font-semibold",
                                type === "closed" ? "text-green-800" : "text-amber-800"
                              )}
                            >
                              Action
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {dateGroup.surveys.map((survey) => {
                            const score = Number(survey.totalScore ?? 0);
                            const possible = Number(survey.possibleScore ?? 0);
                            const percentage =
                              possible > 0 ? Math.round((score / possible) * 100) : 0;

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
                                      <span>{survey.surveyor.name}</span>
                                    ) : (
                                      "-"
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <span className="font-medium">
                                    {survey.template?.name ?? "-"}
                                  </span>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center justify-center gap-2">
                                    <Badge
                                      variant="outline"
                                      className={cn(
                                        "font-mono",
                                        percentage >= 80
                                          ? "bg-green-100 text-green-800 border-green-300"
                                          : percentage >= 60
                                            ? "bg-yellow-100 text-yellow-800 border-yellow-300"
                                            : "bg-red-100 text-red-800 border-red-300"
                                      )}
                                    >
                                      {percentage}%
                                    </Badge>
                                  </div>
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    <Link
                                      href={`/dietary/surveys/${survey.id}`}
                                      className={cn(
                                        buttonVariants({ variant: "outline", size: "icon" }),
                                        "size-6"
                                      )}
                                    >
                                      <ExternalLinkIcon className="h-3 w-3" />
                                    </Link>

                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-6 w-6 text-destructive hover:text-destructive"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setSurveyToDelete({
                                              id: survey.id,
                                              name:
                                                survey.template?.name ?? `Survey ${survey.id}`,
                                            });
                                          }}
                                        >
                                          <TrashIcon className="h-4 w-4" />
                                        </Button>
                                      </AlertDialogTrigger>

                                      <AlertDialogContent>
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>Delete Survey</AlertDialogTitle>
                                          <AlertDialogDescription>
                                            Are you sure you want to delete survey #{survey.id}? This
                                            action cannot be undone and will delete all associated
                                            data.
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel
                                            onClick={() => setSurveyToDelete(null)}
                                          >
                                            Cancel
                                          </AlertDialogCancel>
                                          <AlertDialogAction
                                            className="bg-destructive hover:bg-red-700"
                                            onClick={() => {
                                              deleteSurvey.mutate({ id: survey.id });
                                            }}
                                            disabled={deleteSurvey.isPending}
                                          >
                                            {deleteSurvey.isPending ? "Deleting..." : "Delete"}
                                          </AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  </div>
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
      {/* Header */}
      <div className="border-b bg-white">
        <div className="px-4 py-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <Link href="/dietary" className="hover:text-foreground">
              Dietary
            </Link>
            <span>/</span>
            <span className="text-foreground">Surveys</span>
          </div>
        </div>
      </div>

      <main className="px-4 py-6">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ChefHat className="h-7 w-7 text-orange-600" />
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Dietary Surveys</h1>
              <p className="text-muted-foreground">Manage kitchen sanitation surveys by facility</p>
            </div>
          </div>

          {/* Create Survey Dialog */}
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusIcon className="mr-2 h-4 w-4" />
                New Survey
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Create New Survey</DialogTitle>
                <DialogDescription>
                  Select facility, template, and date to begin a new dietary survey.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                {/* Facility Select */}
                <div className="space-y-2">
                  <Label htmlFor="facility">Facility</Label>
                  <Select value={selectedFacility} onValueChange={setSelectedFacility}>
                    <SelectTrigger id="facility">
                      <SelectValue placeholder="Select a facility" />
                    </SelectTrigger>
                    <SelectContent>
                      {facilities.data?.data?.map((facility) => (
                        <SelectItem key={facility.id} value={String(facility.id)}>
                          {facility.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Template Select */}
                <div className="space-y-2">
                  <Label htmlFor="template">Template</Label>
                  <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                    <SelectTrigger id="template">
                      <SelectValue placeholder="Select a template" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.data?.data?.map((template) => (
                        <SelectItem key={template.id} value={String(template.id)}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Date Picker */}
                <div className="space-y-2">
                  <Label>Survey Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !selectedCreateDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {selectedCreateDate ? (
                          format(selectedCreateDate, "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={selectedCreateDate}
                        onSelect={setSelectedCreateDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateSurvey}
                  disabled={
                    !selectedFacility ||
                    !selectedTemplate ||
                    !selectedCreateDate ||
                    createSurvey.isPending
                  }
                >
                  {createSurvey.isPending ? "Creating..." : "Create Survey"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
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
        <div className="mb-8 rounded-lg border border-[#0c2152] bg-[#0c2152]">
          <div className="flex items-center justify-between p-4 border-b border-[#0c2152]">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-green-500"></div>
              <span className="font-semibold text-white">Completed Surveys</span>
              <Badge variant="secondary" className="bg-green-200 text-green-800">
                {filteredClosedGroups.length} facilit
                {filteredClosedGroups.length !== 1 ? "ies" : "y"}
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
                    <SelectItem key={f.id} value={String(f.id)}>
                      {f.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={closedTemplateFilter} onValueChange={setClosedTemplateFilter}>
                <SelectTrigger className="h-8 w-40 bg-white">
                  <SelectValue placeholder="All Templates" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Templates</SelectItem>
                  {templateOptions.map((t) => (
                    <SelectItem key={t.id} value={String(t.id)}>
                      {t.name}
                    </SelectItem>
                  ))}
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
                    {Array.from({ length: 5 }).map((_, j) => (
                      <TableCell key={`closed-skel-cell-${i}-${j}`}>
                        <Skeleton className="h-6" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : filteredClosedGroups.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-muted-foreground py-8 text-center">
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
                    isExpanded={expandedClosedFacilities.has(group.facilityId)}
                    onToggle={() => toggleFacilityExpanded(group.facilityId, "closed")}
                  />
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pending Surveys */}
        <div className="mb-8 rounded-lg border border-[#0c2152] bg-[#0C2152]">
          <div className="flex items-center justify-between p-4 border-b border-[#0c2152]">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-amber-500"></div>
              <span className="font-semibold text-white">Pending Surveys</span>
              <Badge variant="secondary" className="bg-amber-200 text-amber-800">
                {filteredPendingGroups.length} facilit
                {filteredPendingGroups.length !== 1 ? "ies" : "y"}
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
                    <SelectItem key={f.id} value={String(f.id)}>
                      {f.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={pendingTemplateFilter} onValueChange={setPendingTemplateFilter}>
                <SelectTrigger className="h-8 w-40 bg-white">
                  <SelectValue placeholder="All Templates" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Templates</SelectItem>
                  {templateOptions.map((t) => (
                    <SelectItem key={t.id} value={String(t.id)}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={pendingStatusFilter} onValueChange={setPendingStatusFilter}>
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
            <TableBody className="bg-white rounded-lg">
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
                  <TableCell colSpan={7} className="text-muted-foreground py-8 text-center">
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
                    isExpanded={expandedPendingFacilities.has(group.facilityId)}
                    onToggle={() => toggleFacilityExpanded(group.facilityId, "pending")}
                  />
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </main>
    </>
  );
}
