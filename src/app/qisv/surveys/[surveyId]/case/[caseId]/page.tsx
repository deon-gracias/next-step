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

// ✅ Use the SAME schema as resident page - allow undefined/optional values
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
type Status = z.infer<typeof metStatusEnum>;

export default function CaseSurveyPage() {
  const utils = api.useUtils();
  const params = useParams();

  const surveyId = Number(params.surveyId);
  const caseId = Number(params.caseId);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { responses: [] },
  });

  const responsesFieldArray = useFieldArray({
    control: form.control,
    name: "responses",
  });

  // Queries
  const survey = api.survey.byId.useQuery({ id: surveyId }); // to read isLocked
  const questions = api.question.list.useQuery(
    { templateId: survey.data?.templateId ?? -1 },
    { enabled: !!survey.data },
  );
  
  // ✅ Updated query to use surveyCaseId parameter
  const responsesQuery = api.survey.listResponses.useQuery(
    { 
      surveyId, 
      surveyCaseId: caseId // ✅ Pass surveyCaseId directly to the query
    },
    {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchInterval: false,
    },
  );

  // Mutations
  const upsertResponses = api.survey.createResponse.useMutation({
    onError: (e) => toast.error(e.message),
  });

  // ✅ Initialize/reset form from DB - SAME logic as resident page
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
  const router = useRouter();

  // ✅ Updated submit function to use surveyCaseId properly
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

      // ✅ Use surveyCaseId parameter directly - no more dummy residentId!
      await upsertResponses.mutateAsync({
        surveyId,
        surveyCaseId: caseId, // ✅ Pass surveyCaseId directly
        responses: payload,
        // ✅ Don't pass residentId at all for case responses
      });

      // ✅ Invalidate and refresh
      await utils.survey.listResponses.invalidate({ surveyId });

      // ✅ Fetch fresh data using the same query pattern
      const latestResponses = await utils.survey.listResponses.fetch({ 
        surveyId, 
        surveyCaseId: caseId 
      });

      const prefilled = questions.data.map((q) => {
        const existing = latestResponses.find((r) => r.questionId === q.id);
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

      toast.success("Saved response");
      router.replace(`/qisv/surveys/${surveyId}`)
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
          { label: `Case ${caseId}` },
        ]}
      />

      <main className="p-4 space-y-4">
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
                  <p className="font-semibold">
                    {q?.text ?? `Question ID: ${qid}`}
                  </p>
                  <div className="text-xs text-muted-foreground">Points: {qPoints}</div>
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

                {/* ✅ Show findings input when unmet */}
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

          {/* ✅ Save button with lock state - same as resident page */}
          <div className="relative group inline-block">
            <Button type="submit" disabled={isLocked || upsertResponses.isPending}>
              {upsertResponses.isPending ? "Saving..." : isLocked ? "Locked" : "Save"}
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
