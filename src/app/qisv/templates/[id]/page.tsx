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
import { FileText, PencilIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { QuestionSelectType } from "@/server/db/schema";
import { EditQuestionForm } from "../_components/edit-question-form";

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

  const template = api.template.byId.useQuery({
    id: templateId,
  });

  const questions = api.question.list.useQuery(
    {
      templateId: templateId,
    },
    { enabled: !!template.data },
  );

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
            {!questions.isPending &&
              questions.data &&
              questions.data.length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Question</TableHead>
                      <TableHead className="text-right">Points</TableHead>
                      <TableHead>FTags</TableHead>
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
                        <TableCell>
                          <EditQuestionDialog question={question}>
                            <Button size="icon" variant={"outline"}>
                              <PencilIcon />
                            </Button>
                          </EditQuestionDialog>
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
    </>
  );
}

function EditQuestionDialog({
  question,
  children,
}: {
  question: QuestionSelectType;
  children: React.ReactNode;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Question</DialogTitle>
        </DialogHeader>

        <EditQuestionForm question={question} />
      </DialogContent>
    </Dialog>
  );
}
