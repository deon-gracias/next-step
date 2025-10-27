"use client";

import { api } from "@/trpc/react";
import Link from "next/link";
import React, { useState } from "react";
import { format } from "date-fns";
import { Button, buttonVariants } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, ChevronDownIcon, ChevronRightIcon, ExternalLinkIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { authClient } from "@/components/providers/auth-client";
import { Skeleton } from "@/components/ui/skeleton";
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

type GroupedSurvey = {
  facilityId: number;
  facilityName: string;
  facility: any;
  dates: Map<string, {
    date: string;
    surveys: any[];
  }>;
  totalSurveys: number;
};

export default function QALSurveysIndex() {
  const utils = api.useUtils();
  const session = authClient.useSession();

  const facilities = api.facility.list.useQuery({ page: 1, pageSize: 100 });
  const templates = api.qal.listTemplates.useQuery();
  const surveys = api.qal.listSurveys.useQuery({});

  const create = api.qal.createSurvey.useMutation();
  const deleteSurvey = api.qal.deleteSurvey.useMutation({
    onSuccess: () => {
      toast.success("Survey deleted successfully");
      utils.qal.listSurveys.invalidate();
      setSurveyToDelete(null);
    },
    onError: (error) => {
      toast.error(`Failed to delete survey: ${error.message}`);
      setSurveyToDelete(null);
    },
  });

  const [open, setOpen] = useState(false);
  const [selectedFacilityId, setSelectedFacilityId] = useState<number | undefined>(undefined);
  const [surveyDate, setSurveyDate] = useState<Date | undefined>(new Date());
  const [surveyType, setSurveyType] = useState<"onsite" | "offsite">("onsite");
  const [administrator, setAdministrator] = useState("");
  const [businessOfficeManager, setBusinessOfficeManager] = useState("");
  const [assistantBusinessOfficeManager, setAssistantBusinessOfficeManager] = useState("");

  const [surveyToDelete, setSurveyToDelete] = useState<{ id: number; name: string } | null>(null);

  const [completedFacilityFilter, setCompletedFacilityFilter] = useState<string>("all");
  const [pendingFacilityFilter, setPendingFacilityFilter] = useState<string>("all");

  const [expandedCompletedFacilities, setExpandedCompletedFacilities] = useState<Set<number>>(new Set());
  const [expandedPendingFacilities, setExpandedPendingFacilities] = useState<Set<number>>(new Set());
  const [expandedCompletedDates, setExpandedCompletedDates] = useState<Set<string>>(new Set());
  const [expandedPendingDates, setExpandedPendingDates] = useState<Set<string>>(new Set());

  const handleOpenCreate = () => {
    const firstFacility = facilities.data?.data?.[0]?.id;
    setSelectedFacilityId(firstFacility);
    setSurveyDate(new Date());
    setSurveyType("onsite");
    setAdministrator("");
    setBusinessOfficeManager("");
    setAssistantBusinessOfficeManager("");
    setOpen(true);
  };

  const handleConfirmCreate = async () => {
    if (!session?.data?.user?.id) {
      toast.error("You must be logged in to create a survey");
      return;
    }

    if (!selectedFacilityId) {
      toast.error("Please select a facility");
      return;
    }

    if (!surveyDate) {
      toast.error("Please select a survey date");
      return;
    }

    if (!administrator.trim()) {
      toast.error("Administrator name is required");
      return;
    }

    if (!businessOfficeManager.trim()) {
      toast.error("Business Office Manager name is required");
      return;
    }

    const firstActiveTemplate = templates.data?.find(t => t.isActive)?.id;
    if (!firstActiveTemplate) {
      toast.error("No active template found");
      return;
    }

    try {
      const sv = await create.mutateAsync({
        facilityId: selectedFacilityId,
        templateId: firstActiveTemplate,
        surveyDate: surveyDate,
        auditorUserId: session.data.user.id,
        surveyType: surveyType,
        administrator: administrator.trim(),
        businessOfficeManager: businessOfficeManager.trim(),
        assistantBusinessOfficeManager: assistantBusinessOfficeManager.trim() || undefined,
      });

      await utils.qal.listSurveys.invalidate();
      toast.success("Survey created successfully");
      setOpen(false);

      window.location.href = `/qal/surveys/${sv.id}`;
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to create survey");
    }
  };

  const groupedSurveys = React.useMemo(() => {
    if (!surveys.data) return { completed: [], pending: [] };

    const completedSurveys: any[] = [];
    const pendingSurveys: any[] = [];

    surveys.data.forEach(survey => {
      if (survey.isLocked) {
        completedSurveys.push(survey);
      } else {
        pendingSurveys.push(survey);
      }
    });

    const groupByFacilityAndDate = (surveyList: any[]) => {
      const facilityMap = new Map<number, GroupedSurvey>();

      surveyList.forEach((survey) => {
        const facilityId = survey.facilityId;
        const fac = facilities.data?.data?.find(f => f.id === facilityId);
        const facilityName = fac?.name || `Facility ${facilityId}`;
        const surveyDate = survey.surveyDate ? new Date(survey.surveyDate) : null;
        const dateKey = surveyDate && !isNaN(surveyDate.getTime()) ? format(surveyDate, "yyyy-MM-dd") : "No date";

        if (!facilityMap.has(facilityId)) {
          facilityMap.set(facilityId, {
            facilityId,
            facilityName,
            facility: fac,
            dates: new Map(),
            totalSurveys: 0,
          });
        }

        const facilityGroup = facilityMap.get(facilityId)!;

        if (!facilityGroup.dates.has(dateKey)) {
          facilityGroup.dates.set(dateKey, {
            date: dateKey,
            surveys: [],
          });
        }

        const dateGroup = facilityGroup.dates.get(dateKey)!;
        dateGroup.surveys.push(survey);
        facilityGroup.totalSurveys++;
      });

      return Array.from(facilityMap.values());
    };

    return {
      completed: groupByFacilityAndDate(completedSurveys),
      pending: groupByFacilityAndDate(pendingSurveys),
    };
  }, [surveys.data, facilities.data]);

  const toggleFacilityExpanded = (facilityId: number, type: 'completed' | 'pending') => {
    if (type === 'completed') {
      const newExpanded = new Set(expandedCompletedFacilities);
      if (newExpanded.has(facilityId)) {
        newExpanded.delete(facilityId);
      } else {
        newExpanded.add(facilityId);
      }
      setExpandedCompletedFacilities(newExpanded);
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

  const toggleDateExpanded = (facilityId: number, dateKey: string, type: 'completed' | 'pending') => {
    const expandKey = `${facilityId}-${dateKey}`;
    if (type === 'completed') {
      const newExpanded = new Set(expandedCompletedDates);
      if (newExpanded.has(expandKey)) {
        newExpanded.delete(expandKey);
      } else {
        newExpanded.add(expandKey);
      }
      setExpandedCompletedDates(newExpanded);
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

  const filteredCompletedGroups = React.useMemo(() => {
    return groupedSurveys.completed.filter(group => {
      return completedFacilityFilter === "all" || String(group.facilityId) === completedFacilityFilter;
    });
  }, [groupedSurveys.completed, completedFacilityFilter]);

  const filteredPendingGroups = React.useMemo(() => {
    return groupedSurveys.pending.filter(group => {
      return pendingFacilityFilter === "all" || String(group.facilityId) === pendingFacilityFilter;
    });
  }, [groupedSurveys.pending, pendingFacilityFilter]);

  const facilityOptions = React.useMemo(() => {
    const allFacilities = [...groupedSurveys.completed, ...groupedSurveys.pending];
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

  const FacilityGroupRow = ({ group, type, isExpanded, onToggle }: {
    group: GroupedSurvey;
    type: 'completed' | 'pending';
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
        <TableCell colSpan={4}>
          <div className="flex items-center gap-2">
            🏢 <span className="font-semibold">{group.facilityName}</span>
            <Badge variant="outline" className="ml-2">
              {group.totalSurveys} survey{group.totalSurveys !== 1 ? 's' : ''}
            </Badge>
          </div>
        </TableCell>
        <TableCell className="text-right">
          <Badge variant="outline">
            {isExpanded ? 'Collapse' : 'Expand'}
          </Badge>
        </TableCell>
      </TableRow>

      {isExpanded && Array.from(group.dates.entries()).map(([dateKey, dateGroup]) => {
        const expandKey = `${group.facilityId}-${dateKey}`;
        const isDateExpanded = type === 'completed'
          ? expandedCompletedDates.has(expandKey)
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
              <TableCell colSpan={3}>
                <div className="flex items-center gap-2">
                  📅 <Badge variant="secondary">{dateKey}</Badge>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="text-xs">
                  {dateGroup.surveys.length} survey{dateGroup.surveys.length !== 1 ? 's' : ''}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <Badge variant="outline" className="text-xs">
                  {isDateExpanded ? 'Collapse' : 'Expand'}
                </Badge>
              </TableCell>
            </TableRow>

            {isDateExpanded && dateGroup.surveys.map((survey) => {
              const tpl = templates.data?.find(t => t.id === survey.templateId);
              const fac = facilities.data?.data?.find(f => f.id === survey.facilityId);

              return (
                <TableRow key={`${type}-survey-${survey.id}`} className="bg-background">
                  <TableCell className="text-right font-mono tabular-nums pl-12">
                    {survey.id}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{dateKey}</Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {tpl?.name ?? `Template ${survey.templateId}`}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={Number(survey.overallPercent) >= 90 ? "default" : "secondary"}>
                      {Number(survey.overallPercent).toFixed(1)}%
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={survey.isLocked ? "secondary" : "outline"}>
                      {survey.isLocked ? "Locked" : "In Progress"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center gap-1 justify-end">
                      <Link
                        href={`/qal/surveys/${survey.id}`}
                        className={cn(buttonVariants({ variant: "outline", size: "icon" }), "size-6")}
                      >
                        <ExternalLinkIcon className="h-3 w-3" />
                      </Link>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-6 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSurveyToDelete({
                                id: survey.id,
                                name: `${fac?.name ?? 'Facility'} - ${tpl?.name ?? 'Survey'} (${dateKey})`,
                              });
                            }}
                            disabled={deleteSurvey.isPending}
                          >
                            <Trash2Icon className="h-3 w-3" />
                          </Button>
                        </AlertDialogTrigger>

                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Survey</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete the survey "
                              {surveyToDelete?.id === survey.id ? surveyToDelete?.name : `Survey ${survey.id}`}
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
                            <AlertDialogAction>
                              <Button
                                variant="destructive"
                                onClick={() => {
                                  deleteSurvey.mutate({ id: survey.id });
                                }}
                                disabled={deleteSurvey.isPending}
                              >
                                {deleteSurvey.isPending ? "Deleting..." : "Delete"}
                              </Button>
                            </AlertDialogAction>


                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
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
    <main className="p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">QAL Surveys</h1>
          <p className="text-sm text-muted-foreground">
            Create and manage facility-level QAL audit surveys
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleOpenCreate}
            disabled={templates.isLoading || !session?.data?.user?.id}
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            New Survey
          </Button>
        </div>
      </div>

      <Separator />

      <div className="mb-8 rounded-lg border border-green-200 bg-green-50/30">
        <div className="flex items-center justify-between p-4 border-b border-green-200 bg-green-100/50">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-green-500"></div>
            <span className="font-semibold text-green-800">Completed Surveys</span>
            <Badge variant="secondary" className="bg-green-200 text-green-800">
              {filteredCompletedGroups.length} facilit{filteredCompletedGroups.length !== 1 ? 'ies' : 'y'}
            </Badge>
          </div>
          <Select value={completedFacilityFilter} onValueChange={setCompletedFacilityFilter}>
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
        </div>

        <Table>
          <TableHeader>
            <TableRow className="bg-green-100 hover:bg-green-100">
              <TableHead className="w-[80px] text-right text-green-800">System ID</TableHead>
              <TableHead className="text-green-800">Date</TableHead>
              <TableHead className="text-green-800">Template</TableHead>
              <TableHead className="text-green-800">Score</TableHead>
              <TableHead className="text-green-800">Status</TableHead>
              <TableHead className="text-right text-green-800">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {surveys.isPending ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={`completed-skel-${i}`}>
                  <TableCell className="text-right">
                    <Skeleton className="ml-auto h-6 w-10" />
                  </TableCell>
                  {Array.from({ length: 5 }).map((_, j) => (
                    <TableCell key={`completed-skel-cell-${i}-${j}`}>
                      <Skeleton className="h-6" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : filteredCompletedGroups.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-muted-foreground py-8 text-center">
                  No completed surveys found.
                </TableCell>
              </TableRow>
            ) : (
              filteredCompletedGroups.map((group) => (
                <FacilityGroupRow
                  key={`completed-group-${group.facilityId}`}
                  group={group}
                  type="completed"
                  isExpanded={expandedCompletedFacilities.has(group.facilityId)}
                  onToggle={() => toggleFacilityExpanded(group.facilityId, 'completed')}
                />
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="mb-8 rounded-lg border border-amber-200 bg-amber-50/30">
        <div className="flex items-center justify-between p-4 border-b border-amber-200 bg-amber-100/50">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-amber-500"></div>
            <span className="font-semibold text-amber-800">Pending Surveys</span>
            <Badge variant="secondary" className="bg-amber-200 text-amber-800">
              {filteredPendingGroups.length} facilit{filteredPendingGroups.length !== 1 ? 'ies' : 'y'}
            </Badge>
          </div>
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
        </div>

        <Table>
          <TableHeader>
            <TableRow className="bg-amber-100 hover:bg-amber-100">
              <TableHead className="w-[80px] text-right text-amber-800">System ID</TableHead>
              <TableHead className="text-amber-800">Date</TableHead>
              <TableHead className="text-amber-800">Template</TableHead>
              <TableHead className="text-amber-800">Score</TableHead>
              <TableHead className="text-amber-800">Status</TableHead>
              <TableHead className="text-right text-amber-800">Actions</TableHead>
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
                  No pending surveys found.
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New QAL Survey</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="facility">Facility <span className="text-red-500">*</span></Label>
              <Select
                value={selectedFacilityId?.toString() ?? "none"}
                onValueChange={(val) => setSelectedFacilityId(val === "none" ? undefined : Number(val))}
              >
                <SelectTrigger id="facility">
                  <SelectValue placeholder="Select facility" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none" disabled>Select facility</SelectItem>
                  {facilities.data?.data?.map((f) => (
                    <SelectItem key={f.id} value={f.id.toString()}>{f.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Survey Date <span className="text-red-500">*</span></Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn("w-full justify-start text-left font-normal", !surveyDate && "text-muted-foreground")}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {surveyDate ? format(surveyDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={surveyDate} onSelect={setSurveyDate} initialFocus />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Survey Type <span className="text-red-500">*</span></Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={surveyType === "onsite" ? "default" : "outline"}
                  className="flex-1"
                  onClick={() => setSurveyType("onsite")}
                >
                  On-Site
                </Button>
                <Button
                  type="button"
                  variant={surveyType === "offsite" ? "default" : "outline"}
                  className="flex-1"
                  onClick={() => setSurveyType("offsite")}
                >
                  Off-Site
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="administrator">Administrator <span className="text-red-500">*</span></Label>
              <Input id="administrator" placeholder="Enter administrator name" value={administrator} onChange={(e) => setAdministrator(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bom">Business Office Manager <span className="text-red-500">*</span></Label>
              <Input id="bom" placeholder="Enter business office manager name" value={businessOfficeManager} onChange={(e) => setBusinessOfficeManager(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="abom">Assistant Business Office Manager <span className="text-muted-foreground">(Optional)</span></Label>
              <Input id="abom" placeholder="Enter assistant BOM name (optional)" value={assistantBusinessOfficeManager} onChange={(e) => setAssistantBusinessOfficeManager(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={create.isPending}>Cancel</Button>
            <Button onClick={handleConfirmCreate} disabled={create.isPending}>
              {create.isPending ? "Creating..." : "Create Survey"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
