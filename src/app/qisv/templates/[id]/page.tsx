"use client";

import { useParams } from "next/navigation";
import { api } from "@/trpc/react";
import { QISVHeader } from "../../_components/header";
import { AddQuestionForm } from "../_components/new-question-form";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { authClient } from "@/components/providers/auth-client";
import { FileText, PencilIcon, TrashIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import type { QuestionSelectType } from "@/server/db/schema";
import { EditQuestionForm } from "../_components/edit-question-form";
import { toast } from "sonner";
import { useState } from "react";

function QuestionFtags({ id }: { id: number }) {
  const { data: ftags, isLoading } = api.question.getFtagsByQuestionId.useQuery(
    {
      questionId: id,
    },
  );

  if (isLoading) {
    return (
      <div className="flex gap-2">
        <Skeleton className="h-5 w-12" />
        <Skeleton className="h-5 w-16" />
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {ftags && ftags.length > 0 ? (
        ftags.map((e) => (
          <Badge variant="outline" key={e.id}>
            {e.code}
          </Badge>
        ))
      ) : (
        <span className="text-muted-foreground text-sm">No tags</span>
      )}
    </div>
  );
}

export default function AddQuestionsPage() {
  const params = useParams();
  const templateId = Number(params.id);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [currentEditQuestion, setCurrentEditQuestion] = useState<QuestionSelectType | null>(null);

  const template = api.template.byId.useQuery({
    id: templateId,
  });

  const questions = api.question.list.useQuery(
    {
      templateId: templateId,
    },
    { enabled: !!template.data },
  );

  const utils = api.useUtils();

  const deleteQuestion = api.question.delete.useMutation({
    onSuccess: () => {
      toast.success("Question deleted successfully");
      void utils.question.list.invalidate();
    },
    onError: (error) => {
      toast.error(`Failed to delete question: ${error.message}`);
    },
  });

  const hasNewQuestionPermission = useQuery({
    queryKey: ["question-create-permission"],
    queryFn: async () =>
      (
        await authClient.organization.hasPermission({
          permissions: { organization: ["update"] },
        })
      ).data?.success ?? false,
  });

  const totalPoints =
    questions.data?.reduce((sum, q) => sum + q.points, 0) || 0;

  const handleEditClick = (question: QuestionSelectType) => {
    setCurrentEditQuestion(question);
    setEditDialogOpen(true);
  };

  const handleEditSuccess = () => {
    setEditDialogOpen(false);
    setCurrentEditQuestion(null);
    void utils.question.list.invalidate();
  };

  const handleNewQuestionSuccess = () => {
    void utils.question.list.invalidate();
  };

  return (
    <>
      <QISVHeader
        crumbs={[
          { label: "Templates", href: "/qisv/templates" },
          { label: template.data?.name || "Template" },
        ]}
      />
      <main className="space-y-6 px-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <FileText className="text-muted-foreground h-5 w-5" />

            {template.data ? (
              <h1 className="text-2xl font-bold">{template.data.name}</h1>
            ) : (
              <Skeleton className="h-8 w-[300px]" />
            )}
          </div>
          <p className="text-muted-foreground">
            These questions will be attached to the template and used in
            surveys.
          </p>
        </div>

        {hasNewQuestionPermission.data && template.data && (
          <Card>
            <CardHeader>
              <CardTitle>New Question</CardTitle>
              <CardDescription>
                Create a new question for this template
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AddQuestionForm
                template={template.data}
                currentTotalPoints={totalPoints}
                onSuccess={handleNewQuestionSuccess}
              />
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Questions</CardTitle>
            <CardDescription>
              {questions.data?.length || 0} question(s) in this template
            </CardDescription>
          </CardHeader>
          <CardContent>
            {questions.isPending && <Skeleton className="h-[200px] w-full" />}
            {!questions.isPending && questions.data?.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                No questions found. Add your first question to get started.
              </p>
            )}
            {!questions.isPending &&
              questions.data &&
              questions.data.length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Question</TableHead>
                      <TableHead className="text-right">Points</TableHead>
                      <TableHead>FTags</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {questions.data.map((question) => (
                      <TableRow key={question.id}>
                        <TableCell className="max-w-md font-medium">
                          <div className="truncate" title={question.text}>
                            {question.text}
                          </div>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {question.points}
                        </TableCell>
                        <TableCell>
                          <QuestionFtags id={question.id} />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center gap-2 justify-end">
                            <Button 
                              size="icon" 
                              variant="outline"
                              onClick={() => handleEditClick(question)}
                            >
                              <PencilIcon className="h-4 w-4" />
                            </Button>

                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="outline"
                                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                  disabled={deleteQuestion.isPending}
                                >
                                  <TrashIcon className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="max-w-md">
                                <AlertDialogHeader>
                                  <AlertDialogTitle>
                                    <div className="flex items-center gap-2">
                                      <TrashIcon className="h-5 w-5 text-destructive" />
                                      Delete Question
                                    </div>
                                  </AlertDialogTitle>
                                  <AlertDialogDescription className="text-sm text-muted-foreground">
                                    Are you sure you want to delete this question:{" "}
                                    <span className="font-semibold text-foreground">
                                      "{question.text.substring(0, 50)}{question.text.length > 50 ? '...' : ''}"
                                    </span>
                                    ? This action cannot be undone and will permanently remove this
                                    question from the template.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter className="gap-2">
                                  <AlertDialogCancel
                                    disabled={deleteQuestion.isPending}
                                    className="mt-0"
                                  >
                                    Cancel
                                  </AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deleteQuestion.mutate({ id: question.id })}
                                    disabled={deleteQuestion.isPending}
                                    className="bg-red-600 text-white shadow-lg hover:bg-red-700 hover:shadow-xl focus:ring-2 focus:ring-red-500 focus:ring-offset-2 active:bg-red-800 transition-all duration-200 font-medium px-4 py-2 rounded-md border-0 min-w-[100px] flex items-center justify-center gap-2"
                                  >
                                    {deleteQuestion.isPending ? (
                                      <>
                                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                        <span>Deleting...</span>
                                      </>
                                    ) : (
                                      <>
                                        <TrashIcon className="h-4 w-4" />
                                        <span>Delete</span>
                                      </>
                                    )}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter>
                    <TableRow>
                      <TableCell>Total</TableCell>
                      <TableCell className="text-right">
                        {totalPoints}
                      </TableCell>
                      <TableCell></TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              )}
          </CardContent>
        </Card>
      </main>

      {/* Edit Question Dialog */}
      {editDialogOpen && currentEditQuestion && (
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Question</DialogTitle>
            </DialogHeader>
            <EditQuestionForm 
              question={currentEditQuestion} 
              currentTotalPoints={totalPoints}
            />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
