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
import React, { useEffect } from "react";
import { FtagMultiSelectComboBox } from "./ftag-dropdown";
import type { QuestionSelectType } from "@/server/db/schema";

type Props = {
  question: QuestionSelectType;
  onSuccessClose?: () => void; // close dialog callback
};

// Keep points as string in the form (so it can be empty while typing)
const editSchema = z.object({
  id: z.number().optional(),
  templateId: z.number().optional(),
  text: z
    .string()
    .min(1, "Question text is required")
    .min(10, "Question must be at least 10 characters")
    .max(500, "Question must be less than 500 characters"),
  pointsString: z.string().optional(),
  ftagIds: z.array(z.number()).optional(),
});

type EditFormData = z.infer<typeof editSchema>;

export function EditQuestionForm({ question, onSuccessClose }: Props) {
  const apiUtils = api.useUtils();
  const mutation = api.question.edit.useMutation();

  const form = useForm<EditFormData>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      id: question.id,
      templateId: question.templateId,
      text: question.text ?? "",
      pointsString:
        typeof question.points === "number" ? String(question.points) : "",
      ftagIds: [],
    },
    mode: "onChange",
  });

  // Load existing FTags using the batched endpoint with a single id
  const { data: rows } = api.question.getFtagsByQuestionIds.useQuery(
    { questionIds: [question.id] },
    { enabled: Number.isFinite(question.id) }
  );
  const ftags = rows?.[0]?.ftags ?? [];

  useEffect(() => {
    form.setValue(
      "ftagIds",
      (ftags ?? []).map((f) => f.id),
      { shouldValidate: false, shouldDirty: false }
    );
  }, [ftags, form]);

  const onSubmit = async (data: EditFormData) => {
    // Required checks
    const text = (data.text ?? "").trim();
    if (text.length === 0) {
      form.setError("text", { message: "Question text is required" }, { shouldFocus: true });
      return;
    }

    const raw = (data.pointsString ?? "").trim();
    if (raw === "") {
      form.setError("pointsString", { message: "Points are required" }, { shouldFocus: true });
      return;
    }
    if (!/^\d+$/.test(raw)) {
      form.setError("pointsString", { message: "Points must be a whole number" }, { shouldFocus: true });
      return;
    }
    const num = Number(raw);
    if (!Number.isFinite(num) || num < 1 || num > 100) {
      form.setError("pointsString", { message: "Points must be between 1 and 100" }, { shouldFocus: true });
      return;
    }

    toast.promise(
      mutation
        .mutateAsync({
          ...question,
          text,
          points: num,
          ftagIds: data.ftagIds ?? [],
        })
        .then(() => {
          void apiUtils.question.invalidate();
          onSuccessClose?.(); // CLOSE DIALOG on success
        }),
      {
        loading: "Updating question...",
        success: "Question updated",
        error: "Failed to edit question",
      }
    );
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
        {/* Question (autosizing textarea) */}
        <FormField
          name="text"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Question <span className="text-destructive">*</span>
              </FormLabel>
              <FormControl>
                <textarea
                  {...field}
                  rows={1}
                  className="w-full resize-none rounded-md border bg-white p-2 text-sm leading-6 outline-none ring-1 ring-input focus:ring-2 focus:ring-ring"
                  style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", overflow: "hidden" }}
                  placeholder="Enter your question here"
                  onInput={(e) => {
                    const el = e.currentTarget;
                    el.style.height = "auto";
                    el.style.height = `${el.scrollHeight}px`;
                  }}
                  ref={(el) => {
                    if (typeof field.ref === "function") field.ref(el);
                    else (field as any).ref = el;
                    if (el) {
                      el.style.height = "auto";
                      el.style.height = `${el.scrollHeight}px`;
                    }
                  }}
                />
              </FormControl>
              <FormMessage />
              <FormDescription>Must be between 10-500 characters</FormDescription>
            </FormItem>
          )}
        />

        {/* Points (string-controlled to allow true empty) */}
        <FormField
          name="pointsString"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Points <span className="text-destructive">*</span>
              </FormLabel>
              <FormControl>
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder="Enter points (1–100)"
                  value={field.value ?? ""} // allow empty
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === "") {
                      field.onChange("");
                      return;
                    }
                    if (/^\d+$/.test(v)) {
                      field.onChange(v);
                    }
                  }}
                  onBlur={(e) => field.onChange(e.target.value.trim())}
                  className={form.formState.errors.pointsString ? "border-destructive" : ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* FTags (optional) */}
        <FormField
          name="ftagIds"
          render={({ field }) => (
            <FormItem>
              <FormLabel>FTags</FormLabel>
              <FtagMultiSelectComboBox
                selectedItems={field.value ?? []}
                onChange={(items) => field.onChange(items)}
              />
              <FormMessage />
              <FormDescription>Optional</FormDescription>
            </FormItem>
          )}
        />

        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "Saving..." : "Submit"}
        </Button>
      </form>
    </Form>
  );
}
