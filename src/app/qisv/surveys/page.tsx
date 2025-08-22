// app/qisv/surveys/page.tsx
"use client";

import { api } from "@/trpc/react";
import { QISVHeader } from "../_components/header";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { ExternalLinkIcon, PlusIcon } from "lucide-react";
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

const PAGE_SIZES = [10, 50, 100];

export default function SurveysPage() {
  const session = authClient.useSession();
  const searchParams = useSearchParams();

  const assignedFacility = api.user.getForOrg.useQuery({});

  const page = Number(searchParams.get("page") ?? 1);
  const pageSize = Number(searchParams.get("pageSize") ?? PAGE_SIZES[0]);

  // Single source list used for both Closed and Pending sections (so filters work uniformly)
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

  // Build Facility and Template option lists from current result set
  const facilityOptions = React.useMemo(() => {
    const map = new Map<number, string>();
    for (const s of surveys.data ?? []) {
      const id = s.facility?.id ?? s.facilityId;
      const name = s.facility?.name ?? (id != null ? `Facility ${id}` : "Unknown");
      if (id != null && !map.has(id)) map.set(id, name);
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [surveys.data]);

  const templateOptions = React.useMemo(() => {
    const map = new Map<number, string>();
    for (const s of surveys.data ?? []) {
      const id = s.template?.id ?? s.templateId;
      const name = s.template?.name ?? (id != null ? `Template ${id}` : "Unknown");
      if (id != null && !map.has(id)) map.set(id, name);
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [surveys.data]);

  // Filters (client-side) for Closed and Pending tables
  const [closedFacilityFilter, setClosedFacilityFilter] = React.useState<string>("all");
  const [closedTemplateFilter, setClosedTemplateFilter] = React.useState<string>("all");
  const [pendingFacilityFilter, setPendingFacilityFilter] = React.useState<string>("all");
  const [pendingTemplateFilter, setPendingTemplateFilter] = React.useState<string>("all");

  const closedRows = React.useMemo(() => {
    const base = (surveys.data ?? []).filter((s) => s.isLocked);
    return base.filter((s) => {
      const fOk =
        closedFacilityFilter === "all" ||
        String(s.facilityId) === closedFacilityFilter ||
        String(s.facility?.id ?? "") === closedFacilityFilter;
      const tOk =
        closedTemplateFilter === "all" ||
        String(s.templateId) === closedTemplateFilter ||
        String(s.template?.id ?? "") === closedTemplateFilter;
      return fOk && tOk;
    });
  }, [surveys.data, closedFacilityFilter, closedTemplateFilter]);

  const pendingRows = React.useMemo(() => {
    const base = (surveys.data ?? []).filter((s) => !s.isLocked);
    return base.filter((s) => {
      const fOk =
        pendingFacilityFilter === "all" ||
        String(s.facilityId) === pendingFacilityFilter ||
        String(s.facility?.id ?? "") === pendingFacilityFilter;
      const tOk =
        pendingTemplateFilter === "all" ||
        String(s.templateId) === pendingTemplateFilter ||
        String(s.template?.id ?? "") === pendingTemplateFilter;
      return fOk && tOk;
    });
  }, [surveys.data, pendingFacilityFilter, pendingTemplateFilter]);

  return (
    <>
      <QISVHeader crumbs={[{ label: "Surveys" }]} />

      <main className="px-4 py-6">
        {hasViewSurveyPermission.data && (
          <>
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Surveys</h1>
                <p className="text-muted-foreground">Manage surveys</p>
              </div>

              {hasNewSurveyPermission.data && (
                <Link href={`/qisv/surveys/new`} className={cn(buttonVariants())}>
                  <PlusIcon /> Create Survey
                </Link>
              )}
            </div>

            {/* Surveys Closed (Locked) */}
            <div className="mb-9 rounded-lg border">
              <div className="flex items-center justify-between p-3 border-b">
                <div className="font-semibold">Surveys Closed</div>
                <div className="flex items-center gap-2">
                  <Select value={closedFacilityFilter} onValueChange={setClosedFacilityFilter}>
                    <SelectTrigger className="h-8 w-44">
                      <SelectValue placeholder="Facility" />
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
                    <SelectTrigger className="h-8 w-44">
                      <SelectValue placeholder="Template" />
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

              <Table>
                <TableHeader>
                  <TableRow className="bg-secondary text-secondary-foreground">
                    <TableHead className="w-[80px] text-right">ID</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Surveyor</TableHead>
                    <TableHead>Facility</TableHead>
                    <TableHead>Template</TableHead>
                    <TableHead className="text-right">Open</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {surveys.isPending &&
                    Array.from({ length: pageSize }).map((_, i) => (
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
                    ))}

                  {!surveys.isPending && closedRows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-muted-foreground py-8 text-center">
                        No closed surveys found.
                      </TableCell>
                    </TableRow>
                  )}

                  {!surveys.isPending &&
                    closedRows.map((e) => (
                      <TableRow key={`closed-${e.id}`}>
                        <TableCell className="text-right font-mono tabular-nums">{e.id}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{String(e.surveyDate ?? "")}</Badge>
                        </TableCell>
                        <TableCell className="flex items-center gap-2">
                          {e.surveyor ? (
                            <>
                              <span>{e.surveyor.name}</span>{" "}
                              <Badge variant="outline">{e.surveyor.email}</Badge>
                            </>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell>{e.facility && <FacilityHoverCard facility={e.facility} />}</TableCell>
                        <TableCell>{e.template && <TemplateHoverCard template={e.template} />}</TableCell>
                        <TableCell className="text-right">
                          <Link
                            href={`/qisv/surveys/${e.id}`}
                            className={cn(buttonVariants({ variant: "outline", size: "icon" }), "size-6")}
                          >
                            <ExternalLinkIcon />
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>

            {/* Surveys Pending (Unlocked) */}
            <div className="mb-9 rounded-lg border">
              <div className="flex items-center justify-between p-3 border-b">
                <div className="font-semibold">Surveys Pending</div>
                <div className="flex items-center gap-2">
                  <Select value={pendingFacilityFilter} onValueChange={setPendingFacilityFilter}>
                    <SelectTrigger className="h-8 w-44">
                      <SelectValue placeholder="Facility" />
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
                    <SelectTrigger className="h-8 w-44">
                      <SelectValue placeholder="Template" />
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

              <Table>
                <TableHeader>
                  <TableRow className="bg-secondary text-secondary-foreground">
                    <TableHead className="w-[80px] text-right">ID</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Surveyor</TableHead>
                    <TableHead>Facility</TableHead>
                    <TableHead>Template</TableHead>
                    <TableHead className="text-right">Open</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {surveys.isPending &&
                    Array.from({ length: pageSize }).map((_, i) => (
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
                    ))}

                  {!surveys.isPending && pendingRows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-muted-foreground py-8 text-center">
                        No pending surveys found.
                      </TableCell>
                    </TableRow>
                  )}

                  {!surveys.isPending &&
                    pendingRows.map((e) => (
                      <TableRow key={`pending-${e.id}`}>
                        <TableCell className="text-right font-mono tabular-nums">{e.id}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{String(e.surveyDate ?? "")}</Badge>
                        </TableCell>
                        <TableCell className="flex items-center gap-2">
                          {e.surveyor ? (
                            <>
                              <span>{e.surveyor.name}</span>{" "}
                              <Badge variant="outline">{e.surveyor.email}</Badge>
                            </>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell>{e.facility && <FacilityHoverCard facility={e.facility} />}</TableCell>
                        <TableCell>{e.template && <TemplateHoverCard template={e.template} />}</TableCell>
                        <TableCell className="text-right">
                          <Link
                            href={`/qisv/surveys/${e.id}`}
                            className={cn(buttonVariants({ variant: "outline", size: "icon" }), "size-6")}
                          >
                            <ExternalLinkIcon />
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </main>
    </>
  );
}
