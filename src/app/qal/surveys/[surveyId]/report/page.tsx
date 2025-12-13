// src/app/qal/surveys/[surveyId]/report/page.tsx
"use client";

import React, { useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { ArrowLeft, Download, AlertTriangle, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { usePDF } from "react-to-pdf";
import { authClient } from "@/components/providers/auth-client";

export default function QALReportPage() {
  const params = useParams();
  const surveyId = Number(params.surveyId);
  const [isExporting, setIsExporting] = useState(false);
  
  // Get current user from authClient
  const { data: session } = authClient.useSession();
  const user = session?.user;

  const surveyQ = api.qal.getSurvey.useQuery({ id: surveyId });

  const { toPDF, targetRef } = usePDF({
    filename: `QAL_Report_${surveyQ.data?.facility?.name?.replace(/\s+/g, '_')}_${surveyQ.data?.survey.surveyDate ? format(new Date(surveyQ.data.survey.surveyDate), 'yyyy-MM-dd') : 'report'}.pdf`,
    page: { margin: 10, format: 'a4' }
  });

  const handleExportPDF = async () => {
    setIsExporting(true);
    const loadingToast = toast.loading("Generating PDF...");

    try {
      await toPDF();
      toast.dismiss(loadingToast);
      toast.success("PDF exported successfully!");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.dismiss(loadingToast);
      toast.error("Failed to generate PDF. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  if (surveyQ.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-lg font-medium">Loading report...</div>
        </div>
      </div>
    );
  }

  if (!surveyQ.data) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center text-muted-foreground">Survey not found</div>
      </div>
    );
  }

  const { survey, sections, facility } = surveyQ.data;
  const overall = Number(survey.overallPercent ?? 0);

  const getQualityRating = (score: number) => {
    if (score >= 90) return { label: "Exceptional Quality", color: "bg-green-500/10 text-green-700 border-green-200" };
    if (score >= 80) return { label: "Standard Quality", color: "bg-yellow-500/10 text-yellow-700 border-yellow-200" };
    if (score >= 70) return { label: "Marginal Quality", color: "bg-orange-500/10 text-orange-700 border-orange-200" };
    return { label: "Unsatisfactory Quality", color: "bg-red-500/10 text-red-700 border-red-200" };
  };

  const qualityRating = getQualityRating(overall);

  // Format date range for months reviewed
  const getMonthsReviewed = () => {
    if (!survey.surveyDate) return "N/A";
    const surveyDate = new Date(survey.surveyDate);
    return format(surveyDate, "MM/yyyy");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header Bar */}
      <div className="bg-white border-b sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href={`/qal/surveys/${surveyId}`}>
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Survey
            </Button>
          </Link>
          <Button 
            variant="outline" 
            className="gap-2"
            onClick={handleExportPDF}
            disabled={isExporting}
          >
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating PDF...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Export PDF
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div ref={targetRef} className="max-w-7xl mx-auto px-6 py-8 space-y-6 bg-white">
        {/* Title Card */}
        <Card className="border-2 shadow-lg">
          <CardContent className="p-8 text-center">
            <h1 className="text-3xl font-bold tracking-tight">
              2025 QAL RCO BUSINESS OFFICE SITE VISIT/AUDIT
            </h1>
          </CardContent>
        </Card>

        {/* Facility Information */}
        <Card className="shadow-md">
          <CardContent className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
              {/* Left Column */}
              <div className="space-y-3">
                <InfoRow label="FACILITY:" value={facility?.name || "N/A"} />
                <InfoRow 
                  label="RCO Quality Assurance Liaison Conducting Visit/Audit:" 
                  value={user?.name || "N/A"} 
                />
                <InfoRow 
                  label="Months Reviewed:" 
                  value={getMonthsReviewed()} 
                />
                <InfoRow 
                  label="Administrator:" 
                  value={survey.administrator || "N/A"} 
                />
              </div>

              {/* Right Column */}
              <div className="space-y-3">
                <InfoRow 
                  label="Date of Audit:" 
                  value={survey.surveyDate ? format(new Date(survey.surveyDate), "MM/dd/yy") : "N/A"} 
                />
                <InfoRow 
                  label="Operations:" 
                  value={survey.surveyType === "onsite" ? "On-Site" : "Off-Site"} 
                />
                <InfoRow 
                  label="Business Office Manager:" 
                 value={survey.businessOfficeManager || ""} 
                />
                <InfoRow 
                  label="Business Office Assistant or Designee:" 
                  value={survey.assistantBusinessOfficeManager || ""} 
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Scores Section */}
        <Card className="shadow-md">
          <CardContent className="p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-bold">SCORES</h2>
              <p className="text-sm text-muted-foreground mt-1">RCO Areas Audited for Compliance:</p>
            </div>

            <div className="space-y-3">
              {sections.map((secRow, index) => {
                const earned = Number(secRow.response?.earnedPoints ?? 0);
                const possible = Number(secRow.section.possiblePoints ?? 0);
                const sectionScore = possible > 0 ? (earned / possible) * 100 : 0;

                return (
                  <div 
                    key={secRow.section.id} 
                    className="flex items-start justify-between p-4 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="font-semibold text-base">
                        {index + 1}. {secRow.section.title} -
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {secRow.section.description}
                      </div>
                    </div>
                    <div className="ml-6 flex items-center">
                      {possible === 0 ? (
                        <div className="flex items-center gap-2 bg-yellow-100 px-4 py-2 rounded-lg">
                          <AlertTriangle className="h-5 w-5 text-yellow-600" />
                          <span className="text-sm font-medium text-yellow-700">N/A</span>
                        </div>
                      ) : (
                        <Badge 
                          variant={sectionScore >= 90 ? "default" : "secondary"}
                          className="text-lg px-4 py-2 font-semibold"
                        >
                          {sectionScore.toFixed(2)}%
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Overall Score */}
<Card className="border-2 border-green-600 shadow-lg">
  <CardContent className="p-8">
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-2xl font-bold  text-green-600">OVERALL SCORE</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {qualityRating.label}
        </p>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-right">
          <div className="text-sm text-muted-foreground">Total Score</div>
          <div className="text-5xl font-bold text-green-600">
            {overall.toFixed(2)}%
          </div>
        </div>
      </div>
    </div>
  </CardContent>
</Card>


        {/* Action Plan Notice */}
        {overall < 90 && (
          <Card className="border-l-4 border-orange-500 bg-orange-50/50 shadow-md">
            <CardContent className="p-6">
              <div className="flex gap-3">
                <AlertTriangle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
                <div className="space-y-2">
                  <p className="font-semibold text-orange-900">
                    Action Required
                  </p>
                  <p className="text-sm text-orange-800">
                    Steps to address Section scores below 90% threshold are to be included in Facility Plan of Correction.
                  </p>
                  <p className="text-sm text-orange-800">
                    Administrator is responsible to monitor progress and Plan of Correction.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Score Legend */}
        <Card className="shadow-md">
          <CardContent className="p-8">
            <h3 className="text-xl font-bold mb-4">Score Legend</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <ScoreLegendItem 
                range="90-100%" 
                label="Exceptional Quality" 
                color="bg-green-100 border-green-300 text-green-800"
              />
              <ScoreLegendItem 
                range="80-89%" 
                label="Standard Quality" 
                color="bg-yellow-100 border-yellow-300 text-yellow-800"
              />
              <ScoreLegendItem 
                range="70-79%" 
                label="Marginal Quality (Action Plan Required)" 
                color="bg-orange-100 border-orange-300 text-orange-800"
              />
              <ScoreLegendItem 
                range="Less than 69%" 
                label="Unsatisfactory Quality (Action Plan Required) (Priority Facility)" 
                color="bg-red-100 border-red-300 text-red-800"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="font-semibold text-sm min-w-[200px] text-slate-700">{label}</span>
      <span className="text-sm text-slate-900">{value || "—"}</span>
    </div>
  );
}

function ScoreLegendItem({ range, label, color }: { range: string; label: string; color: string }) {
  return (
    <div className={`flex items-center gap-4 p-4 rounded-lg border ${color}`}>
      <span className="font-bold text-base min-w-[100px]">{range}</span>
      <span className="text-sm font-medium">{label}</span>
    </div>
  );
}
