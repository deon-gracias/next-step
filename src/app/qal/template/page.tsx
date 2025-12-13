"use client";

import { api } from "@/trpc/react";
import Link from "next/link";
import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants, Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { FileText, Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import React from "react";
import { toast } from "sonner";

type QuestionFormType = {
  prompt: string;
  guidance: string;
  fixedSample: number;
  possiblePoints: number;
};

type SectionFormType = {
  title: string;
  description: string;
  possiblePoints: number;
  questions: QuestionFormType[];
};

type TemplateFormType = {
  name: string;
  meta: string;
  sections: SectionFormType[];
};

export default function QALTemplatePage() {
  const templates = api.qal.listTemplates.useQuery();
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set());

  const [templateForm, setTemplateForm] = useState<TemplateFormType>({
    name: "",
    meta: "",
    sections: [],
  });

  // delete state
  const [deleteSectionTarget, setDeleteSectionTarget] = useState<{
    id: number;
    title: string;
  } | null>(null);
  const [deleteTemplateTarget, setDeleteTemplateTarget] = useState<{
    id: number;
    name: string;
  } | null>(null);

  const templateDetail = api.qal.getTemplate.useQuery(
    { id: selectedTemplateId! },
    { enabled: !!selectedTemplateId }
  );

  const createTemplate = api.qal.createTemplate.useMutation({
    onSuccess: async () => {
      await templates.refetch();
      setTemplateDialogOpen(false);
      setTemplateForm({ name: "", meta: "", sections: [] });
      setExpandedSections(new Set());
      toast.success("Template created successfully");
    },
    onError: (e) => {
      toast.error(e.message ?? "Failed to create template");
    },
  });

  const deleteSection = api.qal.deleteSection.useMutation({
    onSuccess: async () => {
      await templateDetail.refetch();
      setDeleteSectionTarget(null);
      toast.success("Section deleted");
    },
    onError: (e) => {
      toast.error(e.message ?? "Failed to delete section");
    },
  });

  const deleteTemplate = api.qal.deleteTemplate.useMutation({
    onSuccess: async (_, variables) => {
      await templates.refetch();
      setDeleteTemplateTarget(null);
      // if deleted template is current, move selection
      if (selectedTemplateId === variables.id) {
        const remaining = templates.data?.filter((t) => t.id !== variables.id) ?? [];
        setSelectedTemplateId(remaining[0]?.id ?? null);
      }
      toast.success("Template deleted");
    },
    onError: (e) => {
      toast.error(e.message ?? "Failed to delete template");
    },
  });

  // auto-select first template
  React.useEffect(() => {
    if (templates.data?.[0]?.id && templates.data.length > 0 && !selectedTemplateId) {
      setSelectedTemplateId(templates.data[0].id);
    }
  }, [templates.data, selectedTemplateId]);

  const handleAddSection = () => {
    setTemplateForm((prev) => ({
      ...prev,
      sections: [
        ...prev.sections,
        {
          title: "",
          description: "",
          possiblePoints: 0,
          questions: [],
        },
      ],
    }));
  };

  const handleRemoveSectionDraft = (sectionIndex: number) => {
    setTemplateForm((prev) => ({
      ...prev,
      sections: prev.sections.filter((_, idx) => idx !== sectionIndex),
    }));
  };

  const handleUpdateSection = (
    sectionIndex: number,
    field: keyof SectionFormType,
    value: any
  ) => {
    setTemplateForm((prev) => ({
      ...prev,
      sections: prev.sections.map((section, idx) =>
        idx === sectionIndex ? { ...section, [field]: value } : section
      ),
    }));
  };

  const handleAddQuestion = (sectionIndex: number) => {
    setTemplateForm((prev) => ({
      ...prev,
      sections: prev.sections.map((section, idx) =>
        idx === sectionIndex
          ? {
              ...section,
              questions: [
                ...section.questions,
                {
                  prompt: "",
                  guidance: "",
                  fixedSample: 0,
                  possiblePoints: 0,
                },
              ],
            }
          : section
      ),
    }));
  };

  const handleRemoveQuestion = (sectionIndex: number, questionIndex: number) => {
    setTemplateForm((prev) => ({
      ...prev,
      sections: prev.sections.map((section, idx) =>
        idx === sectionIndex
          ? {
              ...section,
              questions: section.questions.filter((_, qIdx) => qIdx !== questionIndex),
            }
          : section
      ),
    }));
  };

  const handleUpdateQuestion = (
    sectionIndex: number,
    questionIndex: number,
    field: keyof QuestionFormType,
    value: any
  ) => {
    setTemplateForm((prev) => ({
      ...prev,
      sections: prev.sections.map((section, idx) =>
        idx === sectionIndex
          ? {
              ...section,
              questions: section.questions.map((q, qIdx) =>
                qIdx === questionIndex ? { ...q, [field]: value } : q
              ),
            }
          : section
      ),
    }));
  };

  const toggleSectionExpanded = (sectionIndex: number) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionIndex)) next.delete(sectionIndex);
      else next.add(sectionIndex);
      return next;
    });
  };

  const handleCreateTemplate = async () => {
    if (!templateForm.name.trim()) {
      toast.error("Template name is required");
      return;
    }

    if (templateForm.sections.length === 0) {
      toast.error("At least one section is required");
      return;
    }

    for (let i = 0; i < templateForm.sections.length; i++) {
      const section = templateForm.sections[i];
      if (!section?.title.trim()) {
        toast.error(`Section ${i + 1} title is required`);
        return;
      }
      if (section.questions.length === 0) {
        toast.error(`Section "${section.title}" must have at least one question`);
        return;
      }

      for (let j = 0; j < section.questions.length; j++) {
        const question = section.questions[j];
        if (!question?.prompt.trim()) {
          toast.error(
            `Question ${j + 1} in section "${section.title}" must have a prompt`
          );
          return;
        }
      }
    }

    const sectionsWithCalculatedPoints = templateForm.sections.map((section, idx) => ({
      ...section,
      possiblePoints: section.questions.reduce((sum, q) => sum + q.possiblePoints, 0),
      sortOrder: idx + 1,
      questions: section.questions.map((q, qIdx) => ({
        ...q,
        sortOrder: qIdx + 1,
      })),
    }));

    await createTemplate.mutateAsync({
      name: templateForm.name,
      meta: templateForm.meta || undefined,
      sections: sectionsWithCalculatedPoints,
    });
  };

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
            <p>No templates exist yet. Create your first template to get started.</p>
            <div className="mt-4">
              <Button onClick={() => setTemplateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Template
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    );
  }

  const tpl = templateDetail.data;
  
  // FIXED: Calculate total by summing all questions' points across all sections
  const totalPossible = tpl?.sections?.reduce((sectionSum, section) => {
    const sectionTotal = section.questions.reduce((qSum, question) => {
      return qSum + (parseFloat(String(question.possiblePoints)) || 0);
    }, 0);
    return sectionSum + sectionTotal;
  }, 0) ?? 0;

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
          <Link href="/qal/template/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Template
            </Button>
          </Link>
          {tpl && (
            <Button
              variant="outline"
              className="text-destructive border-destructive"
              size="sm"
              onClick={() =>
                setDeleteTemplateTarget({
                  id: tpl.template.id,
                  name: tpl.template.name,
                })
              }
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Delete Template
            </Button>
          )}
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
                    <p className="text-sm text-muted-foreground mt-1">
                      {tpl.template.meta}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">
                    {tpl.sections.length} Section{tpl.sections.length !== 1 ? "s" : ""}
                  </Badge>
                  <Badge variant="outline">
                    {tpl.sections.reduce((sum, s) => sum + s.questions.length, 0)} Question
                    {tpl.sections.reduce((sum, s) => sum + s.questions.length, 0) !== 1
                      ? "s"
                      : ""}
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
                <Badge variant="outline">Total Possible: {totalPossible.toFixed(1)}</Badge>
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
                  {tpl.sections.map((s, idx) => {
                    // Calculate section points by summing question points
                    const sectionPoints = s.questions.reduce(
                      (sum, q) => sum + (parseFloat(String(q.possiblePoints)) || 0),
                      0
                    );
                    
                    return (
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
                          {sectionPoints.toFixed(1)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              href={`/qal/template/${tpl.template.id}/sections/${s.id}`}
                              className={buttonVariants({ variant: "outline", size: "sm" })}
                            >
                              View Questions
                            </Link>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() =>
                                setDeleteSectionTarget({ id: s.id, title: s.title })
                              }
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {tpl.sections.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-center text-muted-foreground py-8"
                      >
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
                      <TableCell className="text-right">{totalPossible.toFixed(1)}</TableCell>
                      <TableCell />
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      ) : null}

      {/* Delete Section Confirm */}
      {deleteSectionTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-lg bg-white shadow-lg">
            <div className="border-b px-4 py-3">
              <h2 className="text-sm font-semibold">Delete Section?</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {deleteSectionTarget.title}
              </p>
            </div>
            <div className="px-4 py-4 text-sm">
              <p>
                This action cannot be undone. The section and its questions will be
                removed. Existing surveys that reference this section will block deletion.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 border-t px-4 py-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDeleteSectionTarget(null)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={deleteSection.isPending}
                onClick={async () => {
                  try {
                    await deleteSection.mutateAsync({ id: deleteSectionTarget.id });
                  } catch (e: any) {
                    toast.error(e?.message ?? "Failed to delete section");
                  }
                }}
              >
                {deleteSection.isPending ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Template Confirm */}
      {deleteTemplateTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-lg bg-white shadow-lg">
            <div className="border-b px-4 py-3">
              <h2 className="text-sm font-semibold">Delete Template?</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {deleteTemplateTarget.name}
              </p>
            </div>
            <div className="px-4 py-4 text-sm">
              <p>
                This action cannot be undone. The template and all its sections and
                questions will be deleted. If any surveys are using this template, the
                operation will be blocked.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 border-t px-4 py-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDeleteTemplateTarget(null)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={deleteTemplate.isPending}
                onClick={async () => {
                  try {
                    await deleteTemplate.mutateAsync({ id: deleteTemplateTarget.id });
                  } catch (e: any) {
                    toast.error(e?.message ?? "Failed to delete template");
                  }
                }}
              >
                {deleteTemplate.isPending ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
