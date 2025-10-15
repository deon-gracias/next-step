"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/trpc/react";
import { format } from "date-fns";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

export default function QALSurveyShellPage() {
  const params = useParams();
  const surveyId = Number((params as any).surveyId);

  const q = api.qal.getSurvey.useQuery({ id: surveyId });
  const lock = api.qal.lock.useMutation();
  const unlock = api.qal.unlock.useMutation();

  const facilityId = q.data?.survey?.facilityId;
  const isLocked = Boolean(q.data?.survey?.isLocked);
  const overall = Number(q.data?.survey?.overallPercent ?? 0);

  const handleLock = async () => {
    try {
      await lock.mutateAsync({ surveyId });
      await q.refetch();
      toast.success("Survey locked");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to lock");
    }
  };

  const handleUnlock = async () => {
    try {
      await unlock.mutateAsync({ surveyId });
      await q.refetch();
      toast.success("Survey unlocked");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to unlock");
    }
  };

  if (!q.data?.survey) {
    return (
      <main className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Loading survey...</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Please wait while we fetch the survey details.
          </CardContent>
        </Card>
      </main>
    );
  }

  const sv = q.data.survey;

  return (
    <main className="p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">QAL Survey #{sv.id}</h1>
          <p className="text-sm text-muted-foreground">
            Facility: {sv.facilityId} • Template: {sv.templateId} • Date:{" "}
            {sv.surveyDate ? format(new Date(sv.surveyDate), "yyyy-MM-dd") : "-"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={overall >= 90 ? "default" : "secondary"}>
            {overall.toFixed(2)}%
          </Badge>
          {isLocked ? (
            <Button variant="destructive" onClick={handleUnlock} disabled={unlock.isPending}>
              {unlock.isPending ? "Unlocking..." : "Unlock"}
            </Button>
          ) : (
            <Button onClick={handleLock} disabled={lock.isPending}>
              {lock.isPending ? "Locking..." : "Lock"}
            </Button>
          )}
          <Link href={`/qal/surveys/${sv.id}/report`} className={buttonVariants({ variant: "outline" })}>
            View Report
          </Link>
        </div>
      </div>

      <Separator />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Survey Overview</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 text-sm">
          <div className="rounded border p-3">
            <div className="text-muted-foreground">Facility</div>
            <div className="font-medium">{sv.facilityId}</div>
          </div>
          <div className="rounded border p-3">
            <div className="text-muted-foreground">Template</div>
            <div className="font-medium">{sv.templateId}</div>
          </div>
          <div className="rounded border p-3">
            <div className="text-muted-foreground">Status</div>
            <div className="font-medium">{sv.isLocked ? "Locked" : "In Progress"}</div>
          </div>
          <div className="rounded border p-3">
            <div className="text-muted-foreground">Total Possible</div>
            <div className="font-medium">{Number(sv.totalPossible).toFixed(0)}</div>
          </div>
          <div className="rounded border p-3">
            <div className="text-muted-foreground">Total Earned</div>
            <div className="font-medium">{Number(sv.totalEarned).toFixed(2)}</div>
          </div>
          <div className="rounded border p-3">
            <div className="text-muted-foreground">Grade Band</div>
            <div className="font-medium">{sv.gradeBand ?? "-"}</div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Continue Survey</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          <Link
            href={`/qal/surveys/${sv.id}/facility/${facilityId}`}
            className={buttonVariants({ size: "sm" })}
          >
            Open Facility Survey
          </Link>
          <Link
            href={`/qal/template`}
            className={buttonVariants({ size: "sm", variant: "outline" })}
          >
            View QAL Template
          </Link>
          <Link
            href={`/qal/surveys`}
            className={buttonVariants({ size: "sm", variant: "ghost" })}
          >
            Back to Surveys
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
