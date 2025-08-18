// server/api/routers/poc.ts
import { z } from "zod";
import { and, eq, isNull } from "drizzle-orm";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { surveyPOC, surveyResponse } from "@/server/db/schema";

const listInput = z.object({
  surveyId: z.number().int().positive(),
  residentId: z.number().int().positive(),
});

const upsertInput = z.object({
  surveyId: z.number().int().positive(),
  residentId: z.number().int().positive(),
  templateId: z.number().int().positive(),
  questionId: z.number().int().positive(),
  pocText: z.string().min(1),
});

const deleteInput = z.object({
  surveyId: z.number().int().positive(),
  residentId: z.number().int().positive(),
  templateId: z.number().int().positive(),
  questionId: z.number().int().positive(),
});

export const pocRouter = createTRPCRouter({
  // Fetch all POCs for this survey + resident
  list: protectedProcedure.input(listInput).query(async ({ input, ctx }) => {
    return await ctx.db
      .select()
      .from(surveyPOC)
      .where(
        and(
          eq(surveyPOC.surveyId, input.surveyId),
          eq(surveyPOC.residentId, input.residentId),
        ),
      );
  }),

  // Create/update a POC by composite key; link to resident-level response if present
  upsert: protectedProcedure.input(upsertInput).mutation(async ({ input, ctx }) => {
    // Find the resident-level survey_response row (survey_case_id IS NULL)
    const [resp] = await ctx.db
      .select({ id: surveyResponse.id })
      .from(surveyResponse)
      .where(
        and(
          eq(surveyResponse.surveyId, input.surveyId),
          eq(surveyResponse.residentId, input.residentId),
          isNull(surveyResponse.surveyCaseId),
          eq(surveyResponse.questionId, input.questionId),
        ),
      )
      .limit(1);

    const now = new Date();
    const [row] = await ctx.db
      .insert(surveyPOC)
      .values({
        surveyId: input.surveyId,
        residentId: input.residentId,
        templateId: input.templateId,
        questionId: input.questionId,
        pocText: input.pocText,
        surveyResponseId: resp?.id ?? null,
        createdAt: now,
        updatedAt: now,
        createdByUserId: ctx.session.user.id,
        updatedByUserId: ctx.session.user.id,
      })
      .onConflictDoUpdate({
        target: [
          surveyPOC.surveyId,
          surveyPOC.residentId,
          surveyPOC.templateId,
          surveyPOC.questionId,
        ],
        set: {
          pocText: input.pocText,
          updatedAt: now,
          updatedByUserId: ctx.session.user.id,
        },
      })
      .returning();

    return row;
  }),

  // Delete a POC by composite key
  delete: protectedProcedure.input(deleteInput).mutation(async ({ input, ctx }) => {
    await ctx.db
      .delete(surveyPOC)
      .where(
        and(
          eq(surveyPOC.surveyId, input.surveyId),
          eq(surveyPOC.residentId, input.residentId),
          eq(surveyPOC.templateId, input.templateId),
          eq(surveyPOC.questionId, input.questionId),
        ),
      );

    return { success: true };
  }),
});
