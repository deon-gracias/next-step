"use client";

import React, { useState, useMemo } from "react";
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
import { ArrowLeft, Info, FileText, Lock, LockOpen, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Alert,
  AlertDescription,
} from "@/components/ui/alert";

export default function QALSurveyPage() {
  const params = useParams();
  const router = useRouter();
  const surveyId = Number(params.surveyId);

  const surveyQ = api.qal.getSurvey.useQuery({ id: surveyId });
  const lock = api.qal.lock.useMutation();
  const unlock = api.qal.unlock.useMutation();

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
        <div className="text-center text-muted-foreground">Survey not found</div>
      </div>
    );
  }

  const { survey, facility: surveyFacility } = surveyQ.data;

  const overallPercent = Number(survey.overallPercent || 0);
  const totalEarned = Number(survey.totalEarned || 0);
  const totalPossible = Number(survey.totalPossible || 0);

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

      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">QAL Audit Survey #{surveyId}</h1>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>Facility: {surveyFacility?.name ?? `ID ${survey.facilityId}`}</span>
            <span>•</span>
            <span>Date: {survey.surveyDate ? format(new Date(survey.surveyDate), "MMM dd, yyyy") : "-"}</span>
          </div>
        </div>
        <div className="flex gap-2 items-center">
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
            Please complete survey questions before locking. Enter sample size and # Passed or mark items as N/A for each question.
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
  section: { id: number; title: string; description: string | null; possiblePoints: number };
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
          <div className="text-center text-muted-foreground">Loading section...</div>
        </CardContent>
      </Card>
    );
  }

  if (!sectionData.data) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">Failed to load section</div>
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
              <p className="text-sm text-muted-foreground mt-1">{section.description}</p>
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
                <th className="text-left p-3 font-semibold text-sm border-r bg-muted/90" style={{ width: "25%" }}>
                  Process to be Audited
                </th>
                <th className="text-center p-3 font-semibold text-sm border-r bg-muted/90" style={{ width: "8%" }}>
                  Possible
                </th>
                <th className="text-center p-3 font-semibold text-sm border-r bg-muted/90" style={{ width: "8%" }}>
                  Sample
                </th>
                <th className="text-center p-3 font-semibold text-sm border-r bg-muted/90" style={{ width: "10%" }}>
                  Passed
                </th>
                <th className="text-center p-3 font-semibold text-sm border-r bg-muted/90" style={{ width: "8%" }}>
                  Earned
                </th>
                <th className="text-left p-3 font-semibold text-sm border-r bg-muted/90" style={{ width: "12%" }}>
                  Testing Sample
                </th>
                <th className="text-left p-3 font-semibold text-sm bg-muted/90" style={{ width: "29%" }}>
                  <div className="flex items-center gap-1">
                    <span>Comments</span>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-sm">
                          <p className="text-xs">
                            Record explanation when a sample does not pass testing. If an item is not applicable for scoring, check N/A and add a comment explaining why.
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
                <td className="text-center p-3 border-r bg-muted/90">{adjustedPossible.toFixed(1)}</td>
                <td className="text-center p-3 border-r bg-muted/90">{totalSample}</td>
                <td className="text-center p-3 border-r bg-muted/90">{totalPassed}</td>
                <td className="text-center p-3 border-r bg-muted/90">{earned.toFixed(2)}</td>
                <td colSpan={2} className="p-3 bg-muted/90"></td>
              </tr>

              {isLastSection && (
                <>
                  <tr className="h-4"></tr>
                  <tr className="border-t-4 border-primary sticky bottom-0">
                    <td colSpan={7} className="p-4 bg-primary/5 backdrop-blur-sm">
                      <div className="flex justify-between items-center">
                        <span className="text-lg font-bold">Survey Grand Total</span>
                        <div className="flex items-center gap-4">
                          <span className="text-sm font-medium">
                            {totalEarned.toFixed(2)} / {totalPossible.toFixed(1)}
                          </span>
                          <Badge variant={overallPercent >= 90 ? "default" : "secondary"} className="text-lg px-4 py-2">
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
    question.response?.sampleSize?.toString() ?? question.fixedSample?.toString() ?? ""
  );

  const [passedCount, setPassedCount] = useState(
    question.response?.passedCount?.toString() ?? ""
  );
  const [isNA, setIsNA] = useState(question.response?.isNotApplicable ?? false);
  const [testingSample, setTestingSample] = useState(question.response?.testingSample ?? "");
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
  const hasExistingResponse = question.response !== null && question.response !== undefined;

  const handleSave = async () => {
    try {
      const parsedSample = sampleSize ? parseInt(sampleSize, 10) : 0;
      const parsed = passedCount ? parseInt(passedCount, 10) : 0;

      if (parsedSample === 0 && !isNA) {
        toast.error("Please enter a sample size first");
        return;
      }

      if (!isNA && parsed > parsedSample) {
        toast.error(`Passed count cannot exceed sample size (${parsedSample})`);
        return;
      }

      const loadingToast = toast.loading(hasExistingResponse ? "Updating..." : "Saving...");

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
    <tr className={`border-b ${!hasExistingResponse && !isLocked ? 'bg-yellow-50/50' : ''}`}>
      <td className="p-3 align-top border-r" style={{ width: "25%" }}>
        <div className="space-y-1">
          <div className="font-medium text-sm leading-tight">{question.prompt}</div>
          {question.guidance && (
            <div className="text-xs text-muted-foreground italic leading-tight">{question.guidance}</div>
          )}
        </div>
      </td>
      <td className="text-center p-3 align-top border-r" style={{ width: "8%" }}>
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
                setIsNA(!!checked);
                if (checked) {
                  setPassedCount("");
                }
              }}
              disabled={isLocked || !isSampleSet}
              className="h-3.5 w-3.5"
            />
            <span className="text-xs text-muted-foreground">N/A</span>
          </label>
        </div>
      </td>
      <td className="text-center p-3 align-top border-r" style={{ width: "8%" }}>
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
            placeholder={isNA ? "Required: Explain why N/A" : "Optional: Explain issues..."}
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
            {saveMutation.isPending ? (hasExistingResponse ? "Updating..." : "Saving...") : (hasExistingResponse ? "Update" : "Save")}
          </Button>
        </div>
      </td>
    </tr>
  );
}
