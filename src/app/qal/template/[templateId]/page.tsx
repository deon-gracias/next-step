"use client";

import { useSearchParams, useParams, useRouter } from "next/navigation";
import { api } from "@/trpc/react";
import { useMemo, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, FileText } from "lucide-react";
import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function QALTemplateDetailPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const templateId = Number(params.templateId);
  const sectionIdParam = searchParams.get("sectionId");

  const tpl = api.qal.getTemplate.useQuery({ id: templateId });
  const [activeSection, setActiveSection] = useState<string | null>(null);

  // Get sections from template
  const sections = useMemo(() => {
    if (!tpl.data) return [];
    return tpl.data.sections ?? [];
  }, [tpl.data]);

  // Set initial active section from URL or first section
  useEffect(() => {
    if (!sections.length || activeSection) return;
    const fallback = sections[0]?.id ? String(sections[0].id) : "";
    setActiveSection(sectionIdParam ? String(sectionIdParam) : fallback);
  }, [sections, sectionIdParam, activeSection]);

  if (tpl.isLoading) {
    return (
      <main className="p-6">
        <Card>
          <CardContent className="py-8">
            <div className="space-y-3">
              <Skeleton className="h-8 w-[300px]" />
              <Skeleton className="h-4 w-[200px]" />
            </div>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (!tpl.data) {
    return (
      <main className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Template not found</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            The requested template does not exist or you don't have access to it.
          </CardContent>
        </Card>
      </main>
    );
  }

  const totalPossible = sections.reduce((sum, s) => sum + Number(s.possiblePoints), 0);
  const totalQuestions = sections.reduce((sum, s) => sum + s.questions.length, 0);

  return (
    <main className="p-6 space-y-6">
      {/* Back Button */}
      <div>
        <Link href="/qal/templates">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Templates
          </Button>
        </Link>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <FileText className="h-6 w-6 text-muted-foreground" />
            <h1 className="text-2xl font-bold">{tpl.data.template.name}</h1>
          </div>
          {tpl.data.template.meta && (
            <p className="text-sm text-muted-foreground">{tpl.data.template.meta}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{sections.length} Sections</Badge>
          <Badge variant="outline">{totalQuestions} Questions</Badge>
          <Badge variant="outline">{totalPossible} Total Points</Badge>
        </div>
      </div>

      {/* Sections Overview Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Sections Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[60px]">#</TableHead>
                <TableHead>Section</TableHead>
                <TableHead className="text-center">Questions</TableHead>
                <TableHead className="text-right">Sample Size</TableHead>
                <TableHead className="text-right">Possible Points</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sections.map((s, idx) => (
                <TableRow key={s.id}>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {idx + 1}
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{s.title}</div>
                      {s.description && (
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {s.description}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary" className="font-mono">
                      {s.questions.length}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {s.questions.reduce((sum, q) => sum + q.fixedSample, 0)}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {Number(s.possiblePoints)}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="font-semibold bg-muted/50">
                <TableCell />
                <TableCell>Total</TableCell>
                <TableCell className="text-center">{totalQuestions}</TableCell>
                <TableCell className="text-right">
                  {sections.reduce((sum, s) => sum + s.questions.reduce((qsum, q) => qsum + q.fixedSample, 0), 0)}
                </TableCell>
                <TableCell className="text-right">{totalPossible}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Detailed Questions by Section */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Questions by Section</CardTitle>
        </CardHeader>
        <CardContent>
          {sections.length === 0 ? (
            <div className="text-sm text-muted-foreground py-8 text-center">
              No sections available.
            </div>
          ) : (
            <Tabs value={activeSection ?? ""} onValueChange={setActiveSection}>
              <TabsList className="flex flex-wrap gap-2 h-auto">
                {sections.map((s) => (
                  <TabsTrigger key={s.id} value={String(s.id)} className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                    {s.title}
                  </TabsTrigger>
                ))}
              </TabsList>

              {sections.map((s) => (
                <TabsContent key={s.id} value={String(s.id)} className="mt-4">
                  <SectionQuestions section={s} questions={s.questions} />
                </TabsContent>
              ))}
            </Tabs>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

function SectionQuestions({
  section,
  questions,
}: {
  section: any;
  questions: any[];
}) {
  if (questions.length === 0) {
    return (
      <div className="text-sm text-muted-foreground py-8 text-center">
        No questions configured for this section.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Section Info */}
      <div className="rounded-lg bg-muted/50 p-4 space-y-2">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold text-lg">{section.title}</h3>
            {section.description && (
              <p className="text-sm text-muted-foreground mt-1">{section.description}</p>
            )}
          </div>
          <Badge variant="outline" className="ml-2">
            {section.possiblePoints} Points
          </Badge>
        </div>
      </div>

      {/* Questions List */}
      <div className="space-y-3">
        {questions.map((q, idx) => (
          <Card key={q.id} className="border-l-4 border-l-primary/20">
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                  {idx + 1}
                </div>
                <div className="flex-1 space-y-2">
                  <div className="font-medium text-sm">{q.prompt}</div>
                  {q.guidance && (
                    <div className="text-xs text-muted-foreground italic bg-muted/30 p-2 rounded">
                      💡 {q.guidance}
                    </div>
                  )}
                  <div className="flex items-center gap-2 pt-1">
                    <Badge variant="secondary" className="text-xs">
                      Sample Size: {q.fixedSample}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      Sort Order: {q.sortOrder}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Section Summary */}
      <div className="rounded-lg bg-muted p-3 flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Section Total</span>
        <div className="flex items-center gap-4">
          <span className="font-medium">
            {questions.length} question{questions.length !== 1 ? "s" : ""}
          </span>
          <span className="font-medium">
            Sample: {questions.reduce((sum, q) => sum + q.fixedSample, 0)}
          </span>
          <span className="font-semibold text-primary">
            {section.possiblePoints} points
          </span>
        </div>
      </div>
    </div>
  );
}
