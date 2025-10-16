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

  // Get template to calculate total samples from ALL questions
  const templateQ = api.qal.getTemplate.useQuery(
    { id: surveyQ.data?.survey.templateId ?? 0 },
    { enabled: !!surveyQ.data?.survey.templateId }
  );

  const isLocked = Boolean(surveyQ.data?.survey.isLocked);

  const allQuestionsAnswered = useMemo(() => {
    if (!surveyQ.data?.sections) return false;
    return surveyQ.data.sections.every(secRow => {
      return secRow.response !== null;
    });
  }, [surveyQ.data]);

  // Calculate grand totals - use template for total samples
  const grandTotals = useMemo(() => {
    if (!surveyQ.data?.sections) {
      return { totalPossible: 0, totalSamples: 0, totalPassed: 0, totalEarned: 0, overallPercent: 0 };
    }

    let totalPossible = 0;
    let totalPassed = 0;
    let totalEarned = 0;

    surveyQ.data.sections.forEach(secRow => {
      totalPossible += Number(secRow.section.possiblePoints || 0);
      
      if (secRow.response) {
        totalPassed += Number(secRow.response.passedCount || 0);
        totalEarned += Number(secRow.response.earnedPoints || 0);
      }
    });

    // Get total samples from template (all questions, not just filled ones)
    let totalSamples = 0;
    if (templateQ.data?.sections) {
      templateQ.data.sections.forEach(section => {
        section.questions.forEach(question => {
          totalSamples += question.fixedSample;
        });
      });
    }

    // Calculate overall percentage based on earned/possible
    const overallPercent = totalPossible > 0 ? (totalEarned / totalPossible) * 100 : 0;

    return { totalPossible, totalSamples, totalPassed, totalEarned, overallPercent };
  }, [surveyQ.data, templateQ.data]);

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
      {/* Header with back button */}
      <div className="flex items-center gap-4">
        <Link href="/qal/surveys">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Surveys
          </Button>
        </Link>
      </div>

      {/* Survey Info Header */}
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
                      disabled={lock.isPending || grandTotals.overallPercent === 0}
                      className="gap-2"
                    >
                      <Lock className="h-4 w-4" />
                      {lock.isPending ? "Locking..." : "Lock Survey"}
                    </Button>
                  </div>
                </TooltipTrigger>
                {grandTotals.overallPercent === 0 && (
                  <TooltipContent>
                    <p>Complete survey responses before locking</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>

      {/* Alert for incomplete survey */}
      {!isLocked && grandTotals.overallPercent === 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please complete survey questions before locking. Enter # Passed or mark items as N/A for each question.
          </AlertDescription>
        </Alert>
      )}

      <Separator />

      {/* Sections */}
      {surveyQ.data.sections.map((secRow, index) => (
        <SectionCard
          key={secRow.section.id}
          surveyId={surveyId}
          section={secRow.section}
          isLocked={isLocked}
          refetch={surveyQ.refetch}
          isLastSection={index === surveyQ.data.sections.length - 1}
          grandTotals={grandTotals}
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
  grandTotals,
}: {
  surveyId: number;
  section: { id: number; title: string; description: string | null; possiblePoints: number };
  isLocked: boolean;
  refetch: () => Promise<any>;
  isLastSection?: boolean;
  grandTotals?: { 
    totalPossible: number; 
    totalSamples: number; 
    totalPassed: number; 
    totalEarned: number;
    overallPercent: number;
  };
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

  const totalSample = questions.reduce((sum, q) => sum + q.fixedSample, 0);
  const totalPassed = questions.reduce((sum, q) => {
    if (q.response?.isNotApplicable) return sum;
    return sum + (q.response?.passedCount ?? 0);
  }, 0);

  const earned = Number(sectionResponse?.earnedPoints ?? 0);
  const possible = section.possiblePoints;
  const pct = possible > 0 ? (earned / possible) * 100 : 0;

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
              {earned.toFixed(2)} / {possible}
            </div>
            <Badge variant={pct >= 90 ? "default" : "secondary"}>
              {pct.toFixed(1)}%
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <div className="w-full overflow-x-auto">
          <table className="w-full border-collapse border">
            <thead>
              <tr className="bg-muted/50 border-b">
                <th className="text-left p-3 font-semibold text-sm border-r" style={{ width: "25%" }}>
                  Process to be Audited
                </th>
                <th className="text-center p-3 font-semibold text-sm border-r" style={{ width: "8%" }}>
                  Possible
                </th>
                <th className="text-center p-3 font-semibold text-sm border-r" style={{ width: "8%" }}>
                  Sample
                </th>
                <th className="text-center p-3 font-semibold text-sm border-r" style={{ width: "10%" }}>
                  Passed
                </th>
                <th className="text-center p-3 font-semibold text-sm border-r" style={{ width: "8%" }}>
                  Earned
                </th>
                <th className="text-left p-3 font-semibold text-sm border-r" style={{ width: "12%" }}>
                  Testing Sample
                </th>
                <th className="text-left p-3 font-semibold text-sm" style={{ width: "29%" }}>
                  <div className="flex items-center gap-1">
                    <span>Comments</span>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-sm">
                          <p className="text-xs">
                            Record explanation when a sample does not pass testing. If an item is not applicable for scoring, enter sample number in "# Passed" column. When applying this rule, a comment of "Not Applicable" is required.
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
              <tr className="border-t-2 font-semibold bg-muted/50">
                <td className="p-3 border-r">Section Total</td>
                <td className="text-center p-3 border-r">{possible}</td>
                <td className="text-center p-3 border-r">{totalSample}</td>
                <td className="text-center p-3 border-r">{totalPassed}</td>
                <td className="text-center p-3 border-r">{earned.toFixed(2)}</td>
                <td colSpan={2} className="p-3"></td>
              </tr>
              
              {/* Grand Total Row - Only show on last section */}
              {isLastSection && grandTotals && (
                <>
                  <tr className="h-4"></tr>
                  <tr className="border-t-4 border-primary">
                    <td colSpan={7} className="p-4 bg-primary/5">
                      <div className="flex justify-between items-center">
                        <span className="text-lg font-bold">Survey Grand Total</span>
                        <div className="flex items-center gap-4">
                          <span className="text-sm font-medium">
                            {grandTotals.totalEarned.toFixed(2)} / {grandTotals.totalPossible}
                          </span>
                          <Badge variant={grandTotals.overallPercent >= 90 ? "default" : "secondary"} className="text-lg px-4 py-2">
                            {grandTotals.overallPercent.toFixed(1)}%
                          </Badge>
                        </div>
                      </div>
                    </td>
                  </tr>
                  <tr className="border-b-2 font-bold bg-primary/10 text-base">
                    <td className="p-4 border-r">GRAND TOTAL</td>
                    <td className="text-center p-4 border-r text-primary">{grandTotals.totalPossible}</td>
                    <td className="text-center p-4 border-r">{grandTotals.totalSamples}</td>
                    <td className="text-center p-4 border-r">{grandTotals.totalPassed}</td>
                    <td className="text-center p-4 border-r text-primary">{grandTotals.totalEarned.toFixed(2)}</td>
                    <td colSpan={2} className="p-4"></td>
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
  const [passedCount, setPassedCount] = useState(
    question.response?.passedCount?.toString() ?? ""
  );
  const [isNA, setIsNA] = useState(question.response?.isNotApplicable ?? false);
  const [testingSample, setTestingSample] = useState(question.response?.testingSample ?? "");
  const [comments, setComments] = useState(question.response?.comments ?? "");

  const saveMutation = api.qal.saveQuestionResponse.useMutation();

  const calculateEarnedPoints = () => {
    if (isNA) return 0;
    
    const passed = passedCount ? parseInt(passedCount, 10) : 0;
    const sample = question.fixedSample;
    const possiblePoints = Number(question.possiblePoints || 0);
    
    if (sample === 0) return 0;
    
    return (passed / sample) * possiblePoints;
  };

  const earnedPoints = calculateEarnedPoints();

  const hasExistingResponse = question.response !== null && question.response !== undefined;

  const handleSave = async () => {
    try {
      const parsed = passedCount ? parseInt(passedCount, 10) : 0;
      
      if (!isNA && parsed > question.fixedSample) {
        toast.error(`Passed count cannot exceed sample size (${question.fixedSample})`);
        return;
      }

      const loadingToast = toast.loading(hasExistingResponse ? "Updating..." : "Saving...");

      await saveMutation.mutateAsync({
        surveyId,
        questionId: question.id,
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
          {Number(question.possiblePoints || 0).toFixed(1)}
        </span>
      </td>
      <td className="text-center p-3 align-top border-r" style={{ width: "8%" }}>
        <span className="text-sm font-mono">{question.fixedSample}</span>
      </td>
      <td className="p-3 align-top border-r" style={{ width: "10%" }}>
        <div className="flex flex-col items-center gap-2">
          <Input
            type="number"
            min={0}
            max={question.fixedSample}
            value={passedCount}
            onChange={(e) => setPassedCount(e.target.value)}
            disabled={isLocked || isNA}
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
              disabled={isLocked}
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
          disabled={isLocked}
          className="text-sm h-8 w-full"
        />
      </td>
      <td className="p-3 align-top" style={{ width: "29%" }}>
        <div className="space-y-2">
          <Textarea
            placeholder={isNA ? "Optional: Explain N/A" : "Optional: Explain issues..."}
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            disabled={isLocked}
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
