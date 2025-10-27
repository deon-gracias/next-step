"use client";

import { useParams, useRouter } from "next/navigation";
import { api } from "@/trpc/react";
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
import { metStatusEnum, surveyResponseInsertSchema } from "@/server/db/schema";
import React, { useEffect } from "react";
import { QISVHeader } from "@/app/qisv/_components/header";

// Allow undefined for status and findings until explicitly set
const formSchema = z.object({
  responses: z.array(
    z.object({
      questionId: surveyResponseInsertSchema.shape.questionId,
      requirementsMetOrUnmet: z
        .enum(metStatusEnum.enumValues as [string, ...string[]])
        .optional(),
      findings: z.string().optional().nullable(),
    }),
  ),
});

type FormValues = z.infer<typeof formSchema>;

export default function GeneralSurveyPage() {
  const utils = api.useUtils();
  const params = useParams();
  const router = useRouter();

  const surveyId = Number(params.surveyId);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { responses: [] },
  });

  const responsesFieldArray = useFieldArray({
    control: form.control,
    name: "responses",
  });

  // Queries
  const survey = api.survey.byId.useQuery({ id: surveyId });
  const questions = api.question.list.useQuery(
    { templateId: survey.data?.templateId ?? -1 },
    { enabled: !!survey.data },
  );

  // ✅ FIXED: Query general responses only
  const responsesQuery = api.survey.listResponses.useQuery(
    { surveyId },
    {
      select: (rows) =>
        // Filter for general responses (both residentId and surveyCaseId are null)
        rows.filter((r) => r.surveyId === surveyId && !r.residentId && !r.surveyCaseId),
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchInterval: false,
    },
  );

  // Collect question IDs once questions are loaded
  const questionIds = React.useMemo(
    () => (questions.data ?? []).map((q) => q.id),
    [questions.data]
  );

  // Batch-fetch F-Tags for all questions (requires question.getFtagsByQuestionIds)
  const ftagsBatch = api.question.getFtagsByQuestionIds.useQuery(
    { questionIds },
    { enabled: questionIds.length > 0 }
  );

  // Build a lookup map: questionId -> [{ id, code, description }]
  const ftagsMap = React.useMemo(() => {
    const m = new Map<number, { id: number; code: string; description: string }[]>();
    for (const row of (ftagsBatch.data ?? [])) {
      m.set(row.questionId, row.ftags);
    }
    return m;
  }, [ftagsBatch.data]);


  // Mutations
  const upsertResponses = api.survey.createResponse.useMutation({
    onError: (e) => toast.error(e.message),
  });

  // Initialize/reset form from DB
  useEffect(() => {
    if (questions.data) {
      const prefilled = questions.data.map((q) => {
        const existing = responsesQuery.data?.find((r) => r.questionId === q.id);
        const status = typeof existing?.requirementsMetOrUnmet === "string"
          ? existing.requirementsMetOrUnmet
          : undefined;
        return {
          questionId: q.id,
          requirementsMetOrUnmet: status,
          findings: existing?.findings ?? "",
        };
      });
      form.reset({ responses: prefilled });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questions.data, responsesQuery.data]);

  // Submit
  const onSubmit = async (vals: FormValues) => {
    if (!questions.data || !survey.data) return;

    try {
      // Only send explicitly answered questions
      const filtered = vals.responses.filter(
        (r) =>
          r.requirementsMetOrUnmet &&
          ["met", "unmet", "not_applicable"].includes(r.requirementsMetOrUnmet),
      );

      if (filtered.length === 0) {
        toast.message("No changes to save");
        return;
      }

      const payload = filtered.map((r) => ({
        questionId: r.questionId,
        requirementsMetOrUnmet: r.requirementsMetOrUnmet as "met" | "unmet" | "not_applicable",
        findings: r.findings,
      }));

      await upsertResponses.mutateAsync({
        surveyId,
        responses: payload,
      });

      // ✅ FIXED: Invalidate and fetch general responses
      await utils.survey.listResponses.invalidate({ surveyId });

      const latestResponses = await utils.survey.listResponses.fetch({ surveyId });
      const generalResponses = latestResponses.filter(r => !r.residentId && !r.surveyCaseId);

      const prefilled = questions.data.map((q) => {
        const existing = generalResponses.find((r) => r.questionId === q.id);
        const status =
          typeof existing?.requirementsMetOrUnmet === "string"
            ? existing.requirementsMetOrUnmet
            : undefined;
        return {
          questionId: q.id,
          requirementsMetOrUnmet: status,
          findings: existing?.findings ?? "",
        };
      });
      form.reset({ responses: prefilled });

      toast.success(responsesQuery.data?.length ? "Updated survey successfully" : "Saved survey successfully");
      router.replace(`/qisv/surveys/${surveyId}`);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to save response");
    }
  };

  const isLocked = survey.data?.isLocked ?? false;

  return (
    <>
      <QISVHeader
        crumbs={[
          { label: "Surveys", href: "/qisv/surveys" },
          { label: `Survey #${surveyId}`, href: `/qisv/surveys/${surveyId}` },
          { label: "General Survey" },
        ]}
      />

      <main className="p-4 space-y-4">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">
            {survey.data?.template?.name || `Template #${survey.data?.templateId}`}
          </h1>
          <p className="text-muted-foreground">
            General survey • {questions.data?.length || 0} questions
            {responsesQuery.data?.length ? " • Previously answered" : ""}
          </p>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {responsesFieldArray.fields.map((field, idx) => {
            const qid = field.questionId;
            const status = form.watch(`responses.${idx}.requirementsMetOrUnmet`);
            const isUnmet = status === "unmet";

            const q = questions.data?.find((qq) => qq.id === qid);
            const qPoints = (q as any)?.points ?? 0;

            return (
              <div key={field.id} className="rounded border p-3 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className="">
                      {q?.text ?? `Question ID: ${qid}`}
                    </p>

                    {/* F-Tags chips */}
                    <div className="mt-1 flex flex-wrap items-center gap-1">
                      F-Tags:
                      {(ftagsMap.get(qid) ?? []).map((t) => (
                        <span
                          key={t.id}
                          className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-700"
                          title={t.description ?? t.code}
                        >
                          {t.code}
                        </span>
                      ))}
                      {(ftagsMap.get(qid) ?? []).length === 0 && (
                        <span className="text-[11px] text-muted-foreground">No F-Tags</span>
                      )}
                    </div>
                  </div>

                  <div className="text-xs text-muted-foreground whitespace-nowrap">
                    Points: {qPoints}
                  </div>
                </div>


                <FormField
                  control={form.control}
                  name={`responses.${idx}.requirementsMetOrUnmet`}
                  render={({ field }) => (
                    <Select
                      value={(field.value as string | undefined) ?? undefined}
                      onValueChange={(v) => field.onChange(v)}
                      disabled={isLocked}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
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

                {isUnmet && (
                  <FormField
                    control={form.control}
                    name={`responses.${idx}.findings`}
                    render={({ field }) => (
                      <Input
                        placeholder="Findings / notes"
                        {...field}
                        value={field.value ?? ""}
                        disabled={isLocked}
                      />
                    )}
                  />
                )}
              </div>
            );
          })}

          <div className="relative group inline-block">
            <Button type="submit" disabled={isLocked || upsertResponses.isPending}>
              {upsertResponses.isPending
                ? (responsesQuery.data?.length ? "Updating..." : "Saving...")
                : isLocked
                  ? "Locked"
                  : (responsesQuery.data?.length ? "Update Survey" : "Save Survey")
              }
            </Button>
            {isLocked && (
              <div className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 hidden group-hover:block rounded bg-popover px-2 py-1 text-[11px] text-popover-foreground shadow">
                Survey is locked
              </div>
            )}
          </div>
        </form>
      </main>
    </>
  );
}
