"use client";

import { api } from "@/trpc/react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

export default function TemplateSectionPage() {
  const params = useParams();
  const templateId = Number(params.templateId);
  const sectionId = Number(params.sectionId);

  const templateQ = api.qal.getTemplate.useQuery({ id: templateId });

  if (templateQ.isLoading) {
    return (
      <main className="p-6">
        <Card>
          <CardContent className="py-8">
            <div className="space-y-3">
              <Skeleton className="h-8 w-[400px]" />
              <Skeleton className="h-4 w-[300px]" />
            </div>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (!templateQ.data) {
    return (
      <main className="p-6">
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Template not found
          </CardContent>
        </Card>
      </main>
    );
  }

  const section = templateQ.data.sections.find(s => s.id === sectionId);

  if (!section) {
    return (
      <main className="p-6">
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Section not found
          </CardContent>
        </Card>
      </main>
    );
  }

  const totalSamples = section.questions.reduce((sum, q) => sum + q.fixedSample, 0);
  const totalPossiblePoints = section.questions.reduce((sum, q) => sum + Number(q.possiblePoints || 0), 0);

  return (
    <main className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/qal/template ">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Templates
          </Button>
        </Link>
      </div>

      {/* Template & Section Info */}
      <div className="space-y-1">
        <div className="text-sm text-muted-foreground">
          Template: {templateQ.data.template.name}
        </div>
        <h1 className="text-2xl font-bold tracking-tight">{section.title}</h1>
        {section.description && (
          <p className="text-sm text-muted-foreground">{section.description}</p>
        )}
      </div>

      {/* Section Stats */}
      <div className="flex items-center gap-3">
        <Badge variant="secondary">
          {section.questions.length} Question{section.questions.length !== 1 ? "s" : ""}
        </Badge>
        <Badge variant="outline">
          {totalSamples} Total Sample{totalSamples !== 1 ? "s" : ""}
        </Badge>
        <Badge variant="outline">
          {section.possiblePoints} Section Points
        </Badge>
      </div>

      {/* Questions Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Questions</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[60px]">#</TableHead>
                <TableHead>Question / Prompt</TableHead>
                <TableHead className="w-[120px] text-center">Sample Size</TableHead>
                <TableHead className="w-[120px] text-right">Possible Points</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {section.questions.map((q, idx) => (
                <TableRow key={q.id}>
                  <TableCell className="font-mono text-xs text-muted-foreground align-top">
                    {idx + 1}
                  </TableCell>
                  <TableCell>
                    <div className="space-y-2">
                      <div className="font-medium leading-tight">{q.prompt}</div>
                      {q.guidance && (
                        <div className="text-xs text-muted-foreground italic leading-tight">
                          <span className="font-semibold">Guidance:</span> {q.guidance}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-center align-top">
                    <Badge variant="secondary" className="font-mono">
                      {q.fixedSample}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium align-top">
                    {Number(q.possiblePoints || 0).toFixed(1)}
                  </TableCell>
                </TableRow>
              ))}
              {section.questions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    No questions defined for this section yet.
                  </TableCell>
                </TableRow>
              )}
              {section.questions.length > 0 && (
                <TableRow className="font-semibold bg-muted/50">
                  <TableCell />
                  <TableCell>Total</TableCell>
                  <TableCell className="text-center">{totalSamples}</TableCell>
                  <TableCell className="text-right">{totalPossiblePoints.toFixed(1)}</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </main>
  );
}
