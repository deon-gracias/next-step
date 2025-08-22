"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DietaryHeader } from "../_components/header";
import { api } from "@/trpc/react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useMutation, useQuery } from "@tanstack/react-query";
import { authClient } from "@/components/providers/auth-client";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import {
  dietaryQuestionInsertSchema,
  type DietaryQuestionInsertType,
} from "@/server/db/schema";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function Questions() {
  const questions = api.dietarySurvey.listQuestions.useQuery({});

  const hasNewQuestionPermission = useQuery({
    queryKey: ["question-create-permission"],
    queryFn: async () =>
      (
        await authClient.organization.hasPermission({
          permissions: { organization: ["update"] },
        })
      ).data?.success ?? false,
  });

  return (
    <>
      <DietaryHeader
        crumbs={[{ label: "Questions", href: "/dietary/questions" }]}
      />

      <main className="flex flex-1 flex-col gap-8 px-6">
        <div className="flex justify-between">
          <div>
            <h1 className="mb-2 text-2xl font-bold">Questions</h1>
            <p className="text-muted-foreground">
              {questions.data?.length || 0} question(s)
            </p>
          </div>

          <CreateQuestionDialog>
            <Button>
              <PlusIcon /> Add
            </Button>
          </CreateQuestionDialog>
        </div>

        {questions.isPending && <Skeleton className="h-[200px] w-full" />}
        {!questions.isPending &&
          questions.data &&
          questions.data.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Question</TableHead>
                  <TableHead className="-w-fit">Category</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {questions.data.map((question) => (
                  <TableRow key={question.id}>
                    <TableCell>
                      <div className="truncate" title={question.question}>
                        {question.question}
                      </div>
                    </TableCell>
                    <TableCell className="w-fit">
                      {question.category ?? "-"}
                    </TableCell>
                    {/* <TableCell> */}
                    {/* <EditQuestionDialog question={question}> */}
                    {/*   <Button size="icon" variant={"outline"}> */}
                    {/*     <PencilIcon /> */}
                    {/*   </Button> */}
                    {/* </EditQuestionDialog> */}
                    {/* </TableCell> */}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
      </main>
    </>
  );
}

function CreateQuestionDialog({ children }: { children: React.ReactNode }) {
  const apiUtils = api.useUtils();
  const createQuestionMutation = api.dietarySurvey.createQuestion.useMutation();

  const form = useForm({
    resolver: zodResolver(dietaryQuestionInsertSchema),
    defaultValues: { question: "" },
  });

  function onSubmit(values: DietaryQuestionInsertType) {
    toast.promise(createQuestionMutation.mutateAsync(values), {
      loading: "Creating question",
      success: (e) => {
        form.reset({});
        apiUtils.dietarySurvey.invalidate();
        return <>Created question</>;
      },
      error: (e) => {
        return <>Failed to create question: {e}</>;
      },
    });
  }

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Question</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-2">
            <FormField
              name="question"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Question</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button>Submit</Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
