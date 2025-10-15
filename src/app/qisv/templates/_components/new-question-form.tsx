"use client";

import { useForm } from "react-hook-form";
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
import { cn } from "@/lib/utils";
import React from "react";
import { FtagMultiSelectComboBox } from "./ftag-dropdown";
import { type TemplateSelectType } from "@/server/db/schema";

// Updated schema:
// - points can be empty while typing (optional), but on submit must be 1..100.
// - FTags are OPTIONAL now (no min(1))
const formSchema = z.object({
  templateId: z.number(),
  text: z.string()
    .min(1, "Question text is required")
    .min(10, "Question must be at least 10 characters")
    .max(500, "Question must be less than 500 characters"),
  points: z.number().min(1, "Points must be at least 1").max(100, "Points cannot exceed 100").optional(),
  ftagIds: z.array(z.number()).optional(), // optional
});

type FormData = z.infer<typeof formSchema>;

interface AddQuestionFormProps {
  template: TemplateSelectType;
  currentTotalPoints?: number;
  onSuccess?: () => void;
}

export function AddQuestionForm({
  template,
  currentTotalPoints = 0,
  onSuccess,
}: AddQuestionFormProps) {
  const apiUtils = api.useUtils();

  const mutation = api.question.create.useMutation({
    onSuccess: () => {
      toast.success("Question added successfully");
      void apiUtils.question.invalidate();
      form.reset({
        templateId: template.id,
        points: undefined,
        text: "",
        ftagIds: [],
      });
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(`Failed to add question: ${error.message}`);
    },
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      templateId: template.id,
      points: undefined,
      text: "",
      ftagIds: [],
    },
    mode: "onChange",
  });

  const onSubmit = async (data: FormData) => {
    try {
      if (data.points === undefined || Number.isNaN(data.points)) {
        toast.error("Please enter points between 1 and 100.");
        return;
      }
      await mutation.mutateAsync({
        ...data,
        points: data.points,
        // Ensure optional ftagIds is sent as [] when undefined
        ftagIds: data.ftagIds ?? [],
      });
    } catch (error) {
      console.error("Question creation failed:", error);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
        <FormField
          control={form.control}
          name="text"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Question Text <span className="text-destructive">*</span>
              </FormLabel>
              <FormControl>
                <Input
                  placeholder="Enter your question here..."
                  {...field}
                  className={cn(
                    form.formState.errors.text && "border-destructive"
                  )}
                />
              </FormControl>
              <FormMessage />
              <FormDescription>
                Must be between 10-500 characters
              </FormDescription>
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="points"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Points <span className="text-destructive">*</span>
                </FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="Enter points (1–100)"
                    value={field.value === undefined ? "" : String(field.value)}
                    onChange={(e) => {
                      const raw = e.target.value.trim();
                      if (raw === "") {
                        field.onChange(undefined);
                        return;
                      }
                      const n = Number(raw);
                      field.onChange(Number.isNaN(n) ? undefined : n);
                    }}
                    min="1"
                    max="100"
                    className={cn(
                      form.formState.errors.points && "border-destructive"
                    )}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Current/Projected totals intentionally removed */}
        </div>

        <FormField
          control={form.control}
          name="ftagIds"
          render={({ field }) => (
            <FormItem>
              {/* Removed red star because FTags are optional */}
              <FormLabel>FTags</FormLabel>
              <FormControl>
                <FtagMultiSelectComboBox
                  selectedItems={field.value ?? []}
                  onChange={(items) => field.onChange(items)}
                />
              </FormControl>
              <FormMessage />
              {/* Removed “Select at least one FTag for this question” */}
            </FormItem>
          )}
        />

        <Button
          type="submit"
          // Do not block submit based on FTags; only disable during mutation or invalid required fields
          disabled={mutation.isPending || !form.formState.isValid}
          className="mt-4"
        >
          {mutation.isPending ? (
            <>
              <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Adding Question...
            </>
          ) : (
            "Add Question"
          )}
        </Button>
      </form>
    </Form>
  );
}
