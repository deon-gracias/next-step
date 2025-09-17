"use client";

import { useParams } from "next/navigation";
import { api } from "@/trpc/react";
import { QISVHeader } from "../../_components/header";
import Link from "next/link";
import { buttonVariants, Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import React, { useMemo, useState, useEffect, useCallback, useRef } from "react";
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
import { Lock, Unlock, MessageCircle, Send, User, Clock, Download } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";

// Import jsPDF - you'll need to install it: npm install jspdf html2canvas
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

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

// Move CommentsSection outside the main component
const CommentsSection = ({
  comments,
  showComments,
  setShowComments,
  newComment,
  setNewComment,
  handleAddComment,
  addComment
}: {
  comments: any;
  showComments: boolean;
  setShowComments: (show: boolean) => void;
  newComment: string;
  setNewComment: (comment: string) => void;
  handleAddComment: () => void;
  addComment: any;
}) => (
  <div className="border-t mt-4 pt-4 pb-4">
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <MessageCircle className="h-4 w-4" />
        <span className="text-sm font-medium">Comments</span>
        {comments.data && comments.data.length > 0 && (
          <Badge variant="secondary" className="text-xs">
            {comments.data.length}
          </Badge>
        )}
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowComments(!showComments)}
      >
        {showComments ? "Hide" : "Show"} Comments
      </Button>
    </div>

    {showComments && (
      <div className="space-y-4">
        {/* Comments List with CSS scroll area */}
        <div className="custom-scroll-area">
          {comments.data && comments.data.length > 0 ? (
            <div className="space-y-3">
              {comments.data?.map((comment: any) => (
                <div key={comment.id} className="flex gap-3 p-3 rounded-lg bg-muted/50">
                  <div className="flex-shrink-0">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium">
                        {comment.author ? comment.author.name : "Unknown User"}
                      </span>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {comment.createdAt && format(new Date(comment.createdAt), "MMM dd, yyyy 'at' h:mm a")}
                      </div>
                    </div>
                    <p className="text-sm text-foreground break-words">
                      {comment.commentText}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-8">
              <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No comments yet. Be the first to add one!</p>
            </div>
          )}
        </div>

        {/* Add Comment */}
        <div className="flex gap-2">
          <Input
            placeholder="Add a comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleAddComment();
              }
            }}
            disabled={addComment.isPending}
          />
          <Button
            onClick={handleAddComment}
            disabled={!newComment.trim() || addComment.isPending}
            size="sm"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    )}
  </div>
);

export default function SurveyDetailPage() {
  const params = useParams();
  const surveyId = Number((params as any).surveyId);

  // Data
  const survey = api.survey.byId.useQuery({ id: surveyId });
  const residents = api.survey.listResidents.useQuery({ surveyId });
  const cases = api.survey.listCases.useQuery({ surveyId });

  // Get ALL questions without pagination
  const questions = api.question.list.useQuery(
    { templateId: survey.data?.templateId ?? -1 },
    { enabled: Boolean(survey.data?.templateId) }
  );

  // Comments
  const comments = api.pocComment.list.useQuery(
    {
      surveyId: surveyId,
      templateId: survey.data?.templateId ?? -1
    },
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
  const addComment = api.pocComment.create.useMutation({
    onSuccess: async () => {
      await utils.pocComment.list.invalidate({ surveyId, templateId: survey.data?.templateId ?? -1 });
      setNewComment("");
      toast.success("Comment added successfully");
    },
    onError: (e) => toast.error("Failed to add comment"),
  });

  // Local state
  const [sheetOpen, setSheetOpen] = useState(false);
  const [combinedPOC, setCombinedPOC] = useState("");
  const [hasAnyPOC, setHasAnyPOC] = useState(false);
  const [pocMap, setPocMap] = useState<Map<string, string>>(new Map());
  const [allResponses, setAllResponses] = useState<
    Array<{ residentId: number; questionId: number; status: StatusVal | null; findings: string | null }>
  >([]);
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  // PDF ref for hidden content
  const pdfContentRef = useRef<HTMLDivElement>(null);

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
        if (!cancelled) {
          setAllResponses(arr);
        }
      } catch (e) {
        console.error("Failed loading responses", e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [survey.data, residents.data, surveyId, utils.survey.listResponses]);

  // Fetch existing POCs for the survey
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!survey.data || !residents.data || residents.data.length === 0) {
        if (!cancelled) {
          setHasAnyPOC(false);
          setPocMap(new Map());
          setCombinedPOC("");
        }
        return;
      }

      try {
        const residentIds = residents.data.map((r) => r.residentId);
        const pocResults = await Promise.all(
          residentIds.map((rid) => utils.poc.list.fetch({ surveyId, residentId: rid }))
        );

        const newPocMap = new Map<string, string>();
        let foundAnyPOC = false;
        let firstPocText = "";

        // For each resident, collect POC text per question
        for (let i = 0; i < residentIds.length; i++) {
          const residentId = residentIds[i];
          const pocRows = pocResults[i] ?? [];

          for (const pocRow of pocRows) {
            if (pocRow.pocText && pocRow.pocText.trim()) {
              const key = `${residentId}-${pocRow.questionId}`;
              newPocMap.set(key, pocRow.pocText.trim());
              foundAnyPOC = true;
              if (!firstPocText) {
                firstPocText = pocRow.pocText.trim();
              }
            }
          }
        }

        if (!cancelled) {
          setPocMap(newPocMap);
          setHasAnyPOC(foundAnyPOC);
          setCombinedPOC(firstPocText);
        }
      } catch (error) {
        console.error("Failed to fetch POCs:", error);
        if (!cancelled) {
          setHasAnyPOC(false);
          setPocMap(new Map());
          setCombinedPOC("");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [survey.data, residents.data, surveyId, utils.poc.list]);

  // When sheet opens, set the POC text from the map
  useEffect(() => {
    if (sheetOpen && pocMap.size > 0) {
      const firstPocText = Array.from(pocMap.values())[0] || "";
      setCombinedPOC(firstPocText);
    }
  }, [sheetOpen, pocMap]);

  // Get all question IDs
  const allQuestionIds = useMemo(() => {
    return (questions.data ?? []).map((q) => q.id);
  }, [questions.data]);

  // Map responses by resident and question
  const byResident = useMemo(() => {
    const m = new Map<number, Map<number, ResponseCell>>();
    for (const r of allResponses) {
      const inner = m.get(r.residentId) ?? new Map<number, ResponseCell>();
      inner.set(r.questionId, { status: r.status, findings: r.findings });
      m.set(r.residentId, inner);
    }
    return m;
  }, [allResponses]);

  // Question strengths calculation
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

  // Progress calculation for each resident
  const residentProgress = useMemo(() => {
    const map = new Map<number, { answered: number; unanswered: number }>();
    if (!residents.data || allQuestionIds.length === 0) return map;

    for (const r of residents.data) {
      const ansMap = byResident.get(r.residentId) ?? new Map<number, ResponseCell>();
      let answered = 0;

      for (const qid of allQuestionIds) {
        const item = ansMap.get(qid);
        if (item?.status && (item.status === "met" || item.status === "unmet" || item.status === "not_applicable")) {
          answered += 1;
        }
      }

      const unanswered = allQuestionIds.length - answered;
      map.set(r.residentId, { answered, unanswered });
    }
    return map;
  }, [residents.data, allQuestionIds, byResident]);

  // Score calculation
  const { overallScore, maxTemplatePoints, overallPercent } = useMemo(() => {
    const qs: QuestionRow[] = (questions.data ?? []) as QuestionRow[];
    let awarded = 0;
    for (const q of qs) {
      let anyUnmetOrUnanswered = false;
      let anyMet = false;
      for (const r of residents.data ?? []) {
        const cell = byResident.get(r.residentId)?.get(q.id);
        if (!cell?.status) {
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

  // POC availability
  const isLocked = Boolean(survey.data?.isLocked);
  const scoreAllowsPOC = overallPercent < 85;
  const canOpenPOCSheet = isLocked && scoreAllowsPOC;

  // POC sheet blocks
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

  // Check if all questions are answered
  const allAnswered = useMemo(() => {
    if (!residents.data || !questions.data) return false;
    for (const r of residents.data) {
      const map = byResident.get(r.residentId) ?? new Map<number, ResponseCell>();
      for (const q of questions.data as QuestionRow[]) {
        const cell = map.get(q.id);
        if (!cell?.status || !["met", "unmet", "not_applicable"].includes(cell.status)) {
          return false;
        }
      }
    }
    return true;
  }, [residents.data, questions.data, byResident]);

  // Generate PDF function
  const handleDownloadPDF = useCallback(async () => {
    if (!survey.data || !hasAnyPOC) return;

    setIsGeneratingPDF(true);
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Header
      doc.setFontSize(20);
      doc.setFont("helvetica", "bold");
      doc.text("Plan of Correction Report", 20, 25);

      // Survey Details
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      let yPos = 45;

      doc.text(`Survey Number: #${surveyId}`, 20, yPos);
      yPos += 8;

      const facilityName = survey.data.facilityId || `Facility ${survey.data.facilityId}`;
      doc.text(`Facility: ${facilityName}`, 20, yPos);
      yPos += 8;

      const surveyorName = survey.data.surveyorId || `Surveyor ${survey.data.surveyorId}`;
      doc.text(`Surveyor: ${surveyorName}`, 20, yPos);
      yPos += 8;

      const templateName = survey.data.template?.name || `Template #${survey.data.templateId}`;
      doc.text(`Template: ${templateName}`, 20, yPos);
      yPos += 8;

      doc.text(`Generated: ${format(new Date(), "MMM dd, yyyy 'at' h:mm a")}`, 20, yPos);
      yPos += 15;

      // Plan of Correction Section
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("Plan of Correction", 20, yPos);
      yPos += 10;

      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");

      // Split POC text into lines that fit the page width
      const pocLines = doc.splitTextToSize(combinedPOC, 170);

      // Check if we need a new page
      if (yPos + (pocLines.length * 5) > 280) {
        doc.addPage();
        yPos = 20;
      }

      doc.text(pocLines, 20, yPos);
      yPos += pocLines.length * 5 + 15;

      // Comments Section
      if (comments.data && comments.data.length > 0) {
        // Check if we need a new page for comments
        if (yPos + 30 > 280) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.text("Comments", 20, yPos);
        yPos += 10;

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");

        for (const comment of comments.data) {
          // Check if we need a new page for this comment
          if (yPos + 25 > 280) {
            doc.addPage();
            yPos = 20;
          }

          // Comment author and date
          const authorName = comment.author?.name || "Unknown User";
          const commentDate = comment.createdAt ? format(new Date(comment.createdAt), "MMM dd, yyyy 'at' h:mm a") : "";

          doc.setFont("helvetica", "bold");
          doc.text(`${authorName} - ${commentDate}`, 20, yPos);
          yPos += 6;

          // Comment text
          doc.setFont("helvetica", "normal");
          const commentLines = doc.splitTextToSize(comment.commentText, 170);
          doc.text(commentLines, 20, yPos);
          yPos += commentLines.length * 4 + 8;
        }
      }

      // Unmet Questions Summary
      if (sheetBlocks.length > 0) {
        // Check if we need a new page
        if (yPos + 30 > 280) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.text("Questions Requiring Attention", 20, yPos);
        yPos += 10;

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");

        for (const block of sheetBlocks) {
          // Check if we need a new page for this block
          if (yPos + 30 > 280) {
            doc.addPage();
            yPos = 20;
          }

          // Question text
          doc.setFont("helvetica", "bold");
          const questionLines = doc.splitTextToSize(block.text, 170);
          doc.text(questionLines, 20, yPos);
          yPos += questionLines.length * 4 + 3;

          // Strength and F-Tags
          doc.setFont("helvetica", "normal");
          doc.text(`Strength: ${block.strengthPct}%`, 20, yPos);
          if (block.ftags.length > 0) {
            doc.text(`F-Tags: ${block.ftags.join(", ")}`, 90, yPos);
          }
          yPos += 6;

          // Residents with unmet
          doc.setFont("helvetica", "italic");
          doc.text("Residents with unmet:", 20, yPos);
          yPos += 4;

          doc.setFont("helvetica", "normal");
          for (const item of block.items) {
            doc.text(`• Resident ${item.residentId}`, 25, yPos);
            if (item.findings) {
              yPos += 4;
              const findingsLines = doc.splitTextToSize(`  Findings: ${item.findings}`, 160);
              doc.text(findingsLines, 25, yPos);
              yPos += findingsLines.length * 4;
            }
            yPos += 3;
          }
          yPos += 5;
        }
      }

      // Save the PDF
      doc.save(`POC_Report_Survey_${surveyId}_${format(new Date(), "yyyy-MM-dd")}.pdf`);
      toast.success("PDF downloaded successfully");

    } catch (error) {
      console.error("Failed to generate PDF:", error);
      toast.error("Failed to generate PDF");
    } finally {
      setIsGeneratingPDF(false);
    }
  }, [survey.data, hasAnyPOC, surveyId, combinedPOC, comments.data, sheetBlocks]);

  // Save POC handler
  const handleSaveCombinedPOC = useCallback(async () => {
    if (!survey.data || !canOpenPOCSheet) return;
    const templateId = survey.data.templateId;
    const text = combinedPOC.trim();
    if (!text) {
      toast.error("POC text cannot be empty");
      return;
    }

    try {
      const updates: Array<{ residentId: number; questionId: number }> = [];

      for (const r of residents.data ?? []) {
        const ansMap = byResident.get(r.residentId) ?? new Map<number, ResponseCell>();
        for (const q of questions.data ?? []) {
          const cell = ansMap.get(q.id);
          if (cell?.status === "unmet") {
            updates.push({ residentId: r.residentId, questionId: q.id });
          }
        }
      }

      if (updates.length === 0) {
        toast.error("No questions with unmet answers found");
        return;
      }

      await Promise.all(
        updates.map((update) =>
          pocUpsert.mutateAsync({
            surveyId,
            residentId: update.residentId,
            templateId,
            questionId: update.questionId,
            pocText: text,
          })
        )
      );

      const newPocMap = new Map(pocMap);
      updates.forEach(update => {
        const key = `${update.residentId}-${update.questionId}`;
        newPocMap.set(key, text);
      });
      setPocMap(newPocMap);
      setHasAnyPOC(true);

      const affectedResidents = Array.from(new Set(updates.map(u => u.residentId)));
      await Promise.all(affectedResidents.map((rid) => utils.poc.list.invalidate({ surveyId, residentId: rid })));

      setSheetOpen(false);
      toast.success("POC updated for unmet questions successfully");
    } catch (e) {
      console.error("Save combined POC failed", e);
      toast.error("Failed to save POC");
    }
  }, [survey.data, canOpenPOCSheet, combinedPOC, pocUpsert, utils.poc.list, surveyId, questions.data, residents.data, byResident, pocMap]);

  // Handle adding comment
  const handleAddComment = useCallback(async () => {
    if (!survey.data || !newComment.trim()) return;

    try {
      await addComment.mutateAsync({
        surveyId,
        templateId: survey.data.templateId,
        commentText: newComment.trim(),
      });
    } catch (e) {
      console.error("Failed to add comment", e);
    }
  }, [survey.data, newComment, addComment, surveyId]);

  // Loading state
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

  // Lock/Unlock button configuration
  const lockDisabled = !allAnswered || lockSurvey.isPending;
  const unlockDisabled = unlockSurvey.isPending;
  const lockDisabledReason = !allAnswered ? "Complete all questions for all residents to enable lock." : lockSurvey.isPending ? "Locking..." : "";

  // Lock/Unlock buttons component
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

  // POC control component
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
                <SheetDescription className="text-xs">
                  {hasAnyPOC ? "View and update the Plan of Correction for unmet questions." : "Generate a Plan of Correction for questions with unmet answers."}
                </SheetDescription>
              </SheetHeader>

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

              {/* Comments Section in POC Sheet */}
              {hasAnyPOC && (
                <div className="px-4">
                  <CommentsSection
                    comments={comments}
                    showComments={showComments}
                    setShowComments={setShowComments}
                    newComment={newComment}
                    setNewComment={setNewComment}
                    handleAddComment={handleAddComment}
                    addComment={addComment}
                  />
                </div>
              )}

              <div className="border-t">
                <div className="px-4 py-3">
                  <div className="text-xs text-muted-foreground mb-2">
                    This Plan of Correction will be applied only to questions with "unmet" status.
                  </div>
                  <Textarea
                    placeholder="Enter Plan of Correction"
                    value={combinedPOC}
                    onChange={(e) => setCombinedPOC(e.target.value)}
                    rows={4}
                    className="resize-y text-sm"
                  />
                </div>

                <SheetFooter className="px-4 py-3 flex items-center justify-between">
                  <div>
                    {hasAnyPOC && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleDownloadPDF}
                        disabled={isGeneratingPDF}
                        className="flex items-center gap-2"
                      >
                        <Download className="h-4 w-4" />
                        {isGeneratingPDF ? "Generating PDF..." : "Download PDF"}
                      </Button>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <SheetClose asChild>
                      <Button variant="ghost" size="sm">
                        Close
                      </Button>
                    </SheetClose>
                    <Button
                      size="sm"
                      onClick={handleSaveCombinedPOC}
                      disabled={pocUpsert.isPending || !combinedPOC.trim()}
                    >
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
      <style jsx>{`
        .custom-scroll-area {
          height: 240px;
          width: 100%;
          overflow-y: auto;
          border-radius: 0.375rem;
          border: 1px solid #e5e7eb;
          padding: 1rem;
        }

        .custom-scroll-area::-webkit-scrollbar {
          width: 8px;
        }

        .custom-scroll-area::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 4px;
        }

        .custom-scroll-area::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 4px;
        }

        .custom-scroll-area::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }

        /* Firefox scrollbar styling */
        .custom-scroll-area {
          scrollbar-width: thin;
          scrollbar-color: #cbd5e1 #f1f5f9;
        }
      `}</style>

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
              Survey #{surveyId}{" "}
              {survey.data.template && <Badge>{survey.data.template.type}</Badge>}
              {isLocked && <Badge variant="secondary">Locked</Badge>}
            </h1>
            <p className="text-sm text-muted-foreground">
              {survey.data.facilityId || `Facility ${survey.data.facilityId}`} ・ {survey.data.surveyorId || `Surveyor ${survey.data.surveyorId}`}
            </p>
          </div>

          <div className="ml-auto flex items-center gap-3">
            <div className="text-right mr-2">
              <div className="text-xs uppercase text-muted-foreground">Score</div>
              <div className="text-xl font-semibold">{`${overallScore} / ${maxTemplatePoints}`}</div>
            </div>
            <LockUnlockButtons />
            {renderPOCControl()}
          </div>
        </div>

        <Separator />

        {(survey.data.template?.type === "general" || survey.data.template?.type === "resident") && (
          <>
            {/* Template Information */}
            <div className="mb-4">
              <h2 className="text-xl font-bold">
                {survey.data.template?.name || `Template #${survey.data.templateId}`}
              </h2>
              <p className="text-sm text-muted-foreground">
                {allQuestionIds.length} questions • {residents.data.length} residents
              </p>
            </div>

            {/* Question Strengths */}
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
                  const progress = residentProgress.get(r.residentId) ?? { answered: 0, unanswered: allQuestionIds.length };
                  const totalQ = allQuestionIds.length || 1;
                  const pct = Math.round((progress.answered / totalQ) * 100);

                  return (
                    <TableRow key={r.id}>
                      <TableCell>{r.residentId}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {progress.answered} answered • {progress.unanswered} pending
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
            {/* Template Information */}
            <div className="mb-4">
              <h2 className="text-xl font-bold">
                {survey.data.template?.name || `Template #${survey.data.templateId}`}
              </h2>
              <p className="text-sm text-muted-foreground">
                {allQuestionIds.length} questions • {cases.data.length} cases
              </p>
            </div>

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
