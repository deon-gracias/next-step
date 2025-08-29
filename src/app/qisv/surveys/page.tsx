"use client";

import { api } from "@/trpc/react";
import { QISVHeader } from "../_components/header";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { ExternalLinkIcon, PlusIcon, ChevronDownIcon, ChevronRightIcon } from "lucide-react";
import { authClient } from "@/components/providers/auth-client";
import { Badge } from "@/components/ui/badge";
import { useSearchParams } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { FacilityHoverCard } from "../_components/facility-card";
import { TemplateHoverCard } from "../_components/template-card";
import React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

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

export default function SurveysPage() {
  const session = authClient.useSession();
  const searchParams = useSearchParams();

  const assignedFacility = api.user.getForOrg.useQuery({});

  const page = Number(searchParams.get("page") ?? 1);
  const pageSize = Number(searchParams.get("pageSize") ?? PAGE_SIZES[0]);

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

  // Group surveys by facility
  const groupedSurveys = React.useMemo(() => {
    if (!surveys.data) return { closed: [], pending: [] };

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
          // Check if survey has responses or is marked as completed
          const isCompleted = survey.responses && survey.responses.length > 0;
          if (isCompleted) group.completedSurveys++;
        }

        // Calculate POC count for closed surveys
        if (survey.isLocked) {
          // You can add POC logic here if needed
          // For now, we'll assume POC is generated if survey has certain properties
          const hasPOC = survey.pocGenerated || false; // Adjust based on your survey schema
          if (hasPOC) group.pocCount++;
        }
      });

      return Array.from(facilityMap.values());
    };

    const closedSurveys = surveys.data.filter(s => s.isLocked);
    const pendingSurveys = surveys.data.filter(s => !s.isLocked);

    return {
      closed: groupByFacility(closedSurveys),
      pending: groupByFacility(pendingSurveys),
    };
  }, [surveys.data]);

  // Filters
  const [closedFacilityFilter, setClosedFacilityFilter] = React.useState<string>("all");
  const [pendingFacilityFilter, setPendingFacilityFilter] = React.useState<string>("all");

  // Expanded states for facility groups
  const [expandedClosed, setExpandedClosed] = React.useState<Set<number>>(new Set());
  const [expandedPending, setExpandedPending] = React.useState<Set<number>>(new Set());

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
      
      {isExpanded && group.surveys.map((survey) => (
        <TableRow key={`${type}-survey-${survey.id}`} className="bg-background">
          <TableCell className="text-right font-mono tabular-nums pl-8">
            {survey.id}
          </TableCell>
          <TableCell>
            <Badge variant="secondary">{String(survey.surveyDate ?? "")}</Badge>
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
              <Badge variant={survey.pocGenerated ? "default" : "secondary"}>
                {survey.pocGenerated ? "POC Generated" : "No POC"}
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
          </TableCell>
        </TableRow>
      ))}
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
                        No completed surveys found.
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
                        No pending surveys found.
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
