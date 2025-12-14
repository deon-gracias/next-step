"use client";

import React, { useState, useMemo, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import {
  ArrowLeft,
  Info,
  FileText,
  Lock,
  LockOpen,
  AlertCircle,
  MessageCircle,
  Send,
  User,
  Clock,
  Download,
  Calendar,
  AlertTriangle,
} from "lucide-react";
import { format } from "date-fns";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import jsPDF from "jspdf";

const AuthorName = ({ authorId }: { authorId: string }) => {
  const author = api.user.byId.useQuery(
    { id: authorId },
    { enabled: Boolean(authorId) }
  );

  if (author.isPending) {
    return <span className="text-muted-foreground">Loading...</span>;
  }

  return (
    <span>
      {author.data?.name || author.data?.email || `User ${authorId}`}
    </span>
  );
};

// Comments Section Component
const CommentsSection = ({
  comments,
  showComments,
  setShowComments,
  newComment,
  setNewComment,
  handleAddComment,
  addComment,
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
          <span className="text-sm font-semibold text-gray-900">
            Discussion
          </span>
          {comments.data && comments.data.length > 0 && (
            <Badge
              variant="secondary"
              className="ml-2 text-xs bg-blue-100 text-blue-800"
            >
              {comments.data.length} comment
              {comments.data.length !== 1 ? "s" : ""}
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
              <div
                key={comment.id}
                className="flex gap-3 p-3 rounded-lg bg-gray-50 border"
              >
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                    <User className="h-4 w-4 text-white" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-gray-900">
                      <AuthorName authorId={comment.authorId} />
                    </span>
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Clock className="h-3 w-3" />
                      {comment.createdAt &&
                        format(
                          new Date(comment.createdAt),
                          "MMM dd, yyyy 'at' h:mm a"
                        )}
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

export default function QALSurveyPage() {
  const params = useParams();
  const router = useRouter();
  const surveyId = Number(params.surveyId);

  const surveyQ = api.qal.getSurvey.useQuery({ id: surveyId });
  const lock = api.qal.lock.useMutation();
  const unlock = api.qal.unlock.useMutation();
  const generatePOCs = api.qal.generatePOCs.useMutation();
  const pocList = api.qal.listPOCs.useQuery(
    { surveyId },
    { enabled: !!surveyQ.data?.survey.pocGenerated }
  );

  const utils = api.useUtils();

  // POC state
  const [sheetOpen, setSheetOpen] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  // POC state per section
  const [sectionPOCs, setSectionPOCs] = useState<
    Record<number, { pocText: string; complianceDate: Date | null }>
  >({});

  const [firstPocId, setFirstPocId] = useState<number | null>(null);

  const comments = api.qal.listPocComments.useQuery(
    { pocId: firstPocId! },
    { enabled: !!firstPocId }
  );

  const addComment = api.qal.addPocComment.useMutation({
    onSuccess: async () => {
      await comments.refetch();
      setNewComment("");
      toast.success("Comment added successfully");
    },
    onError: () => {
      toast.error("Failed to add comment");
    },
  });

  const pocUpsert = api.qal.upsertPOC.useMutation({
    onSuccess: async () => {
      await pocList.refetch();
      toast.success("POC updated successfully");
    },
    onError: (e: any) => {
      toast.error(e?.message ?? "Failed to update POC");
    },
  });

  const isLocked = Boolean(surveyQ.data?.survey.isLocked);

  if (surveyQ.isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-lg font-medium">Loading survey...</div>
        </div>
      </div>
    );
  }

  if (!surveyQ.data) {
    return (
      <div className="p-6">
        <div className="text-center text-muted-foreground">
          Survey not found
        </div>
      </div>
    );
  }

  const { survey, facility: surveyFacility, sections } = surveyQ.data;

  const overallPercent = Number(survey.overallPercent || 0);
  const totalEarned = Number(survey.totalEarned || 0);
  const totalPossible = Number(survey.totalPossible || 0);
  const pocGenerated = Boolean(survey.pocGenerated);

  // Check if ALL questions are filled (have responses)
  const allQuestionsFilled = useMemo(() => {
    if (!sections || sections.length === 0) return false;

    for (const secRow of sections) {
      const sectionData = utils.qal.getSectionWithQuestions.getData({
        surveyId,
        sectionId: secRow.section.id,
      });

      if (!sectionData) return false;

      const { questions } = sectionData;

      // Check if all questions have a response
      for (const q of questions) {
        if (!q.response) return false;
      }
    }

    return true;
  }, [sections, surveyId, utils.qal.getSectionWithQuestions]);

  // Calculate section scores and filter sections below 90%
  const sectionsBelow90 = useMemo(() => {
    if (!sections) return [];

    return sections
      .map((secRow) => {
        const sectionData = utils.qal.getSectionWithQuestions.getData({
          surveyId,
          sectionId: secRow.section.id,
        });

        if (!sectionData) return null;

        const { questions, sectionResponse } = sectionData;

        const adjustedPossible = questions.reduce((sum, q) => {
          if (q.response?.isNotApplicable) return sum;
          return sum + Number(q.possiblePoints || 0);
        }, 0);

        const earned = Number(sectionResponse?.earnedPoints ?? 0);
        const pct = adjustedPossible > 0 ? (earned / adjustedPossible) * 100 : 0;

        return {
          section: secRow.section,
          percentage: pct,
          earned,
          possible: adjustedPossible,
        };
      })
      .filter((s) => s !== null && s.percentage < 90);
  }, [sections, surveyId, utils.qal.getSectionWithQuestions]);

  const handleViewReport = () => {
    router.push(`/qal/surveys/${surveyId}/report`);
  };

  const handleLockSurvey = async () => {
    if (!allQuestionsFilled) {
      toast.error("Please fill all questions before locking");
      return;
    }

    try {
      await lock.mutateAsync({ surveyId });
      await surveyQ.refetch();
      toast.success("Survey locked successfully");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to lock survey");
    }
  };

  const handleGeneratePOCs = async () => {
    try {
      const res = await generatePOCs.mutateAsync({ surveyId });
      await surveyQ.refetch();
      await pocList.refetch();
      toast.success(`Generated ${res.count} POC items`);
      setTimeout(() => {
        setSheetOpen(true);
      }, 100);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to generate POC");
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !firstPocId) return;
    await addComment.mutateAsync({
      pocId: firstPocId,
      surveyId,
      commentText: newComment.trim(),
    });
  };

  // Group sheet blocks by section - only for sections below 90% and questions with 0 earned points
  const sheetBlocksBySection = useMemo(() => {
    if (!pocList.data) return {};

    const grouped: Record<
      number,
      {
        sectionTitle: string;
        sectionId: number;
        blocks: Array<{
          pocId: number;
          questionId: number;
          questionText: string;
          possiblePoints: number;
          sampleSize: number;
          passedCount: number;
          testingSample: string | null;
          comments: string | null;
          pocText: string | null;
          complianceDate: Date | null;
          earnedPoints: number;
        }>;
      }
    > = {};

    // Get section IDs that are below 90%
    const below90SectionIds = new Set(
      sectionsBelow90.map((s) => s!.section.id)
    );

    for (const row of pocList.data) {
      const sectionId = row.section.id;

      // Only include if section is below 90%
      if (!below90SectionIds.has(sectionId)) continue;

      // Calculate earned points for this question
      const sampleSize = row.poc.sampleSize || 0;
      const passedCount = row.poc.passedCount || 0;
      const possiblePoints = Number(row.poc.possiblePoints || 0);
      const earnedPoints =
        sampleSize > 0 ? (passedCount / sampleSize) * possiblePoints : 0;

      // Only include questions with 0 earned points
      if (earnedPoints !== 0) continue;

      if (!grouped[sectionId]) {
        grouped[sectionId] = {
          sectionTitle: row.section.title,
          sectionId,
          blocks: [],
        };
      }

      grouped[sectionId].blocks.push({
        pocId: row.poc.id,
        questionId: row.poc.questionId,
        questionText: row.question.prompt,
        possiblePoints,
        sampleSize: row.poc.sampleSize || 0,
        passedCount: row.poc.passedCount || 0,
        testingSample: row.poc.testingSample,
        comments: row.poc.comments,
        pocText: row.poc.pocText,
        complianceDate: row.poc.complianceDate
          ? new Date(row.poc.complianceDate)
          : null,
        earnedPoints,
      });
    }

    return grouped;
  }, [pocList.data, sectionsBelow90]);

  const totalUnmetQuestions = Object.values(sheetBlocksBySection).reduce(
    (sum, section) => sum + section.blocks.length,
    0
  );

  const hasAnyPOC = Object.values(sheetBlocksBySection).some((section) =>
    section.blocks.some((b) => b.pocText && b.pocText.trim())
  );

  // Initialize section POCs
  React.useEffect(() => {
    if (Object.keys(sheetBlocksBySection).length > 0) {
      const initial: Record<
        number,
        { pocText: string; complianceDate: Date | null }
      > = {};

      for (const [sectionId, sectionData] of Object.entries(
        sheetBlocksBySection
      )) {
        const firstBlock = sectionData.blocks[0];
        if (firstBlock) {
          initial[Number(sectionId)] = {
            pocText: firstBlock.pocText || "",
            complianceDate: firstBlock.complianceDate,
          };
        }
      }

      setSectionPOCs(initial);

      // Set first POC ID for comments
      const firstSection = Object.values(sheetBlocksBySection)[0];
      if (firstSection && firstSection.blocks[0]) {
        setFirstPocId(firstSection.blocks[0].pocId);
      }
    }
  }, [sheetBlocksBySection]);

  const handleSavePOC = async (sectionId: number) => {
    const pocData = sectionPOCs[sectionId];
    if (!pocData?.pocText?.trim()) {
      toast.error("POC text cannot be empty");
      return;
    }

    const sectionBlocks = sheetBlocksBySection[sectionId]?.blocks || [];

    try {
      await Promise.all(
        sectionBlocks.map((block) =>
          pocUpsert.mutateAsync({
            id: block.pocId,
            surveyId,
            questionId: block.questionId,
            sectionId,
            pocText: pocData.pocText.trim(),
            complianceDate: pocData.complianceDate,
          })
        )
      );

      toast.success(
        `POC updated for ${sectionBlocks.length} question(s) in this section`
      );
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to save POC");
    }
  };

  const handleDownloadPDF = useCallback(async () => {
    if (!survey || !hasAnyPOC) return;

    setIsGeneratingPDF(true);
    try {
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      // Header
      doc.setFontSize(20);
      doc.setFont("helvetica", "bold");
      doc.text("Plan of Correction Report", 20, 25);

      // Survey Details
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      let yPos = 45;

      doc.text(`Survey Number: ${surveyId}`, 20, yPos);
      yPos += 8;

      const facilityName =
        surveyFacility?.name || `Facility ID ${survey.facilityId}`;
      doc.text(`Facility: ${facilityName}`, 20, yPos);
      yPos += 8;

      doc.text(`Auditor: ${survey.auditorUserId}`, 20, yPos);
      yPos += 8;

      doc.text(
        `Generated: ${format(new Date(), "MMM dd, yyyy 'at' h:mm a")}`,
        20,
        yPos
      );
      yPos += 15;

      // POC by section
      for (const [sectionId, sectionData] of Object.entries(
        sheetBlocksBySection
      )) {
        const pocData = sectionPOCs[Number(sectionId)];
        if (!pocData?.pocText) continue;

        if (yPos + 30 > 280) {
          doc.addPage();
          yPos = 20;
        }

        // Section title
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.text(`Section: ${sectionData.sectionTitle}`, 20, yPos);
        yPos += 10;

        // POC text
        doc.setFontSize(11);
        doc.setFont("helvetica", "normal");
        const pocLines = doc.splitTextToSize(pocData.pocText, 170);
        doc.text(pocLines, 20, yPos);
        yPos += pocLines.length * 5 + 10;

        // Compliance date
        if (pocData.complianceDate) {
          doc.setFont("helvetica", "italic");
          doc.text(
            `Compliance Date: ${format(pocData.complianceDate, "MMM dd, yyyy")}`,
            20,
            yPos
          );
          yPos += 8;
        }

        // Questions in this section
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text("Questions:", 20, yPos);
        yPos += 6;

        doc.setFont("helvetica", "normal");
        for (const block of sectionData.blocks) {
          if (yPos + 20 > 280) {
            doc.addPage();
            yPos = 20;
          }

          const qLines = doc.splitTextToSize(` • ${block.questionText}`, 165);
          doc.text(qLines, 25, yPos);
          yPos += qLines.length * 4 + 3;
        }

        yPos += 10;
      }

      doc.save(
        `QAL_POC_Report_Survey${surveyId}_${format(new Date(), "yyyy-MM-dd")}.pdf`
      );
      toast.success("PDF downloaded successfully");
    } catch (error) {
      console.error("Failed to generate PDF:", error);
      toast.error("Failed to generate PDF");
    } finally {
      setIsGeneratingPDF(false);
    }
  }, [survey, hasAnyPOC, surveyId, sheetBlocksBySection, sectionPOCs, surveyFacility]);

  // POC control
  const renderPOCControl = () => {
    if (!isLocked) return null;

    if (sectionsBelow90.length === 0) {
      return (
        <div className="flex items-center gap-2 text-xs text-green-600 bg-green-50 px-3 py-2 rounded-lg border border-green-200">
          <AlertTriangle className="h-4 w-4" />
          All sections scored 90% or above - POC not required
        </div>
      );
    }

    if (!pocGenerated) {
      return (
        <div className="flex items-center gap-3">
          <div className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg border border-amber-200">
            <AlertTriangle className="h-4 w-4 inline mr-1" />
            POC not generated yet
          </div>
          <Button
            onClick={handleGeneratePOCs}
            disabled={generatePOCs.isPending}
            variant="default"
            className="bg-red-600 hover:bg-red-700"
          >
            <FileText className="mr-2 h-4 w-4" />
            {generatePOCs.isPending ? "Generating..." : "Generate POC"}
          </Button>
        </div>
      );
    }

    const label = hasAnyPOC ? "View POC" : "Fill POC";

    return (
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetTrigger asChild>
          <Button variant="default" className="bg-red-600 hover:bg-red-700">
            <FileText className="mr-2 h-4 w-4" />
            {label}
            {totalUnmetQuestions > 0 && (
              <Badge
                variant="secondary"
                className="ml-2 bg-red-100 text-red-800"
              >
                {totalUnmetQuestions}
              </Badge>
            )}
          </Button>
        </SheetTrigger>

        <SheetContent className="w-full sm:max-w-5xl p-0 flex flex-col overflow-hidden">
          <SheetHeader className="px-6 pt-6 pb-4 border-b bg-gradient-to-r from-red-50 to-orange-50">
            <div className="flex items-start justify-between">
              <div>
                <SheetTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-red-100 flex items-center justify-center">
                    <FileText className="h-4 w-4 text-red-600" />
                  </div>
                  Plan of Correction
                </SheetTitle>
                <div className="text-sm text-muted-foreground mt-1">
                  QAL Audit Survey - Sections Below 90%
                </div>
                <div className="h-px bg-border mt-2" />
                <SheetDescription className="text-sm text-gray-600 mt-1">
                  {hasAnyPOC
                    ? "Review and update your Plan of Correction"
                    : "Create a Plan of Correction for unmet questions"}
                </SheetDescription>
              </div>

              {totalUnmetQuestions > 0 && (
                <div className="flex gap-4 text-sm">
                  <div className="text-center">
                    <div className="font-semibold text-red-600">
                      {totalUnmetQuestions}
                    </div>
                    <div className="text-gray-500">Questions</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-amber-600">
                      {Object.keys(sheetBlocksBySection).length}
                    </div>
                    <div className="text-gray-500">Sections</div>
                  </div>
                </div>
              )}
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto">
            <div className="px-6 py-4">
              {totalUnmetQuestions === 0 ? (
                <div className="text-center py-12 bg-green-50 rounded-lg border-2 border-dashed border-green-200">
                  <div className="h-12 w-12 rounded-full bg-green-100 mx-auto mb-4 flex items-center justify-center">
                    <FileText className="h-6 w-6 text-green-600" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-1">
                    All Good!
                  </h3>
                  <p className="text-gray-500">
                    No questions with 0 points in sections below 90%.
                  </p>
                </div>
              ) : (
                <div className="space-y-8">
                  {/* Summary Card */}
                  <Card className="border-l-4 border-l-red-500 bg-red-50/50">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <div className="h-10 w-10 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                          <AlertTriangle className="h-5 w-5 text-red-600" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 mb-1">
                            Sections Requiring Attention
                          </h3>
                          <p className="text-sm text-gray-600 leading-relaxed">
                            {Object.keys(sheetBlocksBySection).length} section
                            {Object.keys(sheetBlocksBySection).length !== 1
                              ? "s"
                              : ""}{" "}
                            scored below 90% with {totalUnmetQuestions} question
                            {totalUnmetQuestions !== 1 ? "s" : ""} earning 0
                            points. Please provide a Plan of Correction for each
                            section.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Sections */}
                  {Object.entries(sheetBlocksBySection).map(
                    ([sectionId, sectionData]) => (
                      <div
                        key={sectionId}
                        className="border-2 border-red-200 rounded-lg p-4 space-y-4"
                      >
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-bold text-gray-900">
                            {sectionData.sectionTitle}
                          </h3>
                          <Badge variant="destructive">
                            {sectionData.blocks.length} question
                            {sectionData.blocks.length !== 1 ? "s" : ""}
                          </Badge>
                        </div>

                        {/* Questions in this section */}
                        <div className="space-y-3">
                          {sectionData.blocks.map((block, idx) => (
                            <Card
                              key={block.pocId}
                              className="border-l-2 border-l-red-400"
                            >
                              <CardHeader className="pb-3">
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <Badge
                                        variant="outline"
                                        className="text-xs font-mono"
                                      >
                                        Q{idx + 1}
                                      </Badge>
                                    </div>
                                    <CardTitle className="text-sm font-medium leading-tight">
                                      {block.questionText}
                                    </CardTitle>
                                  </div>
                                </div>
                              </CardHeader>
                              <CardContent className="space-y-3 text-xs">
                                <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 rounded-lg border">
                                  <div>
                                    <div className="text-muted-foreground mb-1">
                                      Sample / Passed
                                    </div>
                                    <div className="font-semibold">
                                      {block.sampleSize} / {block.passedCount}
                                    </div>
                                  </div>
                                  <div>
                                    <div className="text-muted-foreground mb-1">
                                      Possible Points
                                    </div>
                                    <div className="font-semibold">
                                      {block.possiblePoints.toFixed(1)}
                                    </div>
                                  </div>
                                  <div>
                                    <div className="text-muted-foreground mb-1">
                                      Testing Sample
                                    </div>
                                    <div className="font-mono text-xs">
                                      {block.testingSample || "—"}
                                    </div>
                                  </div>
                                </div>

                                {block.comments && (
                                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                                    <div className="text-muted-foreground mb-1">
                                      Response Comments
                                    </div>
                                    <p className="text-sm leading-relaxed">
                                      {block.comments}
                                    </p>
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          ))}
                        </div>

                        {/* POC Input for this section */}
                        <Card className="border-2 border-dashed border-gray-300">
                          <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">
                              <FileText className="h-4 w-4 text-red-600" />
                              Plan of Correction for {sectionData.sectionTitle}
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <Textarea
                              placeholder="Enter your Plan of Correction for this section..."
                              value={
                                sectionPOCs[Number(sectionId)]?.pocText || ""
                              }
                              onChange={(e) =>
                                setSectionPOCs((prev) => ({
                                  ...prev,
                                  [Number(sectionId)]: {
                                    pocText: e.target.value,
                                    complianceDate: prev[Number(sectionId)]?.complianceDate ?? null,
                                  },
                                }))
                              }
                              rows={6}
                              className="text-sm resize-none"
                            />

                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2">
                                  <Calendar className="h-4 w-4 text-gray-500" />
                                  <span className="text-sm text-muted-foreground">
                                    Compliance Date:
                                  </span>
                                </div>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className={cn(
                                        "justify-start text-left font-normal",
                                        !sectionPOCs[Number(sectionId)]
                                          ?.complianceDate &&
                                        "text-muted-foreground"
                                      )}
                                    >
                                      {sectionPOCs[Number(sectionId)]
                                        ?.complianceDate
                                        ? format(
                                          sectionPOCs[Number(sectionId)]?.complianceDate!,
                                          "MMM dd, yyyy"
                                        )

                                        : "Select date"}
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent
                                    className="w-auto p-0"
                                    align="start"
                                  >
                                    <CalendarComponent
                                      mode="single"
                                      selected={
                                        sectionPOCs[Number(sectionId)]
                                          ?.complianceDate ?? undefined
                                      }
                                      onSelect={(date) =>
                                        setSectionPOCs((prev) => ({
                                          ...prev,
                                          [Number(sectionId)]: {
                                            pocText: prev[Number(sectionId)]?.pocText ?? "",
                                            complianceDate: date ?? null,
                                          },
                                        }))
                                      }

                                      initialFocus
                                    />
                                  </PopoverContent>
                                </Popover>
                              </div>

                              <Button
                                onClick={() => handleSavePOC(Number(sectionId))}
                                disabled={
                                  pocUpsert.isPending ||
                                  !sectionPOCs[Number(sectionId)]?.pocText?.trim()
                                }
                                className="bg-red-600 hover:bg-red-700"
                                size="sm"
                              >
                                {pocUpsert.isPending
                                  ? "Saving..."
                                  : "Save Section POC"}
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    )
                  )}

                  {/* Comments Section */}
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
                  Close
                </Button>
              </SheetClose>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    );
  };

  return (
    <main className="p-6 space-y-6 w-full max-w-full overflow-hidden">
      <div className="flex items-center gap-4">
        <Link href="/qal/surveys">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Surveys
          </Button>
        </Link>
      </div>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">QAL Audit Survey #{surveyId}</h1>
          <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
            <span>
              Facility: {surveyFacility?.name ?? `ID ${survey.facilityId}`}
            </span>
            <span>•</span>
            <span>
              Date:{" "}
              {survey.surveyDate
                ? format(new Date(survey.surveyDate), "MMM dd, yyyy")
                : "-"}
            </span>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-3 flex-wrap">
          <div className="text-right mr-2">
            <div className="text-xs uppercase text-muted-foreground">Score</div>
            <div className="text-xl font-semibold">{`${totalEarned.toFixed(1)} / ${totalPossible.toFixed(1)}`}</div>
          </div>
          {isLocked ? (
            <>
              <Button
                variant="outline"
                onClick={handleViewReport}
                className="gap-2"
              >
                <FileText className="h-4 w-4" />
                View Report
              </Button>

              {renderPOCControl()}

              <Button
                variant="destructive"
                onClick={async () => {
                  try {
                    await unlock.mutateAsync({ surveyId });
                    await surveyQ.refetch();
                    toast.success("Survey unlocked");
                  } catch (e: any) {
                    toast.error(e?.message ?? "Failed to unlock");
                  }
                }}
                disabled={unlock.isPending}
                className="gap-2"
              >
                <LockOpen className="h-4 w-4" />
                {unlock.isPending ? "Unlocking..." : "Unlock Survey"}
              </Button>
            </>
          ) : (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <Button
                      onClick={handleLockSurvey}
                      disabled={lock.isPending || !allQuestionsFilled}
                      className="gap-2"
                    >
                      <Lock className="h-4 w-4" />
                      {lock.isPending ? "Locking..." : "Lock Survey"}
                    </Button>
                  </div>
                </TooltipTrigger>
                {!allQuestionsFilled && (
                  <TooltipContent>
                    <p>Fill all questions before locking</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>

      {!isLocked && !allQuestionsFilled && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please complete all survey questions before locking. Enter sample
            size and # Passed or mark items as N/A for each question.
          </AlertDescription>
        </Alert>
      )}

      <Separator />

      {surveyQ.data.sections.map((secRow, index) => (
        <SectionCard
          key={secRow.section.id}
          surveyId={surveyId}
          section={secRow.section}
          isLocked={isLocked}
          refetch={surveyQ.refetch}
          isLastSection={index === surveyQ.data.sections.length - 1}
          overallPercent={overallPercent}
          totalEarned={totalEarned}
          totalPossible={totalPossible}
        />
      ))}
    </main>
  );
}

function SectionCard({
  surveyId,
  section,
  isLocked,
  refetch,
  isLastSection,
  overallPercent,
  totalEarned,
  totalPossible,
}: {
  surveyId: number;
  section: {
    id: number;
    title: string;
    description: string | null;
    possiblePoints: number;
  };
  isLocked: boolean;
  refetch: () => Promise<any>;
  isLastSection?: boolean;
  overallPercent: number;
  totalEarned: number;
  totalPossible: number;
}) {
  const sectionData = api.qal.getSectionWithQuestions.useQuery({
    surveyId,
    sectionId: section.id,
  });

  if (sectionData.isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">
            Loading section...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!sectionData.data) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">
            Failed to load section
          </div>
        </CardContent>
      </Card>
    );
  }

  const { questions, sectionResponse } = sectionData.data;

  const adjustedPossible = questions.reduce((sum, q) => {
    if (q.response?.isNotApplicable) return sum;
    return sum + Number(q.possiblePoints || 0);
  }, 0);

  const totalSample = questions.reduce((sum, q) => {
    const sampleSize = q.response?.sampleSize ?? 0;
    return sum + sampleSize;
  }, 0);

  const totalPassed = questions.reduce((sum, q) => {
    if (q.response?.isNotApplicable) return sum;
    return sum + (q.response?.passedCount ?? 0);
  }, 0);

  const earned = Number(sectionResponse?.earnedPoints ?? 0);
  const pct = adjustedPossible > 0 ? (earned / adjustedPossible) * 100 : 0;

  return (
    <Card className="w-full overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle className="text-lg">{section.title}</CardTitle>
            {section.description && (
              <p className="text-sm text-muted-foreground mt-1">
                {section.description}
              </p>
            )}
          </div>
          <div className="text-right space-y-1 ml-4 shrink-0">
            <div className="text-sm font-medium whitespace-nowrap">
              {earned.toFixed(2)} / {adjustedPossible.toFixed(1)}
            </div>
            <Badge variant={pct >= 90 ? "default" : "secondary"}>
              {pct.toFixed(1)}%
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <div className="w-full max-h-[600px] overflow-auto border rounded-lg">
          <table className="w-full border-collapse">
            <thead className="sticky top-0 z-10 bg-muted/90 backdrop-blur-sm">
              <tr className="border-b">
                <th
                  className="text-left p-3 font-semibold text-sm border-r bg-muted/90"
                  style={{ width: "25%" }}
                >
                  Process to be Audited
                </th>
                <th
                  className="text-center p-3 font-semibold text-sm border-r bg-muted/90"
                  style={{ width: "8%" }}
                >
                  Possible
                </th>
                <th
                  className="text-center p-3 font-semibold text-sm border-r bg-muted/90"
                  style={{ width: "8%" }}
                >
                  Sample
                </th>
                <th
                  className="text-center p-3 font-semibold text-sm border-r bg-muted/90"
                  style={{ width: "10%" }}
                >
                  Passed
                </th>
                <th
                  className="text-center p-3 font-semibold text-sm border-r bg-muted/90"
                  style={{ width: "8%" }}
                >
                  Earned
                </th>
                <th
                  className="text-left p-3 font-semibold text-sm border-r bg-muted/90"
                  style={{ width: "12%" }}
                >
                  Testing Sample
                </th>
                <th
                  className="text-left p-3 font-semibold text-sm bg-muted/90"
                  style={{ width: "29%" }}
                >
                  <div className="flex items-center gap-1">
                    <span>Comments</span>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-sm">
                          <p className="text-xs">
                            Record explanation when a sample does not pass
                            testing. If an item is not applicable for scoring,
                            check N/A and add a comment explaining why.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {questions.map((q) => (
                <QuestionRow
                  key={q.id}
                  surveyId={surveyId}
                  question={q}
                  isLocked={isLocked}
                  refetch={async () => {
                    await sectionData.refetch();
                    await refetch();
                  }}
                />
              ))}
              <tr className="border-t-2 font-semibold bg-muted/50 sticky bottom-0">
                <td className="p-3 border-r bg-muted/90">Section Total</td>
                <td className="text-center p-3 border-r bg-muted/90">
                  {adjustedPossible.toFixed(1)}
                </td>
                <td className="text-center p-3 border-r bg-muted/90">
                  {totalSample}
                </td>
                <td className="text-center p-3 border-r bg-muted/90">
                  {totalPassed}
                </td>
                <td className="text-center p-3 border-r bg-muted/90">
                  {earned.toFixed(2)}
                </td>
                <td colSpan={2} className="p-3 bg-muted/90" />
              </tr>

              {isLastSection && (
                <>
                  <tr className="h-4" />
                  <tr className="border-t-4 border-primary sticky bottom-0">
                    <td
                      colSpan={7}
                      className="p-4 bg-primary/5 backdrop-blur-sm"
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-lg font-bold">
                          Survey Grand Total
                        </span>
                        <div className="flex items-center gap-4">
                          <span className="text-sm font-medium">
                            {totalEarned.toFixed(2)} /{" "}
                            {totalPossible.toFixed(1)}
                          </span>
                          <Badge
                            variant={
                              overallPercent >= 90 ? "default" : "secondary"
                            }
                            className="text-lg px-4 py-2"
                          >
                            {overallPercent.toFixed(1)}%
                          </Badge>
                        </div>
                      </div>
                    </td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function QuestionRow({
  surveyId,
  question,
  isLocked,
  refetch,
}: {
  surveyId: number;
  question: any;
  isLocked: boolean;
  refetch: () => Promise<void>;
}) {
  const [sampleSize, setSampleSize] = useState(
    question.response?.sampleSize?.toString() ??
    question.fixedSample?.toString() ??
    ""
  );

  const [passedCount, setPassedCount] = useState(
    question.response?.passedCount?.toString() ?? ""
  );
  const [isNA, setIsNA] = useState(
    question.response?.isNotApplicable ?? false
  );
  const [testingSample, setTestingSample] = useState(
    question.response?.testingSample ?? ""
  );
  const [comments, setComments] = useState(question.response?.comments ?? "");

  const saveMutation = api.qal.saveQuestionResponse.useMutation();

  const isSampleSet = sampleSize !== "" && parseInt(sampleSize) > 0;

  const calculateEarnedPoints = () => {
    if (isNA) return 0;

    const passed = passedCount ? parseInt(passedCount, 10) : 0;
    const sample = sampleSize ? parseInt(sampleSize, 10) : 0;
    const possiblePoints = Number(question.possiblePoints || 0);

    if (sample === 0) return 0;

    return (passed / sample) * possiblePoints;
  };

  const earnedPoints = calculateEarnedPoints();
  const hasExistingResponse =
    question.response !== null && question.response !== undefined;

  const handleSave = async () => {
    try {
      const parsedSample = sampleSize ? parseInt(sampleSize, 10) : 0;
      const parsed = passedCount ? parseInt(passedCount, 10) : 0;

      if (parsedSample === 0 && !isNA) {
        toast.error("Please enter a sample size first");
        return;
      }

      if (!isNA && parsed > parsedSample) {
        toast.error(
          `Passed count cannot exceed sample size (${parsedSample})`
        );
        return;
      }

      const loadingToast = toast.loading(
        hasExistingResponse ? "Updating..." : "Saving..."
      );

      await saveMutation.mutateAsync({
        surveyId,
        questionId: question.id,
        sampleSize: parsedSample,
        passedCount: isNA ? null : parsed,
        isNotApplicable: isNA,
        testingSample: testingSample.trim() || undefined,
        comments: comments.trim() || undefined,
      });

      await refetch();

      toast.dismiss(loadingToast);

      if (hasExistingResponse) {
        toast.success("Response updated successfully");
      } else {
        toast.success("Response saved successfully");
      }
    } catch (e: any) {
      toast.error(e.message ?? "Failed to save response");
    }
  };

  return (
    <tr
      className={`border-b ${!hasExistingResponse && !isLocked ? "bg-yellow-50/50" : ""
        }`}
    >
      <td className="p-3 align-top border-r" style={{ width: "25%" }}>
        <div className="space-y-1">
          <div className="font-medium text-sm leading-tight">
            {question.prompt}
          </div>
          {question.guidance && (
            <div className="text-xs text-muted-foreground italic leading-tight">
              {question.guidance}
            </div>
          )}
        </div>
      </td>
      <td
        className="text-center p-3 align-top border-r"
        style={{ width: "8%" }}
      >
        <span className="text-sm font-mono">
          {isNA ? "0.0" : Number(question.possiblePoints || 0).toFixed(1)}
        </span>
      </td>
      <td className="p-3 align-top border-r" style={{ width: "8%" }}>
        <Input
          type="number"
          min={0}
          value={sampleSize}
          onChange={(e) => setSampleSize(e.target.value)}
          disabled={isLocked}
          placeholder="0"
          className="w-16 text-center h-8 text-sm font-mono"
        />
      </td>
      <td className="p-3 align-top border-r" style={{ width: "10%" }}>
        <div className="flex flex-col items-center gap-2">
          <Input
            type="number"
            min={0}
            max={sampleSize ? parseInt(sampleSize) : undefined}
            value={passedCount}
            onChange={(e) => setPassedCount(e.target.value)}
            disabled={isLocked || isNA || !isSampleSet}
            className="w-16 text-center h-8 text-sm"
          />
          <label className="flex items-center gap-1.5 cursor-pointer">
            <Checkbox
              checked={isNA}
              onCheckedChange={(checked) => {
                const isNaNow = !!checked;
                setIsNA(isNaNow);
                if (isNaNow) {
                  setPassedCount("");
                } else {
                  setPassedCount("0");
                }
              }}
              disabled={isLocked || !isSampleSet}
              className="h-3.5 w-3.5"
            />
            <span className="text-xs text-muted-foreground">N/A</span>
          </label>
        </div>
      </td>
      <td
        className="text-center p-3 align-top border-r"
        style={{ width: "8%" }}
      >
        <span className="text-sm font-mono font-semibold text-primary">
          {earnedPoints.toFixed(2)}
        </span>
      </td>
      <td className="p-3 align-top border-r" style={{ width: "12%" }}>
        <Textarea
          placeholder="IDs..."
          value={testingSample}
          onChange={(e) => setTestingSample(e.target.value)}
          disabled={isLocked || !isSampleSet}
          className="text-sm w-full resize-none overflow-hidden min-h-[32px]"
          style={{
            height: testingSample ? 'auto' : '32px',
            maxHeight: '200px'
          }}
          onInput={(e) => {
            const target = e.target as HTMLTextAreaElement;
            target.style.height = '32px';
            target.style.height = `${target.scrollHeight}px`;
          }}
        />
      </td>

      <td className="p-3 align-top" style={{ width: "29%" }}>
        <div className="space-y-2">
          <Textarea
            placeholder={
              isNA
                ? "Required: Explain why N/A"
                : "Optional: Explain issues..."
            }
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            disabled={isLocked || !isSampleSet}
            rows={2}
            className="text-sm resize-none w-full"
          />
          <Button
            size="sm"
            onClick={handleSave}
            disabled={isLocked || saveMutation.isPending}
            className="w-auto px-4 h-7 text-xs"
            variant={hasExistingResponse ? "outline" : "default"}
          >
            {saveMutation.isPending
              ? hasExistingResponse
                ? "Updating..."
                : "Saving..."
              : hasExistingResponse
                ? "Update"
                : "Save"}
          </Button>
        </div>
      </td>
    </tr>
  );
}
