"use client";

import { api } from "@/trpc/react";
import Link from "next/link";
import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants, Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { FileText } from "lucide-react";
import React from "react";

export default function QALTemplatePage() {
  const templates = api.qal.listTemplates.useQuery();
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);

  // Auto-select first template when loaded
  React.useEffect(() => {
    if (templates.data?.[0]?.id && templates.data.length > 0 && !selectedTemplateId) {
      setSelectedTemplateId(templates.data[0].id);
    }
  }, [templates.data, selectedTemplateId]);

  const templateDetail = api.qal.getTemplate.useQuery(
    { id: selectedTemplateId! },
    { enabled: !!selectedTemplateId }
  );

  if (templates.isLoading) {
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

  if (!templates.data || templates.data.length === 0) {
    return (
      <main className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>No QAL Templates Found</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p>No templates exist yet. Create a template or seed using qal_seed.ts.</p>
            <div className="mt-4">
              <Link href="/qal/templates/new" className={buttonVariants({ variant: "default" })}>
                Create Template
              </Link>
            </div>
          </CardContent>
        </Card>
      </main>
    );
  }

  const tpl = templateDetail.data;
  const totalPossible = tpl?.sections?.reduce((s, r) => s + Number(r.possiblePoints ?? 0), 0) ?? 0;

  return (
    <main className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">QAL Templates</h1>
          <p className="text-sm text-muted-foreground">
            View and manage facility-level audit templates with sections and questions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={selectedTemplateId?.toString() ?? ""}
            onValueChange={(val) => setSelectedTemplateId(Number(val))}
          >
            <SelectTrigger className="w-[300px]">
              <SelectValue placeholder="Select template" />
            </SelectTrigger>
            <SelectContent>
              {templates.data.map((t) => (
                <SelectItem key={t.id} value={t.id.toString()}>
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    {t.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Separator />

      {/* Template Details */}
      {templateDetail.isLoading ? (
        <Card>
          <CardContent className="py-8">
            <div className="space-y-3">
              <Skeleton className="h-6 w-[400px]" />
              <Skeleton className="h-4 w-[300px]" />
            </div>
          </CardContent>
        </Card>
      ) : tpl ? (
        <>
          {/* Template Info Card */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>{tpl.template.name}</CardTitle>
                  {tpl.template.meta && (
                    <p className="text-sm text-muted-foreground mt-1">{tpl.template.meta}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">
                    {tpl.sections.length} Section{tpl.sections.length !== 1 ? "s" : ""}
                  </Badge>
                  <Badge variant="outline">
                    {tpl.sections.reduce((sum, s) => sum + s.questions.length, 0)} Question
                    {tpl.sections.reduce((sum, s) => sum + s.questions.length, 0) !== 1 ? "s" : ""}
                  </Badge>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Sections Table */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Sections & Questions</CardTitle>
                <Badge variant="outline">Total Possible: {totalPossible}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[60px]">#</TableHead>
                    <TableHead>Section</TableHead>
                    <TableHead className="text-center">Questions</TableHead>
                    <TableHead className="text-right">Possible Points</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tpl.sections.map((s, idx) => (
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
                      <TableCell className="text-right font-medium">
                        {Number(s.possiblePoints)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Link
                          href={`/qal/template/${tpl.template.id}/sections/${s.id}`}
                          className={buttonVariants({ variant: "outline", size: "sm" })}
                        >
                          View Questions
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                  {tpl.sections.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        No sections defined for this template yet.
                      </TableCell>
                    </TableRow>
                  )}
                  {tpl.sections.length > 0 && (
                    <TableRow className="font-semibold bg-muted/50">
                      <TableCell />
                      <TableCell>Total</TableCell>
                      <TableCell className="text-center">
                        {tpl.sections.reduce((sum, s) => sum + s.questions.length, 0)}
                      </TableCell>
                      <TableCell className="text-right">{totalPossible}</TableCell>
                      <TableCell />
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      ) : null}
    </main>
  );
}
