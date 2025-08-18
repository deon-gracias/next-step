// app/qisv/surveys/[surveyId]/resident/[residentId]/page.tsx
"use client";

import { useParams } from "next/navigation";
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
type Status = z.infer<typeof metStatusEnum> | "not_applicable";

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

  const responsesQuery = api.survey.listResponses.useQuery(
    { surveyId, residentId },
    {
      select: (rows) =>
        rows.filter((r) => r.surveyId === surveyId && r.residentId === residentId),
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchInterval: false,
    },
  );

  const pocList = api.poc.list.useQuery(
    { surveyId, residentId },
    { enabled: !!(surveyId && residentId) },
  );

  const upsertResponses = api.survey.createResponse.useMutation({
    onError: (e) => toast.error(e.message),
  });

  const upsertPOC = api.poc.upsert.useMutation({
    onSuccess: () => {
      utils.poc.list.invalidate({ surveyId, residentId });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to save POC"),
  });

  // Local UI state for POC editor
  const [pocOpenByQuestionId, setPocOpenByQuestionId] = React.useState<Record<number, boolean>>({});
  const [pocTextByQuestionId, setPocTextByQuestionId] = React.useState<Record<number, string>>({});

  // Seed local POC text from server when first loaded
  useEffect(() => {
    if (!pocList.data) return;
    setPocTextByQuestionId((prev) => {
      const next = { ...prev };
      for (const p of pocList.data) {
        if (next[p.questionId] == null) next[p.questionId] = p.pocText ?? "";
      }
      return next;
    });
  }, [pocList.data]);

  // Initialize/reset form from DB
  useEffect(() => {
    if (questions.data) {
      const prefilled = questions.data.map((q) => {
        const existing = responsesQuery.data?.find((r) => r.questionId === q.id);
        return {
          questionId: q.id,
          requirementsMetOrUnmet: (existing?.requirementsMetOrUnmet as Status) ?? "not_applicable",
          findings: existing?.findings ?? "",
        };
      });
      form.reset({ responses: prefilled });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questions.data, responsesQuery.data]);

  const onSubmit = async (vals: FormValues) => {
    if (!questions.data || !survey.data) return;

    try {
      const payload = vals.responses.map((r) => ({
        questionId: r.questionId,
        requirementsMetOrUnmet: r.requirementsMetOrUnmet,
        findings: r.findings,
      }));

      // Server upserts responses AND deletes POCs for unmet -> met transitions
      await upsertResponses.mutateAsync({
        surveyId,
        residentId,
        responses: payload,
      });

      // Refetch after save
      await Promise.all([
        utils.survey.listResponses.invalidate({ surveyId, residentId }),
        utils.poc.list.invalidate({ surveyId, residentId }),
      ]);

      const [latestResponses, latestPOCs] = await Promise.all([
        utils.survey.listResponses.fetch({ surveyId, residentId }),
        utils.poc.list.fetch({ surveyId, residentId }),
      ]);

      // Reset form from DB truth
      const prefilled = questions.data.map((q) => {
        const existing = latestResponses.find((r) => r.questionId === q.id);
        return {
          questionId: q.id,
          requirementsMetOrUnmet:
            (existing?.requirementsMetOrUnmet as Status) ?? "not_applicable",
          findings: existing?.findings ?? "",
        };
      });
      form.reset({ responses: prefilled });

      // Close POC editors for any questions that are no longer unmet
      const isUnmetByQid: Record<number, boolean> = {};
      for (const q of questions.data) {
        const match = latestResponses.find((r) => r.questionId === q.id);
        isUnmetByQid[q.id] = match?.requirementsMetOrUnmet === "unmet";
      }
      setPocOpenByQuestionId((prev) => {
        const next = { ...prev };
        for (const q of questions.data) {
          if (!isUnmetByQid[q.id]) next[q.id] = false;
        }
        return next;
      });

      // Re-seed local POC text from server
      setPocTextByQuestionId((prev) => {
        const next = { ...prev };
        for (const p of latestPOCs) {
          next[p.questionId] = p.pocText ?? "";
        }
        return next;
      });

      toast.success("Saved response");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to save response");
    }
  };

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
          {responsesFieldArray.fields.map((field, idx) => {
            const qid = field.questionId;
            const isUnmet =
              form.watch(`responses.${idx}.requirementsMetOrUnmet`) === "unmet";

            const serverPOC = pocList.data?.find((p) => p.questionId === qid);
            const serverText = serverPOC?.pocText ?? "";
            const pocText = pocTextByQuestionId[qid] ?? serverText;

            const isOpen = !!pocOpenByQuestionId[qid];
            const setOpen = (v: boolean) =>
              setPocOpenByQuestionId((prev) => ({ ...prev, [qid]: v }));
            const setText = (val: string) =>
              setPocTextByQuestionId((prev) => ({ ...prev, [qid]: val }));

            return (
              <div key={field.id} className="rounded border p-3 space-y-3">
                <p className="font-semibold">
                  {questions.data?.find((q) => q.id === qid)?.text ?? `Question ID: ${qid}`}
                </p>

                <FormField
                  control={form.control}
                  name={`responses.${idx}.requirementsMetOrUnmet`}
                  render={({ field }) => (
                    <Select
                      value={(field.value && field.value.toString()) ?? undefined}
                      onValueChange={(v) => {
                        if (v !== "unmet") setOpen(false);
                        field.onChange(v);
                      }}
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

                {isUnmet && (
                  <FormField
                    control={form.control}
                    name={`responses.${idx}.findings`}
                    render={({ field }) => (
                      <Input placeholder="Findings / notes" {...field} value={field.value ?? ""} />
                    )}
                  />
                )}

                {/* POC block shown only when unmet */}
                {isUnmet && (
                  <div className="mt-1 space-y-2">
                    {!isOpen ? (
                      <div className="flex items-center gap-3">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setOpen(true)}
                        >
                          {serverText ? "Edit POC" : "Add POC"}
                        </Button>
                        <div className="text-sm text-muted-foreground truncate">
                          {serverText ? `POC: ${serverText}` : "No POC yet"}
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2">
                        <Input
                          placeholder="Enter Plan of Correction..."
                          value={pocText}
                          onChange={(e) => setText(e.target.value)}
                        />
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            size="sm"
                            disabled={upsertPOC.isPending}
                            onClick={() => {
                              if (!survey.data) return;
                              const templateId = survey.data.templateId;
                              upsertPOC.mutate({
                                surveyId,
                                residentId,
                                templateId,
                                questionId: qid,
                                pocText,
                              });
                              setOpen(false);
                            }}
                          >
                            {upsertPOC.isPending ? "Saving..." : "Save POC"}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setText(serverText);
                              setOpen(false);
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          <Button type="submit" disabled={upsertResponses.isPending}>
            {upsertResponses.isPending ? "Saving..." : "Save"}
          </Button>
        </form>
      </main>
    </>
  );
}
