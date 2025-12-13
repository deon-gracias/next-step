"use client";

import { api } from "@/trpc/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Plus, Trash2, FileText, Save } from "lucide-react";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";

type QuestionFormType = {
  prompt: string;
  guidance: string;
  possiblePoints: string; // Plain text input
};

type SectionFormType = {
  title: string;
  description: string;
  questions: QuestionFormType[];
};

type TemplateFormType = {
  name: string;
  meta: string;
  sections: SectionFormType[];
};

export default function NewQALTemplatePage() {
  const router = useRouter();

  const [templateForm, setTemplateForm] = useState<TemplateFormType>({
    name: "",
    meta: "",
    sections: [],
  });

  const createTemplate = api.qal.createTemplate.useMutation({
    onSuccess: () => {
      toast.success("Template created successfully");
      router.push("/qal/template");
    },
    onError: (e) => {
      toast.error(e.message ?? "Failed to create template");
    },
  });

  // Add Section
  const handleAddSection = () => {
    setTemplateForm((prev) => ({
      ...prev,
      sections: [
        ...prev.sections,
        {
          title: "",
          description: "",
          questions: [],
        },
      ],
    }));
  };

  // Remove Section
  const handleRemoveSection = (sectionIndex: number) => {
    setTemplateForm((prev) => ({
      ...prev,
      sections: prev.sections.filter((_, idx) => idx !== sectionIndex),
    }));
  };

  // Update Section
  const handleUpdateSection = (
    sectionIndex: number,
    field: keyof Omit<SectionFormType, "questions">,
    value: string
  ) => {
    setTemplateForm((prev) => ({
      ...prev,
      sections: prev.sections.map((section, idx) =>
        idx === sectionIndex ? { ...section, [field]: value } : section
      ),
    }));
  };

  // Add Question to Section
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
                  possiblePoints: "",
                },
              ],
            }
          : section
      ),
    }));
  };

  // Remove Question
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

  // Update Question
  const handleUpdateQuestion = (
    sectionIndex: number,
    questionIndex: number,
    field: keyof QuestionFormType,
    value: string
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

  // Create Template - FIXED with fixedSample: 0
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

    // Convert points strings to numbers and add required fixedSample for backend
    const sectionsWithCalculatedPoints = templateForm.sections.map((section, idx) => ({
      title: section.title,
      description: section.description || undefined,
      possiblePoints: section.questions.reduce(
        (sum, q) => sum + (parseFloat(q.possiblePoints) || 0),
        0
      ),
      sortOrder: idx + 1,
      questions: section.questions.map((q, qIdx) => ({
        prompt: q.prompt,
        guidance: q.guidance || undefined,
        fixedSample: 0, // Default value required by backend
        possiblePoints: parseFloat(q.possiblePoints) || 0,
        sortOrder: qIdx + 1,
      })),
    }));

    await createTemplate.mutateAsync({
      name: templateForm.name,
      meta: templateForm.meta || undefined,
      sections: sectionsWithCalculatedPoints,
    });
  };

  const totalQuestions = templateForm.sections.reduce(
    (sum, s) => sum + s.questions.length,
    0
  );

  const totalPoints = templateForm.sections.reduce(
    (sum, s) =>
      sum +
      s.questions.reduce((qSum, q) => qSum + (parseFloat(q.possiblePoints) || 0), 0),
    0
  );

  return (
    <main className="min-h-screen bg-gray-50/50">
      <div className="border-b bg-white">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/qal/template">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-bold">Create New Template</h1>
                <p className="text-sm text-muted-foreground">
                  Build your QAL audit template
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right text-sm">
                <div className="text-muted-foreground">
                  {templateForm.sections.length} Sections • {totalQuestions} Questions
                </div>
                <div className="font-semibold">{totalPoints.toFixed(1)} Total Points</div>
              </div>
              <Button
                onClick={handleCreateTemplate}
                disabled={
                  createTemplate.isPending ||
                  !templateForm.name.trim() ||
                  templateForm.sections.length === 0
                }
                size="lg"
              >
                <Save className="h-4 w-4 mr-2" />
                {createTemplate.isPending ? "Creating..." : "Create Template"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Template Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Template Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">
                  Template Name <span className="text-red-500">*</span>
                </Label>
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
                <Input
                  id="meta"
                  value={templateForm.meta}
                  onChange={(e) =>
                    setTemplateForm((prev) => ({ ...prev, meta: e.target.value }))
                  }
                  placeholder="Brief description"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sections */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Sections & Questions</h2>
              <p className="text-sm text-muted-foreground">
                Add sections with their questions
              </p>
            </div>
            <Button onClick={handleAddSection}>
              <Plus className="h-4 w-4 mr-2" />
              Add Section
            </Button>
          </div>

          {templateForm.sections.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="font-medium mb-2">No sections yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Start by adding your first section
                </p>
                <Button onClick={handleAddSection}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Section
                </Button>
              </CardContent>
            </Card>
          )}

          {templateForm.sections.map((section, sectionIdx) => {
            const sectionPoints = section.questions.reduce(
              (sum, q) => sum + (parseFloat(q.possiblePoints) || 0),
              0
            );

            return (
              <Card key={sectionIdx} className="border-l-4 border-l-blue-500">
                <CardHeader className="bg-blue-50/50">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="default" className="font-mono">
                          Section {sectionIdx + 1}
                        </Badge>
                        <Badge variant="secondary">
                          {section.questions.length} Question
                          {section.questions.length !== 1 ? "s" : ""}
                        </Badge>
                        <Badge variant="outline">{sectionPoints.toFixed(1)} pts</Badge>
                      </div>

                      <div className="grid md:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs">
                            Section Title <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            value={section.title}
                            onChange={(e) =>
                              handleUpdateSection(sectionIdx, "title", e.target.value)
                            }
                            placeholder="e.g., Pre-Analytical Phase"
                            className="bg-white"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-xs">Description (Optional)</Label>
                          <Input
                            value={section.description}
                            onChange={(e) =>
                              handleUpdateSection(
                                sectionIdx,
                                "description",
                                e.target.value
                              )
                            }
                            placeholder="Brief description"
                            className="bg-white"
                          />
                        </div>
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveSection(sectionIdx)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>

                <CardContent className="pt-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-semibold">Questions</Label>
                      <Button
                        onClick={() => handleAddQuestion(sectionIdx)}
                        size="sm"
                        variant="outline"
                      >
                        <Plus className="h-3 w-3 mr-2" />
                        Add Question
                      </Button>
                    </div>

                    {section.questions.length === 0 ? (
                      <div className="text-center py-8 border-2 border-dashed rounded-lg bg-gray-50">
                        <p className="text-sm text-muted-foreground mb-3">
                          No questions in this section
                        </p>
                        <Button
                          onClick={() => handleAddQuestion(sectionIdx)}
                          size="sm"
                          variant="outline"
                        >
                          <Plus className="h-3 w-3 mr-2" />
                          Add Question
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {section.questions.map((question, qIdx) => (
                          <Card key={qIdx} className="bg-white">
                            <CardContent className="p-4">
                              <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <Badge variant="secondary" className="text-xs font-mono">
                                    Question {qIdx + 1}
                                  </Badge>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() =>
                                      handleRemoveQuestion(sectionIdx, qIdx)
                                    }
                                  >
                                    <Trash2 className="h-3 w-3 text-destructive" />
                                  </Button>
                                </div>

                                <div className="space-y-1.5">
                                  <Label className="text-xs">
                                    Question Prompt <span className="text-red-500">*</span>
                                  </Label>
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
                                    placeholder="Enter the audit question"
                                    rows={2}
                                    className="text-sm"
                                  />
                                </div>

                                <div className="space-y-1.5">
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
                                    placeholder="Additional instructions or guidance"
                                    rows={1}
                                    className="text-sm"
                                  />
                                </div>

                                <div className="space-y-1.5">
                                  <Label className="text-xs">Possible Points</Label>
                                  <Input
                                    type="text"
                                    value={question.possiblePoints}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      // Allow only numbers and decimal point
                                      if (val === "" || /^\d*\.?\d*$/.test(val)) {
                                        handleUpdateQuestion(
                                          sectionIdx,
                                          qIdx,
                                          "possiblePoints",
                                          val
                                        );
                                      }
                                    }}
                                    placeholder="e.g., 10 or 5.5"
                                    className="text-sm"
                                  />
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Summary Card */}
        {templateForm.sections.length > 0 && (
          <Card className="border-2 border-primary/20 bg-primary/5">
            <CardContent className="py-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lg">Template Summary</h3>
                  <div className="flex items-center gap-4 mt-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Sections:</span>{" "}
                      <span className="font-semibold">{templateForm.sections.length}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Questions:</span>{" "}
                      <span className="font-semibold">{totalQuestions}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Total Points:</span>{" "}
                      <span className="font-semibold">{totalPoints.toFixed(1)}</span>
                    </div>
                  </div>
                </div>
                <Button
                  onClick={handleCreateTemplate}
                  disabled={
                    createTemplate.isPending ||
                    !templateForm.name.trim() ||
                    templateForm.sections.length === 0
                  }
                  size="lg"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {createTemplate.isPending ? "Creating..." : "Create Template"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
