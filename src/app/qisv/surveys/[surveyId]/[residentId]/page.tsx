"use client";

import { useParams } from "next/navigation";
import { api } from "@/trpc/react";
import { QISVHeader } from "../../../_components/header";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { FormField } from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { metStatusEnum } from "@/server/db/schema";
import { surveyResponseInsertSchema } from "@/server/db/schema";
import React, { useEffect } from "react";

const formSchema = z.object({
  responses: z.array(
    surveyResponseInsertSchema.pick({
      questionId: true,
      requirementsMetOrUnmet: true,
      findings: true,
    }),
  ),
});
type FormValues = z.infer<typeof formSchema>;

export default function ResidentSurveyPage() {
  const utils = api.useUtils();
  const params = useParams();

  const surveyId = Number(params.surveyId);
  const residentId = Number(params.residentId);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { responses: [] },
  });

  const responsesFieldArray = useFieldArray({
    control: form.control,
    name: "responses",
  });

  const survey = api.survey.byId.useQuery({ id: surveyId });

  const questions = api.question.list.useQuery(
    { templateId: survey.data?.templateId ?? -1 },
    { enabled: !!survey.data },
  );

  const existingResponse = api.survey.listResponses.useQuery(
    {
      surveyId: surveyId,
      residentId: residentId,
    },
    {
      select: (responses) =>
        responses.filter(
          (e) => e.surveyId === surveyId && e.residentId === residentId,
        ),
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchInterval: false,
    },
  );

  const upsert = api.survey.createResponse.useMutation({
    onSuccess: () => {
      utils.survey.byId.invalidate({ id: surveyId });
      utils.survey.listResponses.invalidate({ surveyId, residentId });
    },
    onError: (e) => toast.error(e.message),
  });

  const onSubmit = (vals: FormValues) => {
    upsert.mutateAsync({
      surveyId,
      responses: vals.responses.map((r) => ({ ...r, residentId, surveyId })),
    });
  };

  useEffect(() => {
    if (questions.data) {
      const prefilled = questions.data.map((q) => {
        const existing = existingResponse.data?.find(
          (r) => r.questionId === q.id,
        );
        return {
          questionId: q.id,
          requirementsMetOrUnmet:
            existing?.requirementsMetOrUnmet ?? "not_applicable",
          findings: existing?.findings ?? "",
        };
      });

      form.reset({ responses: prefilled });
    }
  }, [questions.data, existingResponse.data]);

  return (
    <>
      <QISVHeader
        crumbs={[
          { label: "Surveys", href: "/qisv/surveys" },
          { label: `Survey #${surveyId}`, href: `/qisv/surveys/${surveyId}` },
          { label: `Resident ${residentId}` },
        ]}
      />

      <main className="p-4">
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {JSON.stringify(form.formState.errors)}
          {responsesFieldArray.fields.map((field, idx) => (
            <div key={field.id} className="rounded border p-3">
              <p className="mb-2 font-semibold">
                {questions.data?.find((q) => q.id === field.questionId)?.text ??
                  `Question ID: ${field.questionId}`}
              </p>

              <FormField
                control={form.control}
                name={`responses.${idx}.requirementsMetOrUnmet`}
                render={({ field }) => (
                  <Select
                    value={(field.value && field.value.toString()) ?? undefined}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {metStatusEnum.enumValues.map((e) => (
                        <SelectItem key={e} value={e}>
                          {e
                            .split("_")
                            .map((s) => s[0]?.toUpperCase() + s.slice(1))
                            .join(" ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />

              {form.watch(`responses.${idx}.requirementsMetOrUnmet`) ===
                "unmet" && (
                <FormField
                  control={form.control}
                  name={`responses.${idx}.findings`}
                  render={({ field }) => (
                    <Input
                      placeholder="Findings / notes"
                      {...field}
                      value={field.value ?? ""}
                    />
                  )}
                />
              )}
            </div>
          ))}

          <Button type="submit">Save</Button>
        </form>
      </main>
    </>
  );
}
