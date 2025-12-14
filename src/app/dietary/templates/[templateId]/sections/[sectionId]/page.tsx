"use client";

import { useParams, useRouter } from "next/navigation";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ChefHat, PlusIcon, TrashIcon, Pencil } from "lucide-react";
import Link from "next/link";
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
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useState } from "react";

// Edit Question Dialog Component
function EditQuestionDialog({
  question,
  open,
  onOpenChange,
  sectionId,
}: {
  question: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sectionId: number;
}) {
  const utils = api.useUtils();
  const updateQuestion = api.dietary.updateQuestion.useMutation({
    onSuccess: () => {
      toast.success("Question updated successfully");
      utils.dietary.getSection.invalidate({ id: sectionId });
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(`Failed to update question: ${error.message}`);
    },
  });

  const [formData, setFormData] = useState({
    questionLetter: question.questionLetter,
    questionText: question.questionText,
    points: question.points,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateQuestion.mutate({
      id: question.id,
      ...formData,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Question</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Question Letter</Label>
            <Input
              value={formData.questionLetter}
              onChange={(e) =>
                setFormData({ ...formData, questionLetter: e.target.value })
              }
              required
              maxLength={5}
            />
          </div>
          <div>
            <Label>Question Text</Label>
            <Textarea
              value={formData.questionText}
              onChange={(e) =>
                setFormData({ ...formData, questionText: e.target.value })
              }
              required
              rows={4}
            />
          </div>
          <div>
            <Label>Points</Label>
            <Input
              type="number"
              value={formData.points}
              onChange={(e) =>
                setFormData({ ...formData, points: Number(e.target.value) })
              }
              required
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={updateQuestion.isPending}>
              {updateQuestion.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function DietarySectionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const templateId = Number(params.templateId);
  const sectionId = Number(params.sectionId);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState<number | null>(null);

  const section = api.dietary.getSection.useQuery({ id: sectionId });

  const utils = api.useUtils();

  const deleteQuestion = api.dietary.deleteQuestion.useMutation({
    onSuccess: () => {
      toast.success("Question deleted successfully");
      utils.dietary.getSection.invalidate({ id: sectionId });
    },
    onError: (error) => {
      toast.error(`Failed to delete question: ${error.message}`);
    },
  });

  if (section.isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!section.data) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Section not found</p>
      </div>
    );
  }

  const questions = section.data.questions ?? [];

  return (
    <>
      {/* Header */}
      <div className="border-b bg-white">
        <div className="px-4 py-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <Link href="/dietary/templates" className="hover:text-foreground">
              Templates
            </Link>
            <span>/</span>
            <Link
              href={`/dietary/templates/${templateId}`}
              className="hover:text-foreground"
            >
              Template #{templateId}
            </Link>
            <span>/</span>
            <span className="text-foreground">{section.data.title}</span>
          </div>
        </div>
      </div>

      <main className="px-4 py-6 space-y-6">
        {/* Section Info */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="font-mono text-lg px-3 py-1">
                  {section.data.sectionNumber}
                </Badge>
                <div>
                  <CardTitle className="text-2xl">{section.data.title}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {questions.length} questions • {section.data.maxPoints} max
                    points
                  </p>
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Questions */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">
            Questions ({questions.length})
          </h2>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusIcon className="h-4 w-4 mr-2" />
                Add Question
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add New Question</DialogTitle>
              </DialogHeader>
              <div className="text-muted-foreground">Form coming next...</div>
            </DialogContent>
          </Dialog>
        </div>

        {questions.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No questions yet. Add your first question to get started.
            </CardContent>
          </Card>
        ) : (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow className="bg-secondary">
                  <TableHead className="w-[80px]">Letter</TableHead>
                  <TableHead>Question</TableHead>
                  <TableHead className="text-center w-[100px]">Points</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {questions.map((question) => (
                  <>
                    <TableRow key={question.id}>
                      <TableCell>
                        <Badge variant="outline" className="font-mono">
                          {question.questionLetter}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        {question.questionText}
                      </TableCell>
                      <TableCell className="text-center font-mono">
                        {question.points}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setEditingQuestionId(question.id)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                              >
                                <TrashIcon className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Question?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently delete this question. This
                                  action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() =>
                                    deleteQuestion.mutate({ id: question.id })
                                  }
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                    <EditQuestionDialog
                      question={question}
                      open={editingQuestionId === question.id}
                      onOpenChange={(open) => !open && setEditingQuestionId(null)}
                      sectionId={sectionId}
                    />
                  </>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </main>
    </>
  );
}
