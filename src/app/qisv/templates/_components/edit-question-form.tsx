"use client";

import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { api } from "@/trpc/react";

import {
  questionCreateInputSchema,
  type QuestionCreateInputType,
} from "@/server/utils/schema";
import React, { useEffect } from "react";
import { FtagMultiSelectComboBox } from "./ftag-dropdown";
import type {
  QuestionInsertType,
  QuestionSelectType,
} from "@/server/db/schema";

export function EditQuestionForm({
  question,
  currentTotalPoints,
}: {
  question: QuestionSelectType;
  currentTotalPoints?: number;
}) {
  const apiUtils = api.useUtils();
  const mutation = api.question.edit.useMutation();

  const form = useForm<QuestionCreateInputType>({
    resolver: zodResolver(questionCreateInputSchema),
    defaultValues: {
      ftagIds: [],
      ...question,
    },
  });

  const { data: ftags, isLoading } = api.question.getFtagsByQuestionId.useQuery(
    {
      questionId: question.id,
    },
  );

  useEffect(() => {
    if (!ftags) return;

    form.reset({
      ...form.getValues(),
      ftagIds: ftags.map((ftag) => ftag.id),
    });
  }, [ftags]);

  const onSubmit = async (data: QuestionCreateInputType) => {
    toast.promise(
      mutation
        .mutateAsync({
          ...question,
          ...data,
        })
        .then(() => {
          apiUtils.question.invalidate();
          form.reset();
        }),
      {
        loading: "Adding question...",
        success: "Question updated",
        error: "Failed to edit question",
      },
    );
  };

  return (
    <Form {...form}>
      {JSON.stringify(form.formState.errors)}
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
        <FormField
          name="text"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Question</FormLabel>
              <FormControl>
                <Input placeholder="Enter your question here" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          name="points"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Points</FormLabel>
              <Input
                placeholder="Enter number of points"
                type="number"
                {...field}
                onChange={(e) => field.onChange(Number(e.target.value))}
              />
              <FormMessage />
              {field.value !== 0 && currentTotalPoints && (
                <FormDescription>
                  New Total: {field.value + currentTotalPoints}
                </FormDescription>
              )}
            </FormItem>
          )}
        />

        <FormField
          name="ftagIds"
          render={({ field }) => (
            <FormItem>
              <FormLabel>FTags</FormLabel>
              <FtagMultiSelectComboBox
                selectedItems={field.value}
                onChange={(items) => field.onChange(items)}
              />
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit">Submit</Button>
      </form>
    </Form>
  );
}
