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
import { CasesComboBox } from "./case-dropdown";
import {
  type TemplateSelectType,
} from "@/server/db/schema";

// Simple schema that matches exactly what the form expects
const formSchema = z.object({
  templateId: z.number(),
  text: z.string().min(1, "Question text is required").min(10, "Question must be at least 10 characters").max(500, "Question must be less than 500 characters"),
  points: z.number().min(1, "Points must be at least 1").max(100, "Points cannot exceed 100"),
  ftagIds: z.array(z.number()).min(1, "At least one FTag is required"),
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
        points: 1,
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
      points: 1,
      text: "",
      ftagIds: [],
    },
    mode: "onChange",
  });

  const onSubmit = async (data: FormData) => {
    try {
      await mutation.mutateAsync(data);
    } catch (error) {
      console.error("Question creation failed:", error);
    }
  };

  const currentPoints = form.watch("points");
  const projectedTotal = currentTotalPoints + currentPoints;

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
                    placeholder="Enter points (0-100)"
                    {...field}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === "") {
                        field.onChange(0);
                        return;
                      }
                      // Remove leading zeros and convert to number
                      const cleanValue = value.replace(/^0+(?=\d)/, '') || '0';
                      const numValue = parseInt(cleanValue, 10);
                      field.onChange(numValue);
                    }}
                    value={field.value === 0 ? "" : field.value.toString()}
                    min="0"
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

          <div className="flex flex-col justify-end space-y-2">
            <div className="text-sm text-muted-foreground">
              <div>Current Total: <span className="font-mono">{currentTotalPoints}</span></div>
              <div>Projected Total: <span className="font-mono font-medium">{projectedTotal}</span></div>
            </div>
          </div>
        </div>

        <FormField
          control={form.control}
          name="ftagIds"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                FTags <span className="text-destructive">*</span>
              </FormLabel>
              <FormControl>
                <FtagMultiSelectComboBox
                  selectedItems={field.value}
                  onChange={(items) => field.onChange(items)}
                />
              </FormControl>
              <FormMessage />
              <FormDescription>
                Select at least one FTag for this question
              </FormDescription>
            </FormItem>
          )}
        />

        <Button
          type="submit"
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
