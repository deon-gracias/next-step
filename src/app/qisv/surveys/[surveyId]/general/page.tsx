"use client";

import { useParams, useRouter } from "next/navigation";
import { api } from "@/trpc/react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
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
import TextareaAutosize from "react-textarea-autosize";
import { useQuery } from "@tanstack/react-query";
import { authClient } from "@/components/providers/auth-client";
import { canUI, type AppRole } from "@/lib/ui-permissions";
import { AlertTriangleIcon } from "lucide-react";

// ✅ Add normalizeRole helper
function normalizeRole(role: unknown): AppRole | null {
  const r = String(role ?? "")
    .toLowerCase()
    .trim();
  if (r === "owner") return "admin";
  if (r === "admin") return "admin";
  if (r === "member") return "viewer";
  if (
    r === "viewer" ||
    r === "lead_surveyor" ||
    r === "surveyor" ||
    r === "facility_coordinator" ||
    r === "facility_viewer" ||
    r === "admin"
  ) {
    return r as AppRole;
  }
  return null;
}

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

  const activeOrg = authClient.useActiveOrganization();

  // ✅ Get user role and permissions
  const { data: appRole, isLoading: roleLoading } = useQuery({
    queryKey: ["active-member-role", activeOrg.data?.id],
    queryFn: async () => {
      const res = await authClient.organization.getActiveMemberRole();
      const rawRole = (res as any)?.data?.role;
      return normalizeRole(rawRole);
    },
    enabled: !!activeOrg.data,
  });

  // ✅ Define permissions
  const canViewSurveys = canUI(appRole, "surveys.view");
  const canManageSurveys = canUI(appRole, "surveys.manage");

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { responses: [] },
  });

  const responsesFieldArray = useFieldArray({
    control: form.control,
    name: "responses",
  });

  // Queries
  const survey = api.survey.byId.useQuery(
    { id: surveyId },
    { enabled: canViewSurveys },
  );
  const questions = api.question.list.useQuery(
    { templateId: survey.data?.templateId ?? -1 },
    { enabled: !!survey.data && canViewSurveys },
  );

  // ✅ FIXED: Query general responses only
  const responsesQuery = api.survey.listResponses.useQuery(
    { surveyId },
    {
      enabled: canViewSurveys,
      select: (rows) =>
        // Filter for general responses (both residentId and surveyCaseId are null)
        rows.filter(
          (r) => r.surveyId === surveyId && !r.residentId && !r.surveyCaseId,
        ),
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchInterval: false,
    },
  );

  // ✅ Check if current user is the assigned surveyor
  const currentUser = authClient.useSession();
  const isAssignedSurveyor =
    survey.data?.surveyorId === currentUser.data?.user.id;

  // ✅ Permission check: can user edit this survey?
  const canEditSurvey = isAssignedSurveyor;
  //const canEditSurvey = canManageSurveys || (appRole === "surveyor" && isAssignedSurveyor);

  // Collect question IDs once questions are loaded
  const questionIds = React.useMemo(
    () => (questions.data ?? []).map((q) => q.id),
    [questions.data],
  );

  // Batch-fetch F-Tags for all questions
  const ftagsBatch = api.question.getFtagsByQuestionIds.useQuery(
    { questionIds },
    { enabled: questionIds.length > 0 && canViewSurveys },
  );

  // Build a lookup map: questionId -> [{ id, code, description }]
  const ftagsMap = React.useMemo(() => {
    const m = new Map<
      number,
      { id: number; code: string; description: string }[]
    >();
    for (const row of ftagsBatch.data ?? []) {
      m.set(row.questionId, row.ftags);
    }
    return m;
  }, [ftagsBatch.data]);

  // Mutations - only available if user can edit
  const upsertResponses = api.survey.createResponse.useMutation({
    onError: (e) => toast.error(e.message),
  });

  // Initialize/reset form from DB
  useEffect(() => {
    if (questions.data) {
      const prefilled = questions.data.map((q) => {
        const existing = responsesQuery.data?.find(
          (r) => r.questionId === q.id,
        );
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
    }
  }, [questions.data, responsesQuery.data, form]);

  // Submit
  const onSubmit = async (vals: FormValues) => {
    if (!questions.data || !survey.data) return;

    // ✅ Permission check before allowing submit
    if (!canEditSurvey) {
      toast.error("You don't have permission to edit this survey");
      return;
    }

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

      // ✅ NEW: Validate that all "unmet" responses have findings
      const unmetWithoutFindings = filtered.filter(
        (r) =>
          r.requirementsMetOrUnmet === "unmet" &&
          (!r.findings || r.findings.trim().length === 0),
      );

      if (unmetWithoutFindings.length > 0) {
        toast.error("All items marked as 'Unmet' must have findings");
        return;
      }

      const payload = filtered.map((r) => ({
        questionId: r.questionId,
        requirementsMetOrUnmet: r.requirementsMetOrUnmet as
          | "met"
          | "unmet"
          | "not_applicable",
        findings: r.findings,
      }));

      await upsertResponses.mutateAsync({
        surveyId,
        responses: payload,
      });

      // ✅ FIXED: Invalidate and fetch general responses
      await utils.survey.listResponses.invalidate({ surveyId });

      const latestResponses = await utils.survey.listResponses.fetch({
        surveyId,
      });
      const generalResponses = latestResponses.filter(
        (r) => !r.residentId && !r.surveyCaseId,
      );

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

      toast.success(
        responsesQuery.data?.length
          ? "Updated survey successfully"
          : "Saved survey successfully",
      );
      router.replace(`/qisv/surveys/${surveyId}`);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to save response");
    }
  };

  const isLocked = survey.data?.isLocked ?? false;

  // ✅ Loading state
  if (roleLoading) {
    return (
      <>
        <QISVHeader crumbs={[{ label: "Surveys" }]} />
        <main className="p-4">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="border-primary mx-auto h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" />
              <p className="text-muted-foreground mt-4 text-sm">
                Loading permissions...
              </p>
            </div>
          </div>
        </main>
      </>
    );
  }

  // ✅ Access denied state
  if (!canViewSurveys) {
    return (
      <>
        <QISVHeader crumbs={[{ label: "Surveys" }]} />
        <main className="p-4">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <h2 className="text-destructive text-lg font-semibold">
                Access Denied
              </h2>
              <p className="text-muted-foreground mt-2 text-sm">
                You don't have permission to view surveys.
              </p>
            </div>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <QISVHeader
        crumbs={[
          { label: "Surveys", href: "/qisv/surveys" },
          { label: `Survey #${surveyId}`, href: `/qisv/surveys/${surveyId}` },
          { label: "General Survey" },
        ]}
      />

      <main className="space-y-4 p-4">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">
            {survey.data?.template?.name ||
              `Template #${survey.data?.templateId}`}
          </h1>
          <p className="text-muted-foreground">
            General survey • {questions.data?.length || 0} questions
            {responsesQuery.data?.length ? " • Previously answered" : ""}
          </p>
        </div>

        {/* ✅ Permission warning if user can't edit */}
        {!canEditSurvey && (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-center gap-2 text-sm text-amber-800">
              <AlertTriangleIcon className="h-4 w-4" />
              {isAssignedSurveyor ? (
                <span>Only users with permission can edit this survey.</span>
              ) : (
                <span>
                  Only the assigned surveyor ({survey.data?.surveyorId}) or
                  users with permission can edit this survey.
                </span>
              )}
            </div>
          </div>
        )}

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {responsesFieldArray.fields.map((field, idx) => {
            const qid = field.questionId;
            const status = form.watch(
              `responses.${idx}.requirementsMetOrUnmet`,
            );
            const isUnmet = status === "unmet";

            const q = questions.data?.find((qq) => qq.id === qid);
            const qPoints = (q as any)?.points ?? 0;

            return (
              <div key={field.id} className="space-y-3 rounded border p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className="">{q?.text ?? `Question ID: ${qid}`}</p>

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
                        <span className="text-muted-foreground text-[11px]">
                          No F-Tags
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-muted-foreground text-xs whitespace-nowrap">
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
                      disabled={isLocked || !canEditSurvey}
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

                {/* Show findings textarea when unmet - with red asterisk and auto-resize */}
                {isUnmet && (
                  <div className="space-y-1">
                    <label className="text-sm font-medium">
                      Findings <span className="text-red-500">*</span>
                    </label>
                    <FormField
                      control={form.control}
                      name={`responses.${idx}.findings`}
                      render={({ field }) => (
                        <TextareaAutosize
                          placeholder="Enter findings / notes"
                          {...field}
                          value={field.value ?? ""}
                          disabled={isLocked || !canEditSurvey}
                          minRows={2}
                          className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex w-full resize-none rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                        />
                      )}
                    />
                  </div>
                )}
              </div>
            );
          })}

          <div className="group relative inline-block">
            <Button
              type="submit"
              disabled={isLocked || upsertResponses.isPending || !canEditSurvey}
            >
              {upsertResponses.isPending
                ? responsesQuery.data?.length
                  ? "Updating..."
                  : "Saving..."
                : isLocked
                  ? "Locked"
                  : !canEditSurvey
                    ? "Read Only"
                    : responsesQuery.data?.length
                      ? "Update Survey"
                      : "Save Survey"}
            </Button>
            {(isLocked || !canEditSurvey) && (
              <div className="bg-popover text-popover-foreground pointer-events-none absolute -top-7 left-1/2 hidden -translate-x-1/2 rounded px-2 py-1 text-[11px] shadow group-hover:block">
                {isLocked ? "Survey is locked" : "No edit permission"}
              </div>
            )}
          </div>
        </form>
      </main>
    </>
  );
}
