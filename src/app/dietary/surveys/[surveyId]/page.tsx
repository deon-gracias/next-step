"use client";

import { useParams, useRouter } from "next/navigation";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Lock,
  Unlock,
  ChefHat,
  Calendar,
  User,
  FileText,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Save,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useState, useEffect, useMemo } from "react";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
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

type StatusType = "met" | "unmet" | "na";

export default function DietarySurveyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const surveyId = Number(params.surveyId);

  // Fetch survey with template, sections, and questions
  const survey = api.dietary.getById.useQuery({ id: surveyId });

  // Local state for responses
  const [responses, setResponses] = useState<
    Map<number, { status: StatusType; comments: string }>
  >(new Map());

  // Track if there are unsaved changes
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Load existing responses into state
  useEffect(() => {
    if (survey.data?.responses) {
      const responseMap = new Map<number, { status: StatusType; comments: string }>();
      survey.data.responses.forEach((r) => {
        responseMap.set(r.questionId, {
          status: (r.status as StatusType) || "na",
          comments: r.comments || "",
        });
      });
      setResponses(responseMap);
      setHasUnsavedChanges(false);
    }
  }, [survey.data?.responses]);

  // Calculate scores like Excel
  const { earnedScore, possibleScore, percentage } = useMemo(() => {
    const sections = survey.data?.template?.sections ?? [];
    let earned = 0;
    let possible = 0;

    sections.forEach((section) => {
      section.questions?.forEach((question) => {
        const response = responses.get(question.id);
        possible += question.points;
        
        // Only add points if status is "met"
        if (response?.status === "met") {
          earned += question.points;
        }
      });
    });

    const pct = possible > 0 ? Math.round((earned / possible) * 100) : 0;

    return {
      earnedScore: earned,
      possibleScore: possible,
      percentage: pct,
    };
  }, [responses, survey.data?.template?.sections]);

  // Mutations
  const utils = api.useUtils();
  const updateAnswer = api.dietary.updateAnswer.useMutation({
    onError: (error) => {
      toast.error(error.message ?? "Failed to update answer");
    },
  });

  const lockSurvey = api.dietary.lock.useMutation({
    onSuccess: () => {
      toast.success("Survey locked successfully");
      utils.dietary.getById.invalidate({ id: surveyId });
    },
    onError: (error) => {
      toast.error(error.message ?? "Failed to lock survey");
    },
  });

  const unlockSurvey = api.dietary.unlock.useMutation({
    onSuccess: () => {
      toast.success("Survey unlocked successfully");
      utils.dietary.getById.invalidate({ id: surveyId });
    },
    onError: (error) => {
      toast.error(error.message ?? "Failed to unlock survey");
    },
  });

  // Handle status change (local only)
  const handleStatusChange = (questionId: number, status: StatusType) => {
    const current = responses.get(questionId) ?? { status: "na", comments: "" };
    const newResponses = new Map(responses);
    newResponses.set(questionId, { ...current, status });
    setResponses(newResponses);
    setHasUnsavedChanges(true);
  };

  // Handle comments change (local only)
  const handleCommentsChange = (questionId: number, comments: string) => {
    const current = responses.get(questionId) ?? { status: "na", comments: "" };
    const newResponses = new Map(responses);
    newResponses.set(questionId, { ...current, comments });
    setResponses(newResponses);
    setHasUnsavedChanges(true);
  };

  // Save all responses to DB
  const handleSaveAll = async () => {
    const updates = Array.from(responses.entries()).map(([questionId, data]) => ({
      surveyId,
      questionId,
      status: data.status,
      comments: data.comments,
    }));

    try {
      await Promise.all(
        updates.map((update) => updateAnswer.mutateAsync(update))
      );
      toast.success("Survey saved successfully!");
      setHasUnsavedChanges(false);
      utils.dietary.getById.invalidate({ id: surveyId });
    } catch (error) {
      toast.error("Failed to save survey");
    }
  };

  if (survey.isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!survey.data) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Survey not found</p>
      </div>
    );
  }

  const isLocked = survey.data.isLocked;
  const sections = survey.data.template?.sections ?? [];

  // Calculate progress
  const totalQuestions = sections.reduce(
    (acc, section) => acc + (section.questions?.length ?? 0),
    0
  );
  const answeredQuestions = Array.from(responses.values()).filter(
    (r) => r.status !== "na"
  ).length;
  const progressPercentage =
    totalQuestions > 0 ? Math.round((answeredQuestions / totalQuestions) * 100) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <div className="border-b bg-white shadow-sm sticky top-0 z-10">
        <div className="p-4 max-w-7xl mx-auto">
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <ChefHat className="h-7 w-7 text-orange-600" />
                <div>
                  <h1 className="text-2xl font-bold">Dietary Survey #{surveyId}</h1>
                  <p className="text-sm text-muted-foreground">
                    Template: {survey.data.template?.name ?? "—"}
                  </p>
                </div>
                {isLocked ? (
                  <Badge className="bg-green-100 text-green-800 border-green-300">
                    <Lock className="h-3 w-3 mr-1" />
                    Locked
                  </Badge>
                ) : (
                  <Badge className="bg-amber-100 text-amber-800 border-amber-300">
                    <Unlock className="h-3 w-3 mr-1" />
                    In Progress
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5" />
                  <span>{survey.data.facility?.name ?? "—"}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>
                    {format(new Date(survey.data.surveyDate), "MMM dd, yyyy")}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5" />
                  <span>{survey.data.surveyor?.name ?? "—"}</span>
                </div>
              </div>
            </div>

            {/* Lock/Unlock Button */}
            <div className="flex items-center gap-3">
              {/* Save Button */}
              {!isLocked && (
                <Button
                  variant={hasUnsavedChanges ? "default" : "outline"}
                  size="sm"
                  onClick={handleSaveAll}
                  disabled={updateAnswer.isPending || !hasUnsavedChanges}
                  className={cn(
                    hasUnsavedChanges && "bg-blue-600 hover:bg-blue-700 animate-pulse"
                  )}
                >
                  <Save className="mr-2 h-3.5 w-3.5" />
                  {updateAnswer.isPending ? "Saving..." : hasUnsavedChanges ? "Save Changes" : "Saved"}
                </Button>
              )}

              {!isLocked ? (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="default"
                      size="sm"
                      disabled={progressPercentage < 100 || hasUnsavedChanges}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Lock className="mr-2 h-3.5 w-3.5" />
                      Lock Survey
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Lock Survey?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Once locked, edits will be disabled until unlocked.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => lockSurvey.mutate({ surveyId })}
                        disabled={lockSurvey.isPending}
                      >
                        {lockSurvey.isPending ? "Locking..." : "Lock Survey"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              ) : (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm">
                      <Unlock className="mr-2 h-3.5 w-3.5" />
                      Unlock Survey
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Unlock Survey?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Unlocking will allow edits again. Continue?
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => unlockSurvey.mutate({ surveyId })}
                        disabled={unlockSurvey.isPending}
                      >
                        {unlockSurvey.isPending ? "Unlocking..." : "Confirm Unlock"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </div>

          {/* Compact Score Display */}
          <div className="flex items-center justify-between bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg p-3 mb-3 border">
            <div className="flex items-center gap-6">
              {/* Earned Score */}
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <TrendingUp className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Earned</p>
                  <p className="text-lg font-bold text-blue-700">{earnedScore}</p>
                </div>
              </div>

              {/* Divider */}
              <div className="h-8 w-px bg-gray-300" />

              {/* Possible Score */}
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center">
                  <FileText className="h-4 w-4 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Possible</p>
                  <p className="text-lg font-bold text-purple-700">{possibleScore}</p>
                </div>
              </div>

              {/* Divider */}
              <div className="h-8 w-px bg-gray-300" />

              {/* Percentage */}
              <div className="flex items-center gap-2">
                <div className={cn(
                  "h-8 w-8 rounded-full flex items-center justify-center",
                  percentage >= 85 ? "bg-green-100" : "bg-red-100"
                )}>
                  <span className={cn(
                    "text-sm font-bold",
                    percentage >= 85 ? "text-green-700" : "text-red-700"
                  )}>
                    %
                  </span>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Compliance</p>
                  <p className={cn(
                    "text-lg font-bold",
                    percentage >= 85 ? "text-green-700" : "text-red-700"
                  )}>
                    {percentage}%
                  </p>
                </div>
              </div>
            </div>

            {/* Pass/Fail Badge */}
            <Badge 
              variant={percentage >= 85 ? "default" : "destructive"}
              className={cn(
                "text-sm font-bold px-4 py-1",
                percentage >= 85 ? "bg-green-600" : "bg-red-600"
              )}
            >
              {percentage >= 85 ? "PASS" : "FAIL"}
            </Badge>
          </div>

          {/* Compact Progress Bar */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-muted-foreground">
                Progress: {answeredQuestions} / {totalQuestions} questions
              </span>
              <span className="font-semibold">{progressPercentage}%</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="h-1.5 bg-green-600 transition-all duration-300"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Survey Content */}
      <div className="max-w-7xl mx-auto p-4 space-y-4">
        {sections.map((section) => {
          // Calculate section score
          const sectionEarned = section.questions?.reduce((acc, q) => {
            const resp = responses.get(q.id);
            return acc + (resp?.status === "met" ? q.points : 0);
          }, 0) ?? 0;

          return (
            <Card key={section.id} className="border-2">
              <CardHeader className="bg-gradient-to-r from-orange-50 to-amber-50 border-b py-3 px-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-semibold">
                      Section {section.sectionNumber}: {section.title}
                    </CardTitle>
                  </div>
                  <Badge variant="outline" className="text-sm font-mono">
                    {sectionEarned}/{section.maxPoints}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {section.questions?.map((question, index) => {
                  const response = responses.get(question.id) ?? {
                    status: "na" as StatusType,
                    comments: "",
                  };

                  return (
                    <div
                      key={question.id}
                      className={cn(
                        "p-4 border-b last:border-b-0",
                        index % 2 === 0 ? "bg-white" : "bg-slate-50/50"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        {/* Question Letter - Smaller */}
                        <div className="flex-shrink-0 w-7 h-7 rounded-full bg-orange-100 flex items-center justify-center font-semibold text-sm text-orange-700">
                          {question.questionLetter}
                        </div>

                        {/* Question Content */}
                        <div className="flex-1 space-y-3">
                          <div className="flex items-start justify-between gap-3">
                            <p className="text-sm font-medium leading-relaxed flex-1">
                              {question.questionText}
                            </p>
                            <Badge variant="outline" className="text-xs shrink-0">
                              {question.points}pts
                            </Badge>
                          </div>

                          {/* Status Buttons - Smaller */}
                          <div className="flex items-center gap-2">
                            <Button
                              variant={response.status === "met" ? "default" : "outline"}
                              size="sm"
                              disabled={isLocked}
                              onClick={() => handleStatusChange(question.id, "met")}
                              className={cn(
                                "gap-1.5 h-8 text-xs",
                                response.status === "met" &&
                                  "bg-green-600 hover:bg-green-700 text-white"
                              )}
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Met
                            </Button>
                            <Button
                              variant={response.status === "unmet" ? "default" : "outline"}
                              size="sm"
                              disabled={isLocked}
                              onClick={() => handleStatusChange(question.id, "unmet")}
                              className={cn(
                                "gap-1.5 h-8 text-xs",
                                response.status === "unmet" &&
                                  "bg-red-600 hover:bg-red-700 text-white"
                              )}
                            >
                              <XCircle className="h-3.5 w-3.5" />
                              Unmet
                            </Button>
                          </div>

                          {/* Comments - Smaller */}
                          {response.status === "unmet" && (
                            <Textarea
                              placeholder="Add comments or corrective actions..."
                              value={response.comments}
                              onChange={(e) =>
                                handleCommentsChange(question.id, e.target.value)
                              }
                              disabled={isLocked}
                              className="min-h-16 text-sm"
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          );
        })}

        {/* Save Button at Bottom */}
        {!isLocked && (
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              variant={hasUnsavedChanges ? "default" : "outline"}
              size="lg"
              onClick={handleSaveAll}
              disabled={updateAnswer.isPending || !hasUnsavedChanges}
              className={cn(
                "px-8",
                hasUnsavedChanges && "bg-blue-600 hover:bg-blue-700"
              )}
            >
              <Save className="mr-2 h-4 w-4" />
              {updateAnswer.isPending ? "Saving..." : hasUnsavedChanges ? "Save All Changes" : "All Changes Saved"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
