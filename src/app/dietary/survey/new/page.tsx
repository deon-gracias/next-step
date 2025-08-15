"use client";

import {
  dietaryAnswerInsertSchema,
  dietaryAnswerStatusEnum,
  question,
  type DietaryAnswerInsertType,
} from "@/server/db/schema";
import { DietaryHeader } from "../../_components/header";
import { useFieldArray, useForm } from "react-hook-form";
import z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { api } from "@/trpc/react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectItem,
  SelectTrigger,
  SelectContent,
  SelectValue,
} from "@/components/ui/select";
import { useEffect } from "react";
import { FormInput } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const dietarySurveyResponse = z.object({
  answers: z.array(dietaryAnswerInsertSchema),
});

type DietarySurveyResponseType = z.infer<typeof dietarySurveyResponse>;

export default function NewSurvey() {
  const questionsQuery = api.dietarySurvey.listQuestions.useQuery({});

  const form = useForm<DietarySurveyResponseType>({
    resolver: zodResolver(dietarySurveyResponse),
    defaultValues: {
      answers: [],
    },
  });

  const answerFieldArray = useFieldArray({
    control: form.control,
    name: "answers",
  });

  useEffect(() => {
    if (!questionsQuery.data) return;

    questionsQuery.data.forEach((e) =>
      answerFieldArray.append({
        questionId: e.id,
        status: "n/a",
        comments_or_actions: "",
        validation_or_completion: "",
      }),
    );
  }, [questionsQuery.data]);

  function onSubmit(values: DietarySurveyResponseType) {
    console.log(values);
  }

  return (
    <>
      <DietaryHeader
        crumbs={[
          { label: "Survey", href: "/dietary/survey" },
          { label: "New" },
        ]}
      />

      <main className="flex flex-1 flex-col gap-8 px-6">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col gap-4"
          >
            {answerFieldArray.fields.map((q, idx) => (
              <Card key={q.id} className="gap-2">
                <CardHeader className="flex items-center justify-between gap-4">
                  <CardTitle>
                    {questionsQuery.data &&
                      questionsQuery.data.find((e) => e.id === q.questionId)
                        ?.question}
                  </CardTitle>

                  <FormField
                    name={`answers.${idx}.status`}
                    render={({ field }) => (
                      <Select
                        onValueChange={(e) => field.onChange(e)}
                        value={field.value}
                      >
                        <SelectTrigger className="capitalize">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {dietaryAnswerStatusEnum.enumValues.map((status) => (
                            <SelectItem
                              key={status}
                              value={status}
                              className="capitalize"
                            >
                              {status}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <FormField
                    name={`answers.${idx}.comments_or_actions`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Comments or Actions</FormLabel>
                        <FormControl>
                          <Textarea {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    name={`answers.${idx}.validation_or_completion`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Validation or Completion</FormLabel>
                        <FormControl>
                          <Textarea {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            ))}
          </form>
        </Form>
      </main>
    </>
  );
}
