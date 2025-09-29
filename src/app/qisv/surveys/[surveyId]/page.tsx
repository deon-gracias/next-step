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
import { Lock, Unlock, MessageCircle, Send, User, Clock, Download, Calendar, AlertTriangle, Users, FileText, Tag, BuildingIcon } from "lucide-react";
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

// Helper component to display facility information
const FacilityInfo = ({ facilityId }: { facilityId: number }) => {
  const facility = api.facility.byId.useQuery(
    { id: facilityId },
    { enabled: facilityId > 0 }
  );

  if (facility.isPending) {
    return (
      <div className="flex items-center gap-2">
        <BuildingIcon className="h-4 w-4 text-green-600" />
        <Skeleton className="h-4 w-32" />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <BuildingIcon className="h-4 w-4 text-green-600" />
      <span>{facility.data?.name || `Facility ID: ${facilityId}`}</span>
    </div>
  );
};

// Helper component to display surveyor information
const SurveyorInfo = ({ surveyorId }: { surveyorId: string }) => {
  const surveyor = api.user.byId.useQuery(
    { id: surveyorId },
    { enabled: Boolean(surveyorId) }
  );

  if (surveyor.isPending) {
    return (
      <div className="flex items-center gap-2">
        <User className="h-4 w-4 text-blue-600" />
        <Skeleton className="h-4 w-32" />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <User className="h-4 w-4 text-blue-600" />
      <span>
        {surveyor.data?.name || surveyor.data?.email || `User ID: ${surveyorId}`}
      </span>
    </div>
  );
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
  <div className="border-t bg-slate-50/50 mt-6 pt-6">
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
          <MessageCircle className="h-4 w-4 text-blue-600" />
        </div>
        <div>
          <span className="text-sm font-semibold text-gray-900">Discussion</span>
          {comments.data && comments.data.length > 0 && (
            <Badge variant="secondary" className="ml-2 text-xs bg-blue-100 text-blue-800">
              {comments.data.length} comment{comments.data.length !== 1 ? 's' : ''}
            </Badge>
          )}
        </div>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowComments(!showComments)}
        className="text-gray-600 hover:text-gray-900"
      >
        {showComments ? "Hide" : "Show"} Comments
      </Button>
    </div>

    {showComments && (
      <div className="space-y-4">
        <div className="max-h-60 overflow-y-auto space-y-3 bg-white rounded-lg border p-4">
          {comments.data && comments.data.length > 0 ? (
            comments.data.map((comment: any) => (
              <div key={comment.id} className="flex gap-3 p-3 rounded-lg bg-gray-50 border">
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                    <User className="h-4 w-4 text-white" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-gray-900">
                      {comment.author ? comment.author.name : "Unknown User"}
                    </span>
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Clock className="h-3 w-3" />
                      {comment.createdAt && format(new Date(comment.createdAt), "MMM dd, yyyy 'at' h:mm a")}
                    </div>
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {comment.commentText}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center text-gray-500 py-8">
              <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No comments yet. Start the discussion!</p>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <Input
            placeholder="Add your comment here..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleAddComment();
              }
            }}
            disabled={addComment.isPending}
            className="flex-1"
          />
          <Button
            onClick={handleAddComment}
            disabled={!newComment.trim() || addComment.isPending}
            size="sm"
            className="px-4"
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

  // Data - fetch residents for all template types
  const survey = api.survey.byId.useQuery({ id: surveyId });
  const residents = api.survey.listResidents.useQuery({ surveyId });
  const cases = api.survey.listCases.useQuery({ surveyId });

  // Fetch facility and surveyor data separately
  const facility = api.facility.byId.useQuery(
    { id: survey.data?.facilityId ?? -1 },
    { enabled: Boolean(survey.data?.facilityId) }
  );

  const surveyor = api.user.byId.useQuery(
    { id: survey.data?.surveyorId ?? "" },
    { enabled: Boolean(survey.data?.surveyorId) }
  );

  const surveyCompletion = api.survey.checkCompletion.useQuery(
    { surveyId },
    {
      enabled: Boolean(surveyId),
      refetchInterval: 3000, // Refresh every 3 seconds
    }
  );

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

  // NEW: POC generation mutation
  const markPocGenerated = api.survey.markPocGenerated.useMutation({
    onSuccess: async () => {
      await utils.survey.byId.invalidate({ id: surveyId });
      toast.success("POC generation enabled successfully");
    },
    onError: (e) => toast.error((e as { message?: string })?.message ?? "Failed to enable POC generation"),
  });

  const pocUpsert = api.poc.upsert.useMutation();
  const docUpsert = api.doc.upsert.useMutation();
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

  // DOC state
  const [combinedDOC, setCombinedDOC] = useState<Date | null>(null);
  const [hasAnyDOC, setHasAnyDOC] = useState(false);
  const [docMap, setDocMap] = useState<Map<string, Date>>(new Map());

  // ✅ Updated to include both resident and case responses
  const [allResponses, setAllResponses] = useState<
    Array<{ 
      residentId: number | null; 
      surveyCaseId: number | null;
      questionId: number; 
      status: StatusVal | null; 
      findings: string | null 
    }>
  >([]);
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  // PDF ref for hidden content
  const pdfContentRef = useRef<HTMLDivElement>(null);

  // ✅ Updated: Fetch all responses across residents AND cases
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!survey.data) return;
      try {
        const arr: Array<{ 
          residentId: number | null; 
          surveyCaseId: number | null;
          questionId: number; 
          status: StatusVal | null; 
          findings: string | null 
        }> = [];

        // Fetch resident responses
        if (residents.data) {
          await Promise.all(
            residents.data.map(async (r) => {
              const rows = await utils.survey.listResponses.fetch({ 
                surveyId, 
                residentId: r.residentId 
              });
              for (const rr of rows ?? []) {
                arr.push({
                  residentId: r.residentId,
                  surveyCaseId: null,
                  questionId: rr.questionId,
                  status: (rr.requirementsMetOrUnmet as StatusVal) ?? null,
                  findings: rr.findings ?? null,
                });
              }
            })
          );
        }

        // ✅ NEW: Fetch case responses
        if (cases.data) {
          await Promise.all(
            cases.data.map(async (c) => {
              const rows = await utils.survey.listResponses.fetch({ 
                surveyId, 
                surveyCaseId: c.id 
              });
              for (const rr of rows ?? []) {
                arr.push({
                  residentId: null,
                  surveyCaseId: c.id,
                  questionId: rr.questionId,
                  status: (rr.requirementsMetOrUnmet as StatusVal) ?? null,
                  findings: rr.findings ?? null,
                });
              }
            })
          );
        }

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
  }, [survey.data, residents.data, cases.data, surveyId, utils.survey.listResponses]); // ✅ Added cases.data

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

  // Fetch existing DOCs for the survey
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!survey.data || !residents.data || residents.data.length === 0) {
        if (!cancelled) {
          setHasAnyDOC(false);
          setDocMap(new Map());
          setCombinedDOC(null);
        }
        return;
      }

      try {
        const residentIds = residents.data.map((r) => r.residentId);
        const docResults = await Promise.all(
          residentIds.map((rid) => utils.doc.list.fetch({ surveyId, residentId: rid }))
        );

        const newDocMap = new Map<string, Date>();
        let foundAnyDOC = false;
        let firstDocDate: Date | null = null;

        // For each resident, collect DOC dates per question
        for (let i = 0; i < residentIds.length; i++) {
          const residentId = residentIds[i];
          const docRows = docResults[i] ?? [];

          for (const docRow of docRows) {
            if (docRow.complianceDate) {
              const key = `${residentId}-${docRow.questionId}`;
              const docDate = new Date(docRow.complianceDate);
              newDocMap.set(key, docDate);
              foundAnyDOC = true;
              if (!firstDocDate) {
                firstDocDate = docDate;
              }
            }
          }
        }

        if (!cancelled) {
          setDocMap(newDocMap);
          setHasAnyDOC(foundAnyDOC);
          setCombinedDOC(firstDocDate);
        }
      } catch (error) {
        console.error("Failed to fetch DOCs:", error);
        if (!cancelled) {
          setHasAnyDOC(false);
          setDocMap(new Map());
          setCombinedDOC(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [survey.data, residents.data, surveyId, utils.doc.list]);

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

  // ✅ Updated: Map responses by resident AND case
  const byEntity = useMemo(() => {
    const m = new Map<string, Map<number, ResponseCell>>();
    for (const r of allResponses) {
      // Create unique key for resident or case
      const entityKey = r.residentId ? `resident-${r.residentId}` : `case-${r.surveyCaseId}`;
      const inner = m.get(entityKey) ?? new Map<number, ResponseCell>();
      inner.set(r.questionId, { status: r.status, findings: r.findings });
      m.set(entityKey, inner);
    }
    return m;
  }, [allResponses]);

  // Keep original byResident for backward compatibility
  const byResident = useMemo(() => {
    const m = new Map<number, Map<number, ResponseCell>>();
    for (const r of allResponses) {
      if (r.residentId) {
        const inner = m.get(r.residentId) ?? new Map<number, ResponseCell>();
        inner.set(r.questionId, { status: r.status, findings: r.findings });
        m.set(r.residentId, inner);
      }
    }
    return m;
  }, [allResponses]);

  // ✅ Updated: Question strengths calculation including case responses
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

  // ✅ Updated: Score calculation including both residents and cases
  const { overallScore, maxTemplatePoints, overallPercent } = useMemo(() => {
    const qs: QuestionRow[] = (questions.data ?? []) as QuestionRow[];
    let awarded = 0;
    
    for (const q of qs) {
      let anyUnmetOrUnanswered = false;
      let anyMet = false;
      
      // Check resident responses
      for (const r of residents.data ?? []) {
        const cell = byEntity.get(`resident-${r.residentId}`)?.get(q.id);
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
      
      // ✅ NEW: Check case responses
      if (!anyUnmetOrUnanswered) {
        for (const c of cases.data ?? []) {
          const cell = byEntity.get(`case-${c.id}`)?.get(q.id);
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
      }
      
      if (!anyUnmetOrUnanswered && anyMet) awarded += q.points ?? 0;
    }
    
    const max = qs.reduce((s, q) => s + (q.points ?? 0), 0);
    const pct = max > 0 ? Math.round((awarded / max) * 100) : 0;
    return { overallScore: awarded, maxTemplatePoints: max, overallPercent: pct };
  }, [questions.data, byEntity, residents.data, cases.data]); // ✅ Updated dependencies

  // POC availability - UPDATED LOGIC
  const isLocked = Boolean(survey.data?.isLocked);
  const pocGenerated = Boolean(survey.data?.pocGenerated);
  const scoreAllowsPOC = overallPercent < 85;
  const canOpenPOCSheet = isLocked && pocGenerated && scoreAllowsPOC;

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
  const allAnswered = surveyCompletion.data?.isComplete ?? false;

  useEffect(() => {
    if (surveyCompletion.data) {
      console.log('Survey completion status:', surveyCompletion.data);
    }
  }, [surveyCompletion.data]);

  // Generate PDF function (keeping the same)
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

      // Display facility name instead of ID
      const facilityName = facility.data?.name || `Facility ID: ${survey.data.facilityId}`;
      doc.text(`Facility: ${facilityName}`, 20, yPos);
      yPos += 8;

      // Display surveyor name instead of ID
      const surveyorName = surveyor.data?.name || surveyor.data?.email || `User ID: ${survey.data.surveyorId}`;
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

      // DOC SECTION TO PDF
      if (hasAnyDOC && combinedDOC) {
        if (yPos + 20 > 280) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.text("Date of Compliance", 20, yPos);
        yPos += 10;

        doc.setFontSize(11);
        doc.setFont("helvetica", "normal");
        doc.text(`Compliance Date: ${format(combinedDOC, "MMM dd, yyyy")}`, 20, yPos);
        yPos += 15;
      }

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
  }, [survey.data, hasAnyPOC, surveyId, combinedPOC, comments.data, sheetBlocks, hasAnyDOC, combinedDOC, facility.data, surveyor.data]);

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

  // DOC save handler
  const handleSaveCombinedDOC = useCallback(async () => {
    if (!survey.data || !canOpenPOCSheet || !combinedDOC) return;
    const templateId = survey.data.templateId;

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

      if (!combinedDOC) return;
      // Convert Date to YYYY-MM-DD string format
      const complianceDateString = combinedDOC.toISOString().split('T')[0];
      if (!complianceDateString) return;

      await Promise.all(
        updates.map((update) =>
          docUpsert.mutateAsync({
            surveyId,
            residentId: update.residentId,
            templateId,
            questionId: update.questionId,
            complianceDate: complianceDateString,
          })
        )
      );

      const newDocMap = new Map(docMap);
      updates.forEach(update => {
        const key = `${update.residentId}-${update.questionId}`;
        newDocMap.set(key, combinedDOC);
      });
      setDocMap(newDocMap);
      setHasAnyDOC(true);

      const affectedResidents = Array.from(new Set(updates.map(u => u.residentId)));
      await Promise.all(affectedResidents.map((rid) => utils.doc.list.invalidate({ surveyId, residentId: rid })));

      toast.success("Date of Compliance updated for unmet questions successfully");
    } catch (e) {
      console.error("Save combined DOC failed", e);
      toast.error("Failed to save Date of Compliance");
    }
  }, [survey.data, canOpenPOCSheet, combinedDOC, docUpsert, utils.doc.list, surveyId, questions.data, residents.data, byResident, docMap]);

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
                  if (!allAnswered) {
                    toast.error("Please complete all questions before locking the survey");
                    return;
                  }
                  lockSurvey.mutate({ surveyId: surveyId });
                }}
                disabled={lockDisabled}
                className={cn(
                  "px-6 py-2.5 font-medium rounded-md transition-all duration-200 flex items-center gap-2",
                  allAnswered
                    ? "bg-red-600 hover:bg-red-700 text-white shadow-md hover:shadow-lg active:bg-red-800 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                    : "bg-red-200 text-red-400 cursor-not-allowed"
                )}
              >
                {lockSurvey.isPending ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    <span>Locking...</span>
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4" />
                    <span>Lock Survey</span>
                  </>
                )}
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

  // POC control component - UPDATED LOGIC
  const renderPOCControl = () => {
    if (!isLocked) return null;
    
    if (!scoreAllowsPOC) {
      return (
        <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg border border-amber-200">
          <AlertTriangle className="h-4 w-4" />
          POC available when score is below 85%
        </div>
      );
    }

    // NEW: Show generate POC button if not generated yet
    if (!pocGenerated) {
      return (
        <div className="flex items-center gap-3">
          <div className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg border border-amber-200">
            <AlertTriangle className="h-4 w-4 inline mr-1" />
            POC not generated yet
          </div>
          <Button
            onClick={() => {
              markPocGenerated.mutate({ surveyId });
            }}
            disabled={markPocGenerated.isPending}
            variant="default"
            className="bg-red-600 hover:bg-red-700"
          >
            <FileText className="mr-2 h-4 w-4" />
            {markPocGenerated.isPending ? "Generating..." : "Generate POC"}
          </Button>
        </div>
      );
    }

    // Existing POC sheet logic when pocGenerated is true
    const label = hasAnyPOC ? "View POC" : "Create POC";
    const totalUnmetQuestions = sheetBlocks.length;
    const totalUnmetResidents = Array.from(new Set(sheetBlocks.flatMap(block => block.items.map(item => item.residentId)))).length;

    return (
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetTrigger asChild>
          <Button variant="default" className="bg-red-600 hover:bg-red-700">
            <FileText className="mr-2 h-4 w-4" />
            {label}
            {totalUnmetQuestions > 0 && (
              <Badge variant="secondary" className="ml-2 bg-red-100 text-red-800">
                {totalUnmetQuestions}
              </Badge>
            )}
          </Button>
        </SheetTrigger>

        <SheetContent className="w-full sm:max-w-5xl p-0 flex flex-col">
          <SheetHeader className="px-6 pt-6 pb-4 border-b bg-gradient-to-r from-red-50 to-orange-50">
            <div className="flex items-start justify-between">
              <div>
                <SheetTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-red-100 flex items-center justify-center">
                    <FileText className="h-4 w-4 text-red-600" />
                  </div>
                  Plan of Correction
                </SheetTitle>
                <SheetDescription className="text-sm text-gray-600 mt-1">
                  {hasAnyPOC ? "Review and update your Plan of Correction" : "Create a Plan of Correction for unmet questions"}
                </SheetDescription>
              </div>

              {totalUnmetQuestions > 0 && (
                <div className="flex gap-4 text-sm">
                  <div className="text-center">
                    <div className="font-semibold text-red-600">{totalUnmetQuestions}</div>
                    <div className="text-gray-500">Questions</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-red-600">{totalUnmetResidents}</div>
                    <div className="text-gray-500">Residents</div>
                  </div>
                </div>
              )}
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto">
            <div className="px-6 py-4">
              {sheetBlocks.length === 0 ? (
                <div className="text-center py-12 bg-green-50 rounded-lg border-2 border-dashed border-green-200">
                  <div className="h-12 w-12 rounded-full bg-green-100 mx-auto mb-4 flex items-center justify-center">
                    <FileText className="h-6 w-6 text-green-600" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-1">All Good!</h3>
                  <p className="text-gray-500">No questions have unmet answers that require a Plan of Correction.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Summary Card */}
                  <Card className="border-l-4 border-l-red-500 bg-red-50/50">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <div className="h-10 w-10 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                          <AlertTriangle className="h-5 w-5 text-red-600" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 mb-1">Questions Requiring Attention</h3>
                          <p className="text-sm text-gray-600 leading-relaxed">
                            The following {totalUnmetQuestions} question{totalUnmetQuestions !== 1 ? 's' : ''}
                            {totalUnmetQuestions === 1 ? ' has' : ' have'} unmet requirements across {totalUnmetResidents} resident{totalUnmetResidents !== 1 ? 's' : ''}.
                            Please review each question and provide a comprehensive Plan of Correction.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Questions List */}
                  <div className="space-y-4">
                    {sheetBlocks.map((block, index) => (
                      <Card key={block.qid} className="overflow-hidden border shadow-sm hover:shadow-md transition-shadow">
                        <CardHeader className="bg-gray-50/50 border-b">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">
                                  Question {index + 1}
                                </Badge>
                                <Badge
                                  variant="secondary"
                                  className={cn(
                                    "text-xs",
                                    block.strengthPct < 50 ? "bg-red-100 text-red-800" :
                                      block.strengthPct < 75 ? "bg-yellow-100 text-yellow-800" :
                                        "bg-green-100 text-green-800"
                                  )}
                                >
                                  {block.strengthPct}% Strength
                                </Badge>
                              </div>
                              <CardTitle className="text-base font-medium text-gray-900 leading-relaxed">
                                {block.text}
                              </CardTitle>
                              {block.ftags.length > 0 && (
                                <div className="flex items-center gap-1 mt-2">
                                  <Tag className="h-3 w-3 text-gray-400" />
                                  <span className="text-xs text-gray-500">
                                    F-Tags: {block.ftags.join(", ")}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </CardHeader>

                        <CardContent className="p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <Users className="h-4 w-4 text-gray-500" />
                            <span className="text-sm font-medium text-gray-700">
                              Affected Residents ({block.items.length})
                            </span>
                          </div>

                          <div className="grid gap-3 sm:grid-cols-2">
                            {block.items.map((item) => (
                              <div
                                key={`${block.qid}-${item.residentId}`}
                                className="bg-gray-50 rounded-lg p-3 border"
                              >
                                <div className="flex items-center gap-2 mb-1">
                                  <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center">
                                    <User className="h-3 w-3 text-blue-600" />
                                  </div>
                                  <span className="text-sm font-medium text-gray-900">
                                    Resident {item.residentId}
                                  </span>
                                </div>
                                {item.findings && (
                                  <div className="mt-2 p-2 bg-white rounded border-l-2 border-l-orange-300">
                                    <div className="text-xs text-gray-500 mb-1">Findings:</div>
                                    <p className="text-sm text-gray-700 leading-relaxed">
                                      {item.findings}
                                    </p>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Comments Section */}
            {hasAnyPOC && (
              <div className="px-6">
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

            {/* POC Input Section */}
            <div className="px-6 py-6 bg-gray-50/50 border-t">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Plan of Correction
                  </label>
                  <p className="text-xs text-gray-600 mb-3">
                    Describe the specific actions that will be taken to address the unmet requirements above.
                    This plan will be applied to all questions with "unmet" status.
                  </p>
                  <Textarea
                    placeholder="Enter your comprehensive Plan of Correction here..."
                    value={combinedPOC}
                    onChange={(e) => setCombinedPOC(e.target.value)}
                    rows={5}
                    className="resize-none text-sm leading-relaxed"
                  />
                </div>

                {/* Date of Compliance */}
                <div className="flex flex-wrap items-end gap-4 pt-4 border-t">
                  <div className="flex-1 min-w-48">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Date of Compliance
                    </label>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <input
                        type="date"
                        value={combinedDOC ? combinedDOC.toISOString().split('T')[0] : ''}
                        onChange={(e) => setCombinedDOC(e.target.value ? new Date(e.target.value) : null)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    onClick={handleSaveCombinedDOC}
                    disabled={docUpsert.isPending || !combinedDOC}
                    className="min-w-32"
                  >
                    {docUpsert.isPending ? "Saving..." : hasAnyDOC ? "Update DOC" : "Set DOC"}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <SheetFooter className="px-6 py-4 border-t bg-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              {hasAnyPOC && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadPDF}
                  disabled={isGeneratingPDF}
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  {isGeneratingPDF ? "Generating..." : "Download PDF"}
                </Button>
              )}
            </div>

            <div className="flex items-center gap-3">
              <SheetClose asChild>
                <Button variant="ghost" size="sm">
                  Cancel
                </Button>
              </SheetClose>
              <Button
                onClick={handleSaveCombinedPOC}
                disabled={pocUpsert.isPending || !combinedPOC.trim()}
                className="bg-red-600 hover:bg-red-700 min-w-32"
              >
                {pocUpsert.isPending ? "Saving..." : hasAnyPOC ? "Update POC" : "Save POC"}
              </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>
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
              Survey ID #{surveyId}{" "}
              {survey.data.template && <Badge>{survey.data.template.type}</Badge>}
              {isLocked && <Badge variant="secondary">Locked</Badge>}
            </h1>
            <div className="text-sm text-muted-foreground space-y-1">
              {/* Display facility name with separate query */}
              <FacilityInfo facilityId={survey.data.facilityId} />

              {/* Display surveyor name with separate query */}
              <SurveyorInfo surveyorId={survey.data.surveyorId} />
            </div>
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
