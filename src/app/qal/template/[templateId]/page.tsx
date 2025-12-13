"use client";

import { api } from "@/trpc/react";
import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

export default function QALTemplatesPage() {
  const templates = api.qal.listTemplates.useQuery();
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set());

  const [templateForm, setTemplateForm] = useState<TemplateFormType>({
    name: "",
    meta: "",
    sections: [],
  });

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

  const handleRemoveSection = (sectionIndex: number) => {
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
      const newSet = new Set(prev);
      if (newSet.has(sectionIndex)) {
        newSet.delete(sectionIndex);
      } else {
        newSet.add(sectionIndex);
      }
      return newSet;
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

    // Validate sections
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

      // Validate questions
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

    // Calculate section possible points based on questions
    const sectionsWithCalculatedPoints = templateForm.sections.map(
      (section, idx) => ({
        ...section,
        possiblePoints: section.questions.reduce(
          (sum, q) => sum + q.possiblePoints,
          0
        ),
        sortOrder: idx + 1,
        questions: section.questions.map((q, qIdx) => ({
          ...q,
          sortOrder: qIdx + 1,
        })),
      })
    );

    await createTemplate.mutateAsync({
      name: templateForm.name,
      meta: templateForm.meta || undefined,
      sections: sectionsWithCalculatedPoints,
    });
  };

  if (templates.isLoading) {
    return (
      <main className="p-6">
        <div className="space-y-4">
          <Skeleton className="h-8 w-[200px]" />
          <Skeleton className="h-[200px] w-full" />
        </div>
      </main>
    );
  }

  return (
    <main className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">QAL Templates</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your quality assessment templates
          </p>
        </div>
        <Link href="/qal/template/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Template
          </Button>
        </Link>
      </div>

      {/* Templates Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {templates.data?.map((tpl) => (
          <Link key={tpl.id} href={`/qal/templates/${tpl.id}`}>
            <Card className="hover:border-primary transition-colors cursor-pointer h-full">
              <CardHeader className="pb-3">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base truncate">
                      {tpl.name}
                    </CardTitle>
                    {tpl.meta && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {tpl.meta}
                      </p>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="secondary" className="text-xs">
                    {tpl.sectionCount} Sections
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {tpl.questionCount} Questions
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}

        {templates.data?.length === 0 && (
          <Card className="col-span-full">
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="font-medium mb-2">No templates yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Get started by creating your first QAL template
              </p>
              <Button onClick={() => setTemplateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Template
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Create Template Dialog */}
      <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <DialogTitle>Create New QAL Template</DialogTitle>
            <DialogDescription>
              Add a template with sections and questions for quality assessment
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[calc(90vh-180px)] overflow-y-auto px-6">
            <div className="space-y-6 py-4">
              {/* Template Info */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Template Name *</Label>
                  <Input
                    id="name"
                    value={templateForm.name}
                    onChange={(e) =>
                      setTemplateForm((prev) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder="e.g., Laboratory QAL Audit 2025"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="meta">Description (Optional)</Label>
                  <Textarea
                    id="meta"
                    value={templateForm.meta}
                    onChange={(e) =>
                      setTemplateForm((prev) => ({ ...prev, meta: e.target.value }))
                    }
                    placeholder="Brief description of this template"
                    rows={2}
                  />
                </div>
              </div>

              {/* Sections */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">
                    Sections ({templateForm.sections.length})
                  </Label>
                  <Button onClick={handleAddSection} size="sm" variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Section
                  </Button>
                </div>

                {templateForm.sections.length === 0 && (
                  <Card>
                    <CardContent className="py-8 text-center text-muted-foreground">
                      <p className="text-sm">
                        No sections added yet. Click "Add Section" to get started.
                      </p>
                    </CardContent>
                  </Card>
                )}

                {templateForm.sections.map((section, sectionIdx) => (
                  <Card key={sectionIdx} className="border-l-4 border-l-primary">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">Section {sectionIdx + 1}</Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleSectionExpanded(sectionIdx)}
                          >
                            {expandedSections.has(sectionIdx) ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveSection(sectionIdx)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid gap-4">
                        <div className="space-y-2">
                          <Label>Section Title *</Label>
                          <Input
                            value={section.title}
                            onChange={(e) =>
                              handleUpdateSection(
                                sectionIdx,
                                "title",
                                e.target.value
                              )
                            }
                            placeholder="e.g., Pre-Analytical Phase"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Section Description</Label>
                          <Textarea
                            value={section.description}
                            onChange={(e) =>
                              handleUpdateSection(
                                sectionIdx,
                                "description",
                                e.target.value
                              )
                            }
                            placeholder="Brief description"
                            rows={2}
                          />
                        </div>
                      </div>

                      {/* Questions in this section */}
                      {expandedSections.has(sectionIdx) && (
                        <div className="space-y-3 pt-4 border-t">
                          <div className="flex items-center justify-between">
                            <Label className="text-sm font-semibold">
                              Questions ({section.questions.length})
                            </Label>
                            <Button
                              onClick={() => handleAddQuestion(sectionIdx)}
                              size="sm"
                              variant="outline"
                            >
                              <Plus className="h-3 w-3 mr-2" />
                              Add Question
                            </Button>
                          </div>

                          {section.questions.length === 0 && (
                            <div className="text-sm text-muted-foreground text-center py-4 border-2 border-dashed rounded">
                              No questions yet. Add at least one question.
                            </div>
                          )}

                          {section.questions.map((question, qIdx) => (
                            <Card
                              key={qIdx}
                              className="border-dashed bg-muted/30"
                            >
                              <CardContent className="pt-4 space-y-3">
                                <div className="flex items-center justify-between mb-2">
                                  <Badge variant="secondary" className="text-xs">
                                    Q{qIdx + 1}
                                  </Badge>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      handleRemoveQuestion(sectionIdx, qIdx)
                                    }
                                  >
                                    <Trash2 className="h-3 w-3 text-destructive" />
                                  </Button>
                                </div>

                                <div className="space-y-2">
                                  <Label className="text-xs">Question / Prompt *</Label>
                                  <Textarea
                                    value={question.prompt}
                                    onChange={(e) =>
                                      handleUpdateQuestion(
                                        sectionIdx,
                                        qIdx,
                                        "prompt",
                                        e.target.value
                                      )
                                    }
                                    placeholder="Enter question"
                                    rows={2}
                                    className="text-sm"
                                  />
                                </div>

                                <div className="space-y-2">
                                  <Label className="text-xs">Guidance (Optional)</Label>
                                  <Textarea
                                    value={question.guidance}
                                    onChange={(e) =>
                                      handleUpdateQuestion(
                                        sectionIdx,
                                        qIdx,
                                        "guidance",
                                        e.target.value
                                      )
                                    }
                                    placeholder="Additional guidance"
                                    rows={1}
                                    className="text-sm"
                                  />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                  <div className="space-y-2">
                                    <Label className="text-xs">Sample Size</Label>
                                    <Input
                                      type="number"
                                      min={0}
                                      value={question.fixedSample}
                                      onChange={(e) =>
                                        handleUpdateQuestion(
                                          sectionIdx,
                                          qIdx,
                                          "fixedSample",
                                          parseInt(e.target.value) || 0
                                        )
                                      }
                                      className="text-sm"
                                    />
                                  </div>

                                  <div className="space-y-2">
                                    <Label className="text-xs">Points</Label>
                                    <Input
                                      type="number"
                                      min={0}
                                      step={0.1}
                                      value={question.possiblePoints}
                                      onChange={(e) =>
                                        handleUpdateQuestion(
                                          sectionIdx,
                                          qIdx,
                                          "possiblePoints",
                                          parseFloat(e.target.value) || 0
                                        )
                                      }
                                      className="text-sm"
                                    />
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}

                          <div className="text-xs text-muted-foreground text-right pt-2">
                            Section Total:{" "}
                            {section.questions
                              .reduce((sum, q) => sum + q.possiblePoints, 0)
                              .toFixed(1)}{" "}
                            points
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="px-6 py-4 border-t">
            <Button
              variant="ghost"
              onClick={() => {
                setTemplateDialogOpen(false);
                setTemplateForm({ name: "", meta: "", sections: [] });
                setExpandedSections(new Set());
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateTemplate}
              disabled={
                createTemplate.isPending ||
                !templateForm.name.trim() ||
                templateForm.sections.length === 0
              }
            >
              {createTemplate.isPending ? "Creating..." : "Create Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
