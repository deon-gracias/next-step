"use client";

import { useParams } from "next/navigation";
import { api } from "@/trpc/react";
import { QISVHeader } from "../../_components/header";
import Link from "next/link";
import { buttonVariants, Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import React, { useMemo, useState, useEffect, useCallback } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { Lock, Unlock } from "lucide-react";
import { toast } from "sonner";

// Local minimal types to avoid any
type StatusVal = "met" | "unmet" | "not_applicable";
type ResponseCell = { status: StatusVal | null; findings: string | null };
type QuestionRow = { id: number; text: string; points?: number; ftags?: { code: string }[] };

type QuestionStrength = {
  questionId: number;
  text: string;
  points: number;
  strengthPct: number;
  metCount: number;
  unmetCount: number;
};

export default function SurveyDetailPage() {
  const params = useParams();
  const surveyId = Number((params as any).surveyId); // params is unknown in Next types; safe cast

  // Data
  const survey = api.survey.byId.useQuery({ id: surveyId });
  const residents = api.survey.listResidents.useQuery({ surveyId });
  const cases = api.survey.listCases.useQuery({ surveyId });
  const questions = api.question.list.useQuery(
    { templateId: survey.data?.templateId ?? -1, page: 1, pageSize: 1000 },
    { enabled: Boolean(survey.data?.templateId) }
  );

  // Mutations
  const utils = api.useUtils();
  const lockSurvey = api.survey.lock.useMutation({
    onSuccess: async () => {
      await utils.survey.byId.invalidate({ id: surveyId });
      toast.success("Survey locked");
    },
    onError: (e) => toast.error((e as { message?: string })?.message ?? "Failed to lock survey"),
  });
  const unlockSurvey = api.survey.unlock.useMutation({
    onSuccess: async () => {
      await utils.survey.byId.invalidate({ id: surveyId });
      toast.success("Survey unlocked");
    },
    onError: (e) => toast.error((e as { message?: string })?.message ?? "Failed to unlock survey"),
  });
  const pocUpsert = api.poc.upsert.useMutation();

  // Local state
  const [sheetOpen, setSheetOpen] = useState(false);
  const [combinedPOC, setCombinedPOC] = useState("");
  const [hasAnyPOC, setHasAnyPOC] = useState(false);
  const [allResponses, setAllResponses] = useState<
    Array<{ residentId: number; questionId: number; status: StatusVal | null; findings: string | null }>
  >([]);

  // Fetch all responses across residents
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!survey.data || !residents.data) return;
      try {
        const arr: Array<{ residentId: number; questionId: number; status: StatusVal | null; findings: string | null }> = [];
        await Promise.all(
          residents.data.map(async (r) => {
            const rows = await utils.survey.listResponses.fetch({ surveyId, residentId: r.residentId });
            for (const rr of rows ?? []) {
              arr.push({
                residentId: r.residentId,
                questionId: rr.questionId,
                status: (rr.requirementsMetOrUnmet as StatusVal) ?? null,
                findings: rr.findings ?? null,
              });
            }
          })
        );
        if (!cancelled) setAllResponses(arr);
      } catch (e) {
        // log only
        console.error("Failed loading responses", e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [survey.data, residents.data, surveyId, utils.survey.listResponses]);

  // Lookups
  const allQuestionIds = useMemo(() => (questions.data ?? []).map((q) => q.id), [questions.data]);

  const byResident = useMemo(() => {
    const m = new Map<number, Map<number, ResponseCell>>();
    for (const r of allResponses) {
      const inner = m.get(r.residentId) ?? new Map<number, ResponseCell>();
      if (r.status) inner.set(r.questionId, { status: r.status, findings: r.findings });
      m.set(r.residentId, inner);
    }
    return m;
  }, [allResponses]);

  // Strength tiles
  const questionStrengths: QuestionStrength[] = useMemo(() => {
    const qrows: QuestionRow[] = (questions.data ?? []) as QuestionRow[];
    if (qrows.length === 0) return [];
    const metByQ = new Map<number, number>();
    const unmetByQ = new Map<number, number>();
    for (const q of qrows) {
      metByQ.set(q.id, 0);
      unmetByQ.set(q.id, 0);
    }
    for (const r of allResponses) {
      if (!metByQ.has(r.questionId)) continue;
      if (r.status === "met") metByQ.set(r.questionId, (metByQ.get(r.questionId) ?? 0) + 1);
      else if (r.status === "unmet") unmetByQ.set(r.questionId, (unmetByQ.get(r.questionId) ?? 0) + 1);
    }
    const out: QuestionStrength[] = [];
    for (const q of qrows) {
      const met = metByQ.get(q.id) ?? 0;
      const unmet = unmetByQ.get(q.id) ?? 0;
      const denom = met + unmet;
      out.push({
        questionId: q.id,
        text: q.text,
        points: q.points ?? 0,
        strengthPct: denom === 0 ? 0 : Math.round((met / denom) * 100),
        metCount: met,
        unmetCount: unmet,
      });
    }
    return out;
  }, [questions.data, allResponses]);

  // Progress table (kept in case needed elsewhere)
  const residentProgress = useMemo(() => {
    const map = new Map<number, { answered: number; unanswered: number }>();
    if (!residents.data || allQuestionIds.length === 0) return map;
    for (const r of residents.data) {
      const ansMap = byResident.get(r.residentId) ?? new Map<number, ResponseCell>();
      let answered = 0;
      for (const qid of allQuestionIds) {
        const item = ansMap.get(qid);
        if (item?.status) answered += 1;
      }
      map.set(r.residentId, { answered, unanswered: allQuestionIds.length - answered });
    }
    return map;
  }, [residents.data, allQuestionIds, byResident]);

  // Score and percent (for POC gating)
  const { overallScore, maxTemplatePoints, overallPercent } = useMemo(() => {
    const qs: QuestionRow[] = (questions.data ?? []) as QuestionRow[];
    let awarded = 0;
    for (const q of qs) {
      let anyUnmetOrUnanswered = false;
      let anyMet = false;
      for (const r of residents.data ?? []) {
        const cell = byResident.get(r.residentId)?.get(q.id);
        if (!cell) {
          anyUnmetOrUnanswered = true;
          break;
        }
        if (cell.status === "unmet") {
          anyUnmetOrUnanswered = true;
          break;
        }
        if (cell.status === "met") anyMet = true;
      }
      if (!anyUnmetOrUnanswered && anyMet) awarded += q.points ?? 0;
    }
    const max = qs.reduce((s, q) => s + (q.points ?? 0), 0);
    const pct = max > 0 ? Math.round((awarded / max) * 100) : 0;
    return { overallScore: awarded, maxTemplatePoints: max, overallPercent: pct };
  }, [questions.data, byResident, residents.data]);

  // POC availability requires LOCKED + score < 85
  const isLocked = Boolean(survey.data?.isLocked);
  const scoreAllowsPOC = overallPercent < 85;
  const canOpenPOCSheet = isLocked && scoreAllowsPOC;

  // Sheet blocks: all questions with >=1 UNMET
  const sheetBlocks = useMemo(() => {
    const qrows: QuestionRow[] = (questions.data ?? []) as QuestionRow[];
    if (qrows.length === 0 || !canOpenPOCSheet) return [] as Array<{
      qid: number;
      text: string;
      ftags: string[];
      strengthPct: number;
      items: Array<{ residentId: number; findings: string | null }>;
    }>;
    const blocks: Array<{
      qid: number;
      text: string;
      ftags: string[];
      strengthPct: number;
      items: Array<{ residentId: number; findings: string | null }>;
    }> = [];
    for (const q of qrows) {
      const items: Array<{ residentId: number; findings: string | null }> = [];
      for (const r of residents.data ?? []) {
        const cell = byResident.get(r.residentId)?.get(q.id);
        if (cell?.status === "unmet") items.push({ residentId: r.residentId, findings: cell.findings ?? null });
      }
      if (items.length > 0) {
        const ftags = (q.ftags ?? []).map((f) => f.code);
        const s = questionStrengths.find((x) => x.questionId === q.id)?.strengthPct ?? 0;
        blocks.push({ qid: q.id, text: q.text, ftags, strengthPct: s, items });
      }
    }
    return blocks;
  }, [questions.data, canOpenPOCSheet, byResident, residents.data, questionStrengths]);

  // Detect if ANY POC exists for this survey to flip button label to "View POC"
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!survey.data) {
        if (!cancelled) setHasAnyPOC(false);
        return;
      }
      try {
        const residentIds = (residents.data ?? []).map((r) => r.residentId);
        if (residentIds.length === 0) {
          if (!cancelled) setHasAnyPOC(false);
          return;
        }
        const results = await Promise.all(residentIds.map((rid) => utils.poc.list.fetch({ surveyId, residentId: rid })));
        let found = false;
        outer: for (const rows of results) {
          for (const row of rows ?? []) {
            if ((row.pocText ?? "").trim()) {
              found = true;
              break outer;
            }
          }
        }
        if (!cancelled) setHasAnyPOC(found);
      } catch {
        if (!cancelled) setHasAnyPOC(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [survey.data, residents.data, surveyId, utils.poc.list]);

  // Completion gate for Lock
  const allAnswered = useMemo(() => {
    if (!residents.data || !questions.data) return false;
    for (const r of residents.data) {
      const map = byResident.get(r.residentId) ?? new Map<number, ResponseCell>();
      for (const q of questions.data as QuestionRow[]) {
        const cell = map.get(q.id);
        if (!cell?.status) return false;
      }
    }
    return true;
  }, [residents.data, questions.data, byResident]);

  // Save POC
  const handleSaveCombinedPOC = useCallback(async () => {
    if (!survey.data || !canOpenPOCSheet) return;
    const templateId = survey.data.templateId;
    const text = combinedPOC.trim();
    if (!text || sheetBlocks.length === 0) {
      setSheetOpen(false);
      return;
    }
    try {
      await Promise.all(
        sheetBlocks.map(async (blk) => {
          await Promise.all(
            blk.items.map((it) =>
              pocUpsert.mutateAsync({
                surveyId,
                residentId: it.residentId,
                templateId,
                questionId: blk.qid,
                pocText: text,
              })
            )
          );
        })
      );
      const affected = Array.from(new Set(sheetBlocks.flatMap((b) => b.items.map((x) => x.residentId))));
      await Promise.all(affected.map((rid) => utils.poc.list.invalidate({ surveyId, residentId: rid })));
      setSheetOpen(false);
      setHasAnyPOC(true);
    } catch (e) {
      console.error("Save combined POC failed", e);
    }
  }, [survey.data, canOpenPOCSheet, sheetBlocks, combinedPOC, pocUpsert, utils.poc.list, surveyId]);

  // Loading
  if (!survey.data || !residents.data || !cases.data) {
    return (
      <>
        <QISVHeader crumbs={[{ label: "Surveys", href: "/qisv/surveys" }, { label: `Survey #${surveyId}` }]} />
        <main className="space-y-4 p-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-32 w-full" />
        </main>
      </>
    );
  }

  // Lock/Unlock: anyone can click; lock requires allAnswered; unlock has no precondition
  const lockDisabled = !allAnswered || lockSurvey.isPending;
  const unlockDisabled = unlockSurvey.isPending;
  const lockDisabledReason = !allAnswered ? "Complete all questions for all residents to enable lock." : lockSurvey.isPending ? "Locking..." : "";

  const LockUnlockButtons = () => {
    if (!isLocked) {
      return (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <div className="relative group">
              <Button variant="default" disabled={lockDisabled} className={cn(lockDisabled && "cursor-not-allowed opacity-60")}>
                <Lock className="mr-2 h-4 w-4" />
                Lock Survey
              </Button>
              {lockDisabled && lockDisabledReason && (
                <div className="pointer-events-none absolute -bottom-8 right-0 hidden rounded bg-popover px-2 py-1 text-[11px] text-popover-foreground shadow group-hover:block">
                  {lockDisabledReason}
                </div>
              )}
            </div>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Lock survey?</AlertDialogTitle>
              <AlertDialogDescription>Once locked, edits to this survey will be disabled until it is unlocked.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  void lockSurvey.mutate({ surveyId });
                }}
                disabled={lockSurvey.isPending}
              >
                {lockSurvey.isPending ? "Locking..." : "Confirm Lock"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      );
    }
    return (
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="destructive" disabled={unlockDisabled}>
            <Unlock className="mr-2 h-4 w-4" />
            Unlock Survey
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unlock survey?</AlertDialogTitle>
            <AlertDialogDescription>Unlocking will allow edits again. Continue?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                void unlockSurvey.mutate({ surveyId });
              }}
              disabled={unlockSurvey.isPending}
            >
              {unlockSurvey.isPending ? "Unlocking..." : "Confirm Unlock"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  };

  // POC button logic
  const renderPOCControl = () => {
    if (!isLocked) return null;
    if (!scoreAllowsPOC) {
      return <div className="text-xs text-muted-foreground">POC available only when score is below 85%.</div>;
    }
    const label = hasAnyPOC ? "View POC" : "Generate POC";
    return (
      <div className="relative group">
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <Button variant="default">{label}</Button>
          </SheetTrigger>

          <SheetContent className="w-full sm:max-w-4xl p-0">
            <div className="flex h-full flex-col">
              <SheetHeader className="px-4 pt-3 pb-1">
                <SheetTitle className="text-base">{label}</SheetTitle>
                <SheetDescription className="text-xs">Questions with at least one unmet and their residents.</SheetDescription>
              </SheetHeader>

              {/* Compact scrollable list */}
              <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
                {sheetBlocks.length === 0 ? (
                  <div className="text-xs text-muted-foreground mt-2">No questions have unmet answers.</div>
                ) : (
                  sheetBlocks.map((blk) => (
                    <Card key={blk.qid} className="rounded-md">
                      <CardHeader className="py-2 px-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm leading-5">{blk.text}</CardTitle>
                          <div className="text-[11px] text-muted-foreground">Strength: {blk.strengthPct}%</div>
                        </div>
                        {blk.ftags.length > 0 && <div className="text-[11px] text-muted-foreground pt-0.5">F‑Tags: {blk.ftags.join(", ")}</div>}
                      </CardHeader>
                      <CardContent className="pt-0 px-3 pb-2">
                        <div className="text-[12px] font-medium mb-1">Residents with unmet:</div>
                        <div className="grid gap-1">
                          {blk.items.map((it) => (
                            <div key={`${blk.qid}-${it.residentId}`} className="border rounded-md px-2 py-1 text-[12px] leading-5">
                              <div className="font-medium">Resident {it.residentId}</div>
                              {it.findings && (
                                <div className="text-[11px] leading-4">
                                  <span className="text-muted-foreground">Findings:</span> {it.findings}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>

              {/* Editor + Footer */}
              <div className="border-t">
                <div className="px-4 py-3">
                  <Textarea
                    placeholder="Enter Plan of Correction"
                    value={combinedPOC}
                    onChange={(e) => setCombinedPOC(e.target.value)}
                    rows={4}
                    className="resize-y text-sm"
                  />
                </div>

                <SheetFooter className="px-4 py-3 flex items-center justify-between">
                  <div />
                  <div className="flex items-center gap-2">
                    <SheetClose asChild>
                      <Button variant="ghost" size="sm">
                        Close
                      </Button>
                    </SheetClose>
                    <Button size="sm" onClick={handleSaveCombinedPOC} disabled={pocUpsert.isPending || sheetBlocks.length === 0}>
                      {pocUpsert.isPending ? "Saving..." : hasAnyPOC ? "Update POC" : "Save POC"}
                    </Button>
                  </div>
                </SheetFooter>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    );
  };

  return (
    <>
      <QISVHeader
        crumbs={[
          { label: "Surveys", href: "/qisv/surveys" },
          { label: `Survey #${surveyId}` },
        ]}
      />

      <main className="p-6 space-y-6">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="mb-1 flex items-center gap-2 text-2xl font-bold">
              Survey #{surveyId} – {survey.data.templateId}{" "}
              {survey.data.template && <Badge>{survey.data.template.type}</Badge>}
              {isLocked && <Badge variant="secondary">Locked</Badge>}
            </h1>
            <p className="text-sm text-muted-foreground">
              Facility&nbsp;{survey.data.facilityId} ・ Surveyor&nbsp;{survey.data.surveyorId}
            </p>
          </div>

          <div className="ml-auto flex items-center gap-3">
            {/* Score (raw only, no %) */}
            <div className="text-right mr-2">
              <div className="text-xs uppercase text-muted-foreground">Score</div>
              <div className="text-xl font-semibold">{`${overallScore} / ${maxTemplatePoints}`}</div>
            </div>
            <LockUnlockButtons />
            {renderPOCControl()}
          </div>
        </div>

        <Separator />

        {survey.data.template?.type === "resident" && (
          <>
            {/* Strengths */}
            <div className="rounded-md border p-3">
              <div className="text-sm font-medium mb-2">Question Strengths</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {questionStrengths.map((qs) => (
                  <div
                    key={qs.questionId}
                    className={cn(
                      "border px-3 py-2 rounded-md text-xs",
                      qs.strengthPct < 85 ? "bg-amber-50 border-amber-200" : "bg-muted"
                    )}
                  >
                    <div className="font-semibold line-clamp-1">{qs.text}</div>
                    <div className="mt-1">Strength: {qs.strengthPct}%</div>
                    <div className="text-muted-foreground">Met: {qs.metCount} ・ Unmet: {qs.unmetCount}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Residents */}
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Residents</h2>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">Resident</TableHead>
                  <TableHead className="w-[160px]">Progress</TableHead>
                  <TableHead className="text-right w-[120px]">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {residents.data.map((r) => {
                  const ansMap = byResident.get(r.residentId) ?? new Map<number, ResponseCell>();
                  let answered = 0;
                  for (const qid of allQuestionIds) {
                    const item = ansMap.get(qid);
                    if (item?.status) answered += 1;
                  }
                  const totalQ = allQuestionIds.length || 1;
                  const pct = Math.round((answered / totalQ) * 100);
                  return (
                    <TableRow key={r.id}>
                      <TableCell>{r.residentId}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {answered} answered • {totalQ - answered} pending
                        </div>
                        <div className="mt-1 h-2 w-full rounded bg-muted overflow-hidden">
                          <div className="h-2 bg-primary" style={{ width: `${pct}%` }} />
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Link
                          href={`/qisv/surveys/${surveyId}/resident/${r.residentId}`}
                          className={buttonVariants({ variant: "outline", size: "sm" })}
                        >
                          Open
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </>
        )}

        {survey.data.template?.type === "case" && (
          <>
            <h2 className="mb-3 text-xl font-semibold">Cases</h2>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Case ID</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cases.data.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.caseCode}</TableCell>
                    <TableCell className="text-right">
                      <Link href={`/qisv/surveys/${surveyId}/case/${r.id}`} className={buttonVariants({ variant: "outline" })}>
                        Open
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
        )}
      </main>
    </>
  );
}
