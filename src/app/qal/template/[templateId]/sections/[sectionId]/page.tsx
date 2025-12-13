"use client";

import { api } from "@/trpc/react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useState, useMemo } from "react";
import { ArrowLeft, Pencil, Trash2, Check, X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
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

export default function TemplateSectionPage() {
  const params = useParams();
  const templateId = Number(params.templateId);
  const sectionId = Number(params.sectionId);

  const [editingQuestionId, setEditingQuestionId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; label: string } | null>(
    null
  );
  const [editForm, setEditForm] = useState({
    prompt: "",
    guidance: "",
    possiblePoints: "",
  });

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    prompt: "",
    guidance: "",
    fixedSample: 0,
    possiblePoints: "",
  });

  const templateQ = api.qal.getTemplate.useQuery({ id: templateId });

  const createQuestion = api.qal.createQuestion.useMutation({
    onSuccess: async () => {
      await templateQ.refetch();
      setIsAddOpen(false);
      setAddForm({
        prompt: "",
        guidance: "",
        fixedSample: 0,
        possiblePoints: "",
      });
      toast.success("Question added");
    },
    onError: (e) => {
      toast.error(e.message ?? "Failed to add question");
    },
  });

  const updateQuestion = api.qal.updateQuestion.useMutation({
    onSuccess: async () => {
      await templateQ.refetch();
      setEditingQuestionId(null);
      toast.success("Question updated successfully");
    },
    onError: (e) => {
      toast.error(e.message ?? "Failed to update question");
    },
  });

  const deleteQuestion = api.qal.deleteQuestion.useMutation({
    onSuccess: async () => {
      await templateQ.refetch();
      setDeleteTarget(null);
      toast.success("Question deleted successfully");
    },
    onError: (e) => {
      toast.error(e.message ?? "Failed to delete question");
    },
  });

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

  const section = templateQ.data.sections.find((s) => s.id === sectionId);

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
  const totalPossiblePoints = section.questions.reduce(
    (sum, q) => sum + Number(q.possiblePoints || 0),
    0
  );

  const nextSortOrder = useMemo(
    () =>
      section.questions.length > 0
        ? Math.max(...section.questions.map((q) => q.sortOrder ?? 0)) + 1
        : 0,
    [section.questions]
  );

  const handleEditClick = (question: any) => {
    setEditingQuestionId(question.id);
    setEditForm({
      prompt: question.prompt,
      guidance: question.guidance || "",
      possiblePoints: String(Number(question.possiblePoints || 0)),
    });
  };

  const handleCancelEdit = () => {
    setEditingQuestionId(null);
    setEditForm({ prompt: "", guidance: "", possiblePoints: "" });
  };

  const handleSaveEdit = async () => {
    if (!editForm.prompt.trim()) {
      toast.error("Question prompt is required");
      return;
    }

    const points = parseFloat(editForm.possiblePoints) || 0;

    await updateQuestion.mutateAsync({
      id: editingQuestionId!,
      prompt: editForm.prompt,
      guidance: editForm.guidance || undefined,
      possiblePoints: points,
    });
  };

  const handleAddQuestion = async () => {
    if (!addForm.prompt.trim()) {
      toast.error("Question prompt is required");
      return;
    }

    const points = parseFloat(addForm.possiblePoints) || 0;

    await createQuestion.mutateAsync({
      sectionId,
      prompt: addForm.prompt,
      guidance: addForm.guidance || undefined,
      fixedSample: addForm.fixedSample,
      possiblePoints: points,
      sortOrder: nextSortOrder,
    });
  };

  return (
    <main className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/qal/template">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Template
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

      {/* Section Stats + Add Button */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Badge variant="secondary">
            {section.questions.length} Question{section.questions.length !== 1 ? "s" : ""}
          </Badge>
          <Badge variant="outline">
            {totalSamples} Total Sample{totalSamples !== 1 ? "s" : ""}
          </Badge>
          <Badge variant="outline">{section.possiblePoints} Section Points</Badge>
        </div>
        <Button size="sm" onClick={() => setIsAddOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Add Question
        </Button>
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
                <TableHead className="w-[120px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {section.questions.map((q, idx) => (
                <TableRow key={q.id}>
                  <TableCell className="font-mono text-xs text-muted-foreground align-top">
                    {idx + 1}
                  </TableCell>
                  <TableCell className="max-w-[500px]">
                    <div className="space-y-2">
                      <div className="font-medium leading-tight break-words">{q.prompt}</div>
                      {q.guidance && (
                        <div className="text-xs text-muted-foreground italic leading-tight break-words">
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
                  <TableCell className="text-right align-top">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditClick(q)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() =>
                          setDeleteTarget({
                            id: q.id,
                            label: q.prompt.slice(0, 80),
                          })
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {section.questions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No questions defined for this section yet.
                  </TableCell>
                </TableRow>
              )}
              {section.questions.length > 0 && (
                <TableRow className="font-semibold bg-muted/50">
                  <TableCell />
                  <TableCell>Total</TableCell>
                  <TableCell className="text-center">{totalSamples}</TableCell>
                  <TableCell className="text-right">
                    {totalPossiblePoints.toFixed(1)}
                  </TableCell>
                  <TableCell />
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Question Dialog */}
      <Dialog
        open={editingQuestionId !== null}
        onOpenChange={(open) => !open && handleCancelEdit()}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Question</DialogTitle>
            <DialogDescription>
              Update the question prompt, guidance, and possible points
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-prompt">
                Question Prompt <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="edit-prompt"
                value={editForm.prompt}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, prompt: e.target.value }))
                }
                placeholder="Enter the question"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-guidance">Guidance (Optional)</Label>
              <Textarea
                id="edit-guidance"
                value={editForm.guidance}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, guidance: e.target.value }))
                }
                placeholder="Additional guidance or instructions"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-points">Possible Points</Label>
              <Input
                id="edit-points"
                type="text"
                value={editForm.possiblePoints}
                onChange={(e) => {
                  const val = e.target.value;
                  // Allow only numbers and decimal point
                  if (val === "" || /^\d*\.?\d*$/.test(val)) {
                    setEditForm((prev) => ({ ...prev, possiblePoints: val }));
                  }
                }}
                placeholder="e.g., 10 or 5.5"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={handleCancelEdit}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={updateQuestion.isPending || !editForm.prompt.trim()}
            >
              <Check className="h-4 w-4 mr-2" />
              {updateQuestion.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Question Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Question</DialogTitle>
            <DialogDescription>
              Create a new question in this section
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="add-prompt">
                Question Prompt <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="add-prompt"
                value={addForm.prompt}
                onChange={(e) =>
                  setAddForm((prev) => ({ ...prev, prompt: e.target.value }))
                }
                placeholder="Enter the question"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="add-guidance">Guidance (Optional)</Label>
              <Textarea
                id="add-guidance"
                value={addForm.guidance}
                onChange={(e) =>
                  setAddForm((prev) => ({ ...prev, guidance: e.target.value }))
                }
                placeholder="Additional guidance or instructions"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="add-points">Possible Points</Label>
              <Input
                id="add-points"
                type="text"
                value={addForm.possiblePoints}
                onChange={(e) => {
                  const val = e.target.value;
                  // Allow only numbers and decimal point
                  if (val === "" || /^\d*\.?\d*$/.test(val)) {
                    setAddForm((prev) => ({ ...prev, possiblePoints: val }));
                  }
                }}
                placeholder="e.g., 10 or 5.5"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setIsAddOpen(false);
              }}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              onClick={handleAddQuestion}
              disabled={createQuestion.isPending || !addForm.prompt.trim()}
            >
              <Check className="h-4 w-4 mr-2" />
              {createQuestion.isPending ? "Adding..." : "Add Question"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Overlay */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-lg bg-white shadow-lg">
            <div className="border-b px-4 py-3">
              <h2 className="text-sm font-semibold">Delete Question?</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {deleteTarget.label}
              </p>
            </div>
            <div className="px-4 py-4 text-sm">
              <p>
                This action cannot be undone. This will permanently delete the question.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 border-t px-4 py-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDeleteTarget(null)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={deleteQuestion.isPending}
                onClick={async () => {
                  try {
                    await deleteQuestion.mutateAsync({ id: deleteTarget.id });
                  } catch (e: any) {
                    toast.error(e?.message ?? "Failed to delete question");
                  }
                }}
              >
                {deleteQuestion.isPending ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
