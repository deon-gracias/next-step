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
import { ExternalLinkIcon, PlusIcon } from "lucide-react";
import { authClient } from "@/components/providers/auth-client";
import { Badge } from "@/components/ui/badge";
import { useSearchParams } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { FacilityHoverCard } from "../_components/facility-card";
import { TemplateHoverCard } from "../_components/template-card";

const PAGE_SIZES = [10, 50, 100];

export default function() {
  const session = authClient.useSession();
  const searchParams = useSearchParams();

  const assignedFacility = api.user.getForOrg.useQuery({});

  const page = Number(searchParams.get("page") ?? 1);
  const pageSize = Number(searchParams.get("pageSize") ?? PAGE_SIZES[0]);

  const surveys = api.survey.list.useQuery(
    {
      facilityId: assignedFacility.data?.id,
      page,
      pageSize,
    },
    {
      enabled: !!assignedFacility.data,
    },
  );

  const surveysPending = api.survey.pendingSurveys.useQuery(
    {
      surveyorId: session.data?.user.id,
    },
    {
      enabled: !!(session.data && session.data.user.id),
    },
  );

  useEffect(() => {
    console.log(assignedFacility.data);
  }, [assignedFacility.data]);

  const hasViewSurveyPermission = useQuery({
    queryKey: ["permissions", "read-survey", session.data?.user.id],
    queryFn: async () =>
      (
        await authClient.organization.hasPermission({
          permissions: { survey: ["read"] },
        })
      ).data?.success ?? false,
  });

  const hasNewSurveyPermission = useQuery({
    queryKey: ["permissions", "new-survey", session.data?.user.id],
    queryFn: async () =>
      (
        await authClient.organization.hasPermission({
          permissions: { survey: ["create"] },
        })
      ).data?.success ?? false,
  });

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
                <Link
                  href={`/qisv/surveys/new`}
                  className={cn(buttonVariants())}
                >
                  <PlusIcon /> Create Survey
                </Link>
              )}
            </div>

            <div className="mb-9 rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-secondary text-secondary-foreground">
                    <TableHead className="w-[80px] text-right">ID</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Surveyor</TableHead>
                    <TableHead>Facility</TableHead>
                    <TableHead>Template</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {surveys.isPending &&
                    Array.from({ length: pageSize }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-right">
                          <Skeleton className="ml-auto h-6" />
                        </TableCell>
                        {Array.from({ length: 4 }).map((_, i) => (
                          <TableCell key={i}>
                            <Skeleton className="h-6" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}

                  {!surveys.isPending &&
                    surveys.data &&
                    surveys.data.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="text-muted-foreground py-8 text-center"
                        >
                          No surveys found. Add your first survey to get
                          started.
                        </TableCell>
                      </TableRow>
                    )}

                  {surveys.data &&
                    surveys.data.map((e) => (
                      <TableRow key={e.id}>
                        <TableCell className="text-right font-mono tabular-nums">
                          {e.id}
                        </TableCell>
                        <TableCell>
                          <Badge variant={"secondary"}>{e.surveyDate}</Badge>
                        </TableCell>
                        <TableCell className="flex items-center gap-2">
                          {e.surveyor ? (
                            <>
                              <span>{e.surveyor.name}</span>{" "}
                              <Badge variant="outline">
                                {e.surveyor.email}
                              </Badge>
                            </>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell>
                          {e.facility && (
                            <FacilityHoverCard facility={e.facility} />
                          )}
                        </TableCell>
                        <TableCell>
                          {e.template && (
                            <TemplateHoverCard template={e.template} />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}

        {surveysPending.data && surveysPending.data.length > 0 && (
          <>
            <div className="mb-6 grid">
              <h1 className="text-2xl font-bold tracking-tight">
                Surveys Pending
              </h1>
              <p className="text-muted-foreground">Surveys pending</p>
            </div>

            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-secondary text-secondary-foreground">
                    <TableHead className="w-[80px] text-right">ID</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Surveyor</TableHead>
                    <TableHead>Facility</TableHead>
                    <TableHead>Template</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {surveys.isPending &&
                    Array.from({ length: pageSize }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-right">
                          <Skeleton className="ml-auto h-6" />
                        </TableCell>
                        {Array.from({ length: 4 }).map((_, i) => (
                          <TableCell key={i}>
                            <Skeleton className="h-6" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}

                  {!surveys.isPending &&
                    surveys.data &&
                    surveys.data.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="text-muted-foreground py-8 text-center"
                        >
                          No surveys found. Add your first resident to get
                          started.
                        </TableCell>
                      </TableRow>
                    )}

                  {surveysPending.data &&
                    surveysPending.data.map((e) => (
                      <TableRow key={e.id}>
                        <TableCell className="text-right">{e.id}</TableCell>
                        <TableCell>
                          <Badge variant={"secondary"}>{e.surveyDate}</Badge>
                        </TableCell>
                        <TableCell>
                          {e.surveyor ? (
                            <>
                              <span>{e.surveyor.name}</span>{" "}
                              <Badge variant="outline">
                                {e.surveyor.email}
                              </Badge>
                            </>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell>
                          {e.facility && (
                            <FacilityHoverCard facility={e.facility} />
                          )}
                        </TableCell>
                        <TableCell>
                          {e.template && (
                            <TemplateHoverCard template={e.template} />
                          )}
                        </TableCell>
                        <TableCell>
                          <Link
                            href={`/qisv/surveys/${e.id}/`}
                            className={buttonVariants({
                              variant: "outline",
                              size: "icon",
                            })}
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
