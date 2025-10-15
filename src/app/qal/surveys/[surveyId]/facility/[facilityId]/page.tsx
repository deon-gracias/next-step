"use client";

import React from "react";
import { useParams } from "next/navigation";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { toast } from "sonner";

type QAOption = "pass" | "fail" | "na";

export default function QALFacilitySurveyPage() {
  const params = useParams();
  const surveyId = Number((params as any).surveyId);
  const facilityId = Number((params as any).facilityId);

  // Top-level hooks (stable order)
  const surveyQ = api.qal.getSurvey.useQuery({ id: surveyId });
  const lock = api.qal.lock.useMutation();
  const unlock = api.qal.unlock.useMutation();

  const overall = React.useMemo(() => Number(surveyQ.data?.survey.overallPercent ?? 0), [surveyQ.data]);
  const isLocked = Boolean(surveyQ.data?.survey.isLocked);

  const handleLock = async () => {
    try {
      await lock.mutateAsync({ surveyId });
      await surveyQ.refetch();
      toast.success("Survey locked");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to lock");
    }
  };

  const handleUnlock = async () => {
    try {
      await unlock.mutateAsync({ surveyId });
      await surveyQ.refetch();
      toast.success("Survey unlocked");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to unlock");
    }
  };

  return (
    <main className="p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">QAL Survey #{surveyId}</h1>
          <div className="text-sm text-muted-foreground">
            Facility: {facilityId} • Template: {surveyQ.data?.survey.templateId}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={overall >= 90 ? "default" : "secondary"}>{overall.toFixed(2)}%</Badge>
          {isLocked ? (
            <Button variant="destructive" onClick={handleUnlock} disabled={unlock.isPending}>
              {unlock.isPending ? "Unlocking..." : "Unlock"}
            </Button>
          ) : (
            <Button onClick={handleLock} disabled={lock.isPending}>
              {lock.isPending ? "Locking..." : "Lock"}
            </Button>
          )}
          <Link href={`/qal/surveys/${surveyId}/report`} className="text-sm underline">
            View Report
          </Link>
        </div>
      </div>

      <Separator />

      {!surveyQ.data ? null : (surveyQ.data.sections ?? []).map((row) => (
        <SectionCard
          key={row.id}
          surveyId={surveyId}
          sectionRowId={row.id}
          section={row.section!}
          isLocked={Boolean(surveyQ.data?.survey.isLocked)}
          refetchSurvey={surveyQ.refetch}
        />
      ))}
    </main>
  );
}

function SectionCard({
  surveyId,
  sectionRowId,
  section,
  isLocked,
  refetchSurvey,
}: {
  surveyId: number;
  sectionRowId: number;
  section: { id: number; title: string; description: string | null; possiblePoints: any };
  isLocked: boolean;
  refetchSurvey: () => Promise<any>;
}) {
  // Stable hook call: one per SectionCard
  const qs = api.qal.getSectionQuestions.useQuery({ surveyId, sectionId: section.id }, { placeholderData: (prev) => prev });
  const saveSection = api.qal.saveSection.useMutation();
  const saveAnswer = api.qal.saveQuestionAnswer.useMutation();

  // Derive counts from answers so toggling same question doesn't add sample
  const counts = React.useMemo(() => {
    const items = qs.data ?? [];
    let sample = 0;
    let passed = 0;
    for (const it of items) {
      const r = (it as any).answer?.result as QAOption | undefined;
      if (r === "pass") {
        sample += 1;
        passed += 1;
      } else if (r === "fail") {
        sample += 1;
      }
    }
    return { sample, passed };
  }, [qs.data]);

  const possible = Number(section.possiblePoints);
  const earnedLive = possible > 0 && counts.sample > 0 ? possible * (counts.passed / counts.sample) : 0;
  const pctLive = possible > 0 ? (100 * earnedLive) / possible : 100;
  const needsPOC = pctLive < 90;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{section.title}</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant={needsPOC ? "secondary" : "default"}>
              {earnedLive.toFixed(3)} / {possible} ({pctLive.toFixed(1)}%)
            </Badge>
          </div>
        </div>
        {section.description && (
          <p className="text-xs text-muted-foreground mt-1">{section.description}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Counts reflect derived answers; inputs are disabled because they’re computed */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground"># Sample</span>
            <Input className="w-24" type="number" min={0} value={counts.sample} disabled />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground"># Passed</span>
            <Input className="w-24" type="number" min={0} value={counts.passed} disabled />
          </div>
        </div>

        {!qs.data ? (
          <div className="text-sm text-muted-foreground">Loading questions...</div>
        ) : qs.data.length === 0 ? (
          <div className="text-sm text-muted-foreground">No questions configured for this section.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[60%]">Item</TableHead>
                <TableHead className="w-[40%]">Result</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {qs.data.map((qi) => {
                const serverResult = (qi as any).answer?.result as QAOption | undefined;

                const click = async (val: QAOption) => {
                  if (isLocked || saveAnswer.isPending) return;
                  try {
                    await saveAnswer.mutateAsync({ surveyId, questionId: qi.id, result: val });
                    await Promise.all([qs.refetch(), refetchSurvey()]);
                  } catch (e: any) {
                    toast.error(e?.message ?? "Failed to save");
                  }
                };

                const Btn = (val: QAOption, label: string) => (
                  <Button
                    key={val}
                    size="sm"
                    variant={serverResult === val ? "default" : "outline"}
                    className="min-w-16"
                    disabled={isLocked || saveAnswer.isPending}
                    onClick={() => click(val)}
                  >
                    {label}
                  </Button>
                );

                return (
                  <TableRow key={qi.id}>
                    <TableCell className="align-top">
                      <div className="font-medium">{qi.prompt}</div>
                      {qi.guidance && <div className="text-xs text-muted-foreground">{qi.guidance}</div>}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {Btn("pass", "Pass")}
                        {Btn("fail", "Fail")}
                        {Btn("na", "N/A")}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
