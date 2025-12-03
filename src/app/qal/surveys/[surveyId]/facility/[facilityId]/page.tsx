"use client";

import React, { useState, useMemo, useCallback, useRef } from "react";
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
  const [combinedPOC, setCombinedPOC] = useState("");
  const [combinedDOC, setCombinedDOC] = useState<Date | null>(null);
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  // First POC for combined textarea
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

  const { survey, facility: surveyFacility } = surveyQ.data;

  const overallPercent = Number(survey.overallPercent || 0);
  const totalEarned = Number(survey.totalEarned || 0);
  const totalPossible = Number(survey.totalPossible || 0);
  const pocGenerated = Boolean(survey.pocGenerated);
  const scoreAllowsPOC = overallPercent < 85;
  const canOpenPOCSheet = isLocked && pocGenerated && scoreAllowsPOC;

  const handleViewReport = () => {
    router.push(`/qal/surveys/${surveyId}/report`);
  };

  const handleLockSurvey = async () => {
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

  // Build sheet blocks from POC list
  const sheetBlocks = useMemo(() => {
    if (!pocList.data || !canOpenPOCSheet) return [];
    return pocList.data.map((row) => ({
      pocId: row.poc.id,
      questionId: row.poc.questionId,
      sectionTitle: row.section.title,
      questionText: row.question.prompt,
      possiblePoints: Number(row.poc.possiblePoints || 0),
      sampleSize: row.poc.sampleSize,
      passedCount: row.poc.passedCount,
      testingSample: row.poc.testingSample,
      comments: row.poc.comments,
      pocText: row.poc.pocText,
      complianceDate: row.poc.complianceDate
        ? new Date(row.poc.complianceDate)
        : null,
    }));
  }, [pocList.data, canOpenPOCSheet]);

  const hasAnyPOC = sheetBlocks.some((b) => b.pocText && b.pocText.trim());

  // Set first POC ID for comments
  React.useEffect(() => {
    if (sheetBlocks.length > 0 && !firstPocId) {
      const firstBlock = sheetBlocks[0];
      if (firstBlock) {
        setFirstPocId(firstBlock.pocId);
        setCombinedPOC(firstBlock.pocText || "");
        setCombinedDOC(firstBlock.complianceDate);
      }
    }
  }, [sheetBlocks, firstPocId]);

  const handleSaveCombinedPOC = async () => {
    if (!combinedPOC.trim()) {
      toast.error("POC text cannot be empty");
      return;
    }

    try {
      await Promise.all(
        sheetBlocks.map((block) =>
          pocUpsert.mutateAsync({
            id: block.pocId,
            surveyId,
            questionId: block.questionId,
            sectionId: pocList.data?.find((r) => r.poc.id === block.pocId)
              ?.section.id!,
            pocText: combinedPOC.trim(),
            complianceDate: combinedDOC,
          })
        )
      );
      setSheetOpen(false);
      toast.success("POC updated for all items successfully");
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

      const facilityName = surveyFacility?.name || `Facility ID ${survey.facilityId}`;
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

      // Plan of Correction Section
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("Plan of Correction", 20, yPos);
      yPos += 10;

      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      const pocLines = doc.splitTextToSize(combinedPOC, 170);

      if (yPos + pocLines.length * 5 > 280) {
        doc.addPage();
        yPos = 20;
      }

      doc.text(pocLines, 20, yPos);
      yPos += pocLines.length * 5 + 15;

      // DOC SECTION
      if (combinedDOC) {
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
        doc.text(
          `Compliance Date: ${format(combinedDOC, "MMM dd, yyyy")}`,
          20,
          yPos
        );
        yPos += 15;
      }

      // Comments Section
      if (comments.data && comments.data.length > 0) {
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
          if (yPos + 25 > 280) {
            doc.addPage();
            yPos = 20;
          }

          const authorName = comment.authorId;
          const commentDate = comment.createdAt
            ? format(new Date(comment.createdAt), "MMM dd, yyyy 'at' h:mm a")
            : "";

          doc.setFont("helvetica", "bold");
          doc.text(`${authorName} - ${commentDate}`, 20, yPos);
          yPos += 6;

          doc.setFont("helvetica", "normal");
          const commentLines = doc.splitTextToSize(comment.commentText, 170);
          doc.text(commentLines, 20, yPos);
          yPos += commentLines.length * 4 + 8;
        }
      }

      // Unmet Questions Summary
      if (sheetBlocks.length > 0) {
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
          if (yPos + 30 > 280) {
            doc.addPage();
            yPos = 20;
          }

          // Question text
          doc.setFont("helvetica", "bold");
          const questionLines = doc.splitTextToSize(block.questionText, 170);
          doc.text(questionLines, 20, yPos);
          yPos += questionLines.length * 4 + 3;

          // Details
          doc.setFont("helvetica", "normal");
          doc.text(
            `Sample: ${block.sampleSize} | Passed: ${block.passedCount} | Points: ${block.possiblePoints.toFixed(1)}`,
            20,
            yPos
          );
          yPos += 6;

          if (block.testingSample) {
            doc.text(`Testing Sample: ${block.testingSample}`, 20, yPos);
            yPos += 6;
          }

          if (block.comments) {
            doc.setFont("helvetica", "italic");
            const commentLines = doc.splitTextToSize(
              `Comments: ${block.comments}`,
              160
            );
            doc.text(commentLines, 25, yPos);
            yPos += commentLines.length * 4 + 3;
          }

          yPos += 5;
        }
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
  }, [
    survey,
    hasAnyPOC,
    surveyId,
    combinedPOC,
    combinedDOC,
    comments.data,
    sheetBlocks,
    surveyFacility,
  ]);

  // POC control
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
    const totalUnmetQuestions = sheetBlocks.length;

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
                <div className="text-sm text-muted-foreground mt-1">
                  QAL Audit Survey
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
                  <h3 className="text-lg font-medium text-gray-900 mb-1">
                    All Good!
                  </h3>
                  <p className="text-gray-500">
                    No questions have unmet answers that require a Plan of
                    Correction.
                  </p>
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
                          <h3 className="font-semibold text-gray-900 mb-1">
                            Questions Requiring Attention
                          </h3>
                          <p className="text-sm text-gray-600 leading-relaxed">
                            The following {totalUnmetQuestions} question
                            {totalUnmetQuestions !== 1 ? "s" : ""}{" "}
                            {totalUnmetQuestions === 1 ? "has" : "have"} unmet
                            requirements. Please review each question and
                            provide a comprehensive Plan of Correction.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Questions List */}
                  <div className="space-y-4">
                    {sheetBlocks.map((block, idx) => (
                      <Card key={block.pocId} className="border-l-2 border-l-red-400">
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
                                <span className="text-xs text-muted-foreground">
                                  {block.sectionTitle}
                                </span>
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

                  {/* Combined POC Input */}
                  <Card className="border-2 border-dashed border-gray-300">
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <FileText className="h-4 w-4 text-red-600" />
                        Combined Plan of Correction
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Textarea
                        placeholder="Enter your comprehensive Plan of Correction for all unmet items above..."
                        value={combinedPOC}
                        onChange={(e) => setCombinedPOC(e.target.value)}
                        rows={8}
                        className="text-sm resize-none"
                      />

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
                                !combinedDOC && "text-muted-foreground"
                              )}
                            >
                              {combinedDOC
                                ? format(combinedDOC, "MMM dd, yyyy")
                                : "Select date"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <CalendarComponent
                              mode="single"
                              selected={combinedDOC ?? undefined}
                              onSelect={(date) =>
                                setCombinedDOC(date ?? null)
                              }
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </CardContent>
                  </Card>

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
                  Cancel
                </Button>
              </SheetClose>
              <Button
                onClick={handleSaveCombinedPOC}
                disabled={pocUpsert.isPending || !combinedPOC.trim()}
                className="bg-red-600 hover:bg-red-700 min-w-32"
              >
                {pocUpsert.isPending
                  ? "Saving..."
                  : hasAnyPOC
                    ? "Update POC"
                    : "Save POC"}
              </Button>
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
          <h1 className="text-2xl font-bold">
            QAL Audit Survey #{surveyId}
          </h1>
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
                      disabled={lock.isPending || overallPercent === 0}
                      className="gap-2"
                    >
                      <Lock className="h-4 w-4" />
                      {lock.isPending ? "Locking..." : "Lock Survey"}
                    </Button>
                  </div>
                </TooltipTrigger>
                {overallPercent === 0 && (
                  <TooltipContent>
                    <p>Complete survey responses before locking</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>

      {!isLocked && overallPercent === 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please complete survey questions before locking. Enter sample size
            and # Passed or mark items as N/A for each question.
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
  const [comments, setComments] = useState(
    question.response?.comments ?? ""
  );

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
        <Input
          placeholder="IDs..."
          value={testingSample}
          onChange={(e) => setTestingSample(e.target.value)}
          disabled={isLocked || !isSampleSet}
          className="text-sm h-8 w-full"
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
