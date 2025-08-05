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
import React from "react";
import { FtagMultiSelectComboBox } from "./ftag-dropdown";

export function AddQuestionForm({
  templateId,
  currentTotalPoints,
}: {
  templateId: number;
  currentTotalPoints?: number;
}) {
  const apiUtils = api.useUtils();
  const mutation = api.question.create.useMutation();
  const form = useForm<QuestionCreateInputType>({
    resolver: zodResolver(questionCreateInputSchema),
    defaultValues: {
      templateId: templateId,
      points: 0,
      text: "",
      ftagIds: [],
    },
  });

  const onSubmit = async (data: QuestionCreateInputType) => {
    toast.promise(
      mutation
        .mutateAsync({
          ...data,
          templateId,
        })
        .then(() => {
          apiUtils.question.invalidate();
          form.reset();
        }),
      {
        loading: "Adding question...",
        success: "Question added",
        error: "Failed to add question",
      },
    );
  };

  return (
    <Form {...form}>
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
