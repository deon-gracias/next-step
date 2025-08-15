"use client";

import { InviteMemberDialog } from "@/components/invite-member-dialog";
import { DietaryHeader } from "../_components/header";
import { authClient } from "@/components/providers/auth-client";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { roles } from "@/lib/permissions";
import { PlusIcon, XIcon } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/trpc/react";
import type { DietarySurveysSelectType } from "@/server/db/schema";
import { differenceInDays, format, formatDistance, subDays } from "date-fns";
import { cn } from "@/lib/utils";
import Link from "next/link";
import type { UseTRPCQueryResult } from "node_modules/@trpc/react-query/dist/getQueryKey.d-CruH3ncI.mjs";
import type { TRPCClientErrorLike } from "@trpc/client";
import type { AppRouter } from "@/server/api/root";

const surveysPerMonth = 4;

export default function() {
  const session = authClient.useSession();
  const activeOrganization = authClient.useActiveOrganization();

  const organizationMembers = useQuery({
    queryKey: ["listMembers", activeOrganization.data?.id],
    queryFn: async () =>
      await authClient.organization.listMembers({
        fetchOptions: {},
        query: {
          organizationId: activeOrganization.data?.id ?? "",
          limit: 10,
          offset: 0,
          sortBy: "createdAt",
        },
      }),
    enabled: !!activeOrganization.data,
  });

  const manageMemberPermission = useQuery({
    queryKey: [],
    queryFn: async () =>
      (
        await authClient.organization.hasPermission({
          organizationId: activeOrganization.data!.id,
          permissions: { member: ["update"] },
        })
      ).data?.success,
    enabled: !!activeOrganization.data,
  });

  const newSurveyDate = () => {
    const date = new Date();

    date.setMonth(
      (Math.floor(date.getMonth() / surveysPerMonth) + 1) *
      (12 / surveysPerMonth),
    );
    date.setDate(1);

    return date;
  };

  const isSurveyPendingThisTimeFrame = (
    latestSurvey?: DietarySurveysSelectType,
  ) => {
    if (!latestSurvey || !latestSurvey.createdAt) return true;

    const currentDate = new Date();

    const currentMonthSurveyNumber = Math.floor(
      currentDate.getMonth() / surveysPerMonth,
    );

    const lastestSurveyMonthSurveyNumber = Math.floor(
      latestSurvey.createdAt.getMonth() / surveysPerMonth,
    );

    return currentMonthSurveyNumber === lastestSurveyMonthSurveyNumber;
  };

  const surveys = api.dietarySurvey.listSurveys.useQuery({
    page: 1,
    pageSize: 5,
  });

  function UpcomingSurveyDateCard({
    surveys,
  }: {
    surveys: UseTRPCQueryResult<
      {
        data?: DietarySurveysSelectType[];
        page: number;
        pageSize: number;
      },
      TRPCClientErrorLike<AppRouter>
    >;
  }) {
    const daysTillSurvey = differenceInDays(newSurveyDate(), new Date());
    const distanceTillSurveyDate = formatDistance(newSurveyDate(), new Date(), {
      addSuffix: true,
    });

    if (surveys.isPending) return <Skeleton className="h-full w-full" />;

    return (
      <Card className="w-full gap-2">
        <CardHeader className="flex justify-between">
          <CardTitle>Upcoming</CardTitle>
          {isSurveyPendingThisTimeFrame(surveys.data?.data?.[0] ?? undefined) &&
            daysTillSurvey < 0 ? (
            <Badge variant="destructive">Overdue</Badge>
          ) : (
            <Badge>Due</Badge>
          )}
        </CardHeader>
        <CardContent className="flex flex-col gap-1">
          {surveys.isLoading && <Skeleton className="h-8" />}
          {isSurveyPendingThisTimeFrame(surveys.data?.data?.[0]) && (
            <>
              <span
                className={cn(
                  "text-xl font-bold",
                  daysTillSurvey < 0 && "text-destructive",
                )}
              >
                {format(newSurveyDate(), "PPP")}
              </span>
              {daysTillSurvey < 0 ? (
                <span>{distanceTillSurveyDate}</span>
              ) : (
                "Due"
              )}
            </>
          )}
        </CardContent>
      </Card>
    );
  }

  function CompletedSurveyCard({
    surveys,
  }: {
    surveys: UseTRPCQueryResult<
      {
        data?: DietarySurveysSelectType[];
        page: number;
        pageSize: number;
      },
      TRPCClientErrorLike<AppRouter>
    >;
  }) {
    if (surveys.isPending) return <Skeleton className="h-full w-full" />;

    // Find most recent completed survey (assuming completion flag exists)
    const completedSurveys = surveys.data?.data?.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    const mostRecent = completedSurveys?.[0];
    const daysSinceCompleted = mostRecent
      ? differenceInDays(new Date(), new Date(mostRecent.createdAt))
      : null;
    const distanceSinceCompleted = mostRecent
      ? formatDistance(new Date(), new Date(mostRecent.createdAt), {
        addSuffix: true,
      })
      : null;

    return (
      <Card className="w-full gap-2">
        <CardHeader className="flex justify-between">
          <CardTitle>Completed</CardTitle>
          {mostRecent ? (
            <Badge>Completed</Badge>
          ) : (
            <Badge variant="secondary">No Completed Surveys</Badge>
          )}
        </CardHeader>
        <CardContent className="flex flex-col gap-1">
          {surveys.isLoading && <Skeleton className="h-8" />}
          {
            <>
              <span className="text-xl font-bold">
                {mostRecent
                  ? format(new Date(mostRecent.createdAt), "PPP")
                  : "---"}
              </span>
              <span>
                {mostRecent
                  ? daysSinceCompleted && daysSinceCompleted === 0
                    ? "Today"
                    : distanceSinceCompleted
                  : "---"}
              </span>
            </>
          }
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <DietaryHeader crumbs={[{ label: "Dashboard" }]} />

      <main className="flex flex-1 flex-col gap-8 px-6">
        <div className="flex gap-4">
          <UpcomingSurveyDateCard surveys={surveys} />
          <CompletedSurveyCard surveys={surveys} />
        </div>

        <div className="space-y-4">
          <div className="flex justify-between">
            <div>
              <h2 className="text-xl font-semibold">Recent Surveys</h2>
              <p className="text-muted-foreground max-w-fit text-sm">
                Last 3 surveys
              </p>
            </div>
            <Link
              className={cn(buttonVariants({ variant: "outline" }), "w-fit")}
              href={"/dietary/survey/new"}
            >
              <PlusIcon /> Survey
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card className="w-full" key={i}>
                <CardHeader>
                  <CardTitle>Completed</CardTitle>
                </CardHeader>
                <CardContent>{}</CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Members</h2>
              {!organizationMembers.data ? (
                <Skeleton className="max-w- h-4 w-52" />
              ) : (
                <p className="text-muted-foreground max-w-fit text-sm">
                  {organizationMembers.data.data?.total ?? 0} member
                  {organizationMembers.data.data?.total !== 1 ? "s" : ""} across
                  all organizations
                </p>
              )}
            </div>
            {activeOrganization.data && manageMemberPermission.data && (
              <InviteMemberDialog organizationId={activeOrganization.data.id} />
            )}
          </div>
          <div className="divide-y rounded-2xl border">
            {!organizationMembers.data &&
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-4">
                  <Skeleton key={i} className="size-8 rounded-full" />

                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-4 w-[100px]" />
                    <Skeleton className="h-4 w-[200px]" />
                  </div>

                  <Skeleton className="h-4 w-[50px]" />
                </div>
              ))}

            {organizationMembers.data?.data &&
              organizationMembers.data.data.members.map((member) => (
                <div key={member.id} className="flex items-center gap-4 p-4">
                  <Avatar>
                    <AvatarImage src={member.user.image || undefined} />
                    <AvatarFallback>
                      {member.user.name?.charAt(0).toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm leading-none font-medium">
                      {member.user.name}
                    </p>
                    <p className="text-muted-foreground text-sm">
                      {member.user.email}
                    </p>
                  </div>

                  {manageMemberPermission.data &&
                    session.data &&
                    session.data.user.id !== member.userId ? (
                    <>
                      <Select
                        defaultValue={member.role}
                        onValueChange={async (e) => {
                          await authClient.organization.updateMemberRole({
                            role: e,
                            memberId: member.id,
                          });
                          organizationMembers.refetch();
                        }}
                      >
                        <SelectTrigger>{member.role}</SelectTrigger>
                        <SelectContent align="end">
                          {roles.map((e) => (
                            <SelectItem key={e.label} value={e.label}>
                              {e.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {activeOrganization.data && (
                        <Button
                          size="icon"
                          variant={"ghost"}
                          onClick={() => {
                            authClient.organization.removeMember({
                              memberIdOrEmail: member.user.email,
                              organizationId: activeOrganization.data!.id,
                            });
                          }}
                        >
                          <XIcon />
                        </Button>
                      )}
                    </>
                  ) : (
                    <Badge
                      variant={
                        member.role === "admin" ? "default" : "secondary"
                      }
                    >
                      {member.role}
                    </Badge>
                  )}
                </div>
              ))}
          </div>
        </div>
      </main>
    </>
  );
}
