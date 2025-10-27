"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/trpc/react";
import { format } from "date-fns";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, FileText, CheckCircle2, Clock, Building2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import React from "react";

export default function QALSurveyShellPage() {
  const params = useParams();
  const surveyId = Number((params as any).surveyId);

  const q = api.qal.getSurvey.useQuery({ id: surveyId });

  if (q.isLoading) {
    return (
      <main className="p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-96 w-full" />
      </main>
    );
  }

  if (!q.data?.survey || !q.data.facility) {
    return (
      <main className="p-6">
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            Survey not found
          </CardContent>
        </Card>
      </main>
    );
  }

  const sv = q.data.survey;
  const facility = q.data.facility;
  const sections = q.data.sections;
  const isLocked = Boolean(sv.isLocked);
  const overall = Number(sv.overallPercent ?? 0);

  return (
    <main className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/qal/surveys">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Surveys
          </Button>
        </Link>
      </div>

      {/* Survey Info Card */}
      <Card className="border-2">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-muted-foreground" />
                <h1 className="text-2xl font-bold tracking-tight">{facility.name}</h1>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>Survey #{sv.id}</span>
                <span>•</span>
                <span>{sv.surveyDate ? format(new Date(sv.surveyDate), "MMM dd, yyyy") : "-"}</span>
                <span>•</span>
                <span className="capitalize">{sv.surveyType || "on-site"}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {isLocked ? (
                <>
                  <Badge variant="secondary" className="gap-1.5">
                    <CheckCircle2 className="h-3 w-3" />
                    Locked
                  </Badge>
                  <Link
                    href={`/qal/surveys/${sv.id}/report`}
                    className={buttonVariants({ variant: "default" })}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    View Report
                  </Link>
                </>
              ) : (
                <Badge variant="outline" className="gap-1.5">
                  <Clock className="h-3 w-3" />
                  In Progress
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Overall Score - Compact */}
      <Card className="border-l-4 border-primary">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-baseline gap-3">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-0.5">Overall Score</p>
                <span className="text-3xl font-bold text-primary">{overall.toFixed(1)}%</span>
              </div>
              <span className="text-sm text-muted-foreground">
                ({Number(sv.totalEarned).toFixed(1)} / {Number(sv.totalPossible).toFixed(1)} pts)
              </span>
            </div>
            <Badge 
              variant={overall >= 90 ? "default" : overall >= 80 ? "secondary" : "destructive"}
              className="text-sm px-3 py-1"
            >
              {overall >= 90 ? "Exceptional" : overall >= 80 ? "Standard" : overall >= 70 ? "Marginal" : "Unsatisfactory"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2">
        <Link
          href={`/qal/surveys/${sv.id}/facility/${facility.id}`}
          className={buttonVariants({ variant: "default", size: "sm" })}
        >
          Continue Survey
        </Link>
        <Link
          href={`/qal/surveys/${sv.id}/report`}
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          <FileText className="h-4 w-4 mr-2" />
          View Report
        </Link>
        <Link
          href="/qal/surveys"
          className={buttonVariants({ variant: "ghost", size: "sm" })}
        >
          Back to All Surveys
        </Link>
      </div>

      {/* Survey Details */}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-3">
            <div className="text-xs text-muted-foreground">Administrator</div>
            <div className="mt-1 font-medium text-sm">{sv.administrator || "—"}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="text-xs text-muted-foreground">Business Office Manager</div>
            <div className="mt-1 font-medium text-sm">{sv.businessOfficeManager || "—"}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="text-xs text-muted-foreground">Assistant BOM</div>
            <div className="mt-1 font-medium text-sm">{sv.assistantBusinessOfficeManager || "—"}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="text-xs text-muted-foreground">Survey Type</div>
            <div className="mt-1 font-medium text-sm capitalize">{sv.surveyType || "On-Site"}</div>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Sections Progress */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Survey Sections</h2>
        <div className="space-y-3">
          {sections.map((secRow, index) => {
            const earned = Number(secRow.response?.earnedPoints ?? 0);
            const possible = Number(secRow.section.possiblePoints ?? 0);
            const sectionScore = possible > 0 ? (earned / possible) * 100 : 0;
            
            return (
              <SectionCard 
                key={secRow.section.id}
                surveyId={surveyId}
                sectionId={secRow.section.id}
                index={index}
                title={secRow.section.title}
                description={secRow.section.description}
                sectionScore={sectionScore}
                earned={earned}
                possible={possible}
                facilityId={facility.id}
              />
            );
          })}
        </div>
      </div>
    </main>
  );
}

function SectionCard({ 
  surveyId, 
  sectionId, 
  index, 
  title, 
  description, 
  sectionScore, 
  earned, 
  possible,
  facilityId
}: {
  surveyId: number;
  sectionId: number;
  index: number;
  title: string;
  description: string | null;
  sectionScore: number;
  earned: number;
  possible: number;
  facilityId: number;
}) {
  const sectionData = api.qal.getSectionWithQuestions.useQuery({
    surveyId,
    sectionId,
  });

  const totalQuestions = sectionData.data?.questions.length || 0;
  const answeredQuestions = sectionData.data?.questions.filter(
    q => q.response && ((q.response.sampleSize ?? 0) > 0 || q.response.isNotApplicable)
  ).length || 0;
  const progressPercent = totalQuestions > 0 ? (answeredQuestions / totalQuestions) * 100 : 0;

  return (
    <Link 
      href={`/qal/surveys/${surveyId}/facility/${facilityId}`}
      className="block"
    >
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex-1">
              <div className="font-semibold text-sm">
                {index + 1}. {title}
              </div>
              {description && (
                <div className="text-xs text-muted-foreground mt-0.5">
                  {description}
                </div>
              )}
              <div className="text-xs text-muted-foreground mt-1">
                Progress: {answeredQuestions}/{totalQuestions} questions answered
              </div>
            </div>
            <div className="ml-4 flex flex-col items-end gap-1">
              <Badge 
                variant={sectionScore >= 90 ? "default" : "secondary"}
                className="font-semibold"
              >
                {sectionScore.toFixed(1)}%
              </Badge>
              <span className="text-xs text-muted-foreground">
                {earned.toFixed(1)} / {possible.toFixed(1)} pts
              </span>
            </div>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </CardContent>
      </Card>
    </Link>
  );
}
