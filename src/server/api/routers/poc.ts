// server/api/routers/poc.ts - CORRECTED CONSTRAINT VERSION
import { z } from "zod";
import { and, eq, isNull, sql } from "drizzle-orm";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { surveyPOC } from "@/server/db/schema";

const listInput = z.object({
  surveyId: z.number().int().positive(),
  residentId: z.number().int().positive().optional(),
  surveyCaseId: z.number().int().positive().optional(),
});

const upsertInput = z.object({
  surveyId: z.number().int().positive(),
  residentId: z.number().int().positive().optional(),
  surveyCaseId: z.number().int().positive().optional(),
  templateId: z.number().int().positive(),
  questionId: z.number().int().positive(),
  pocText: z.string().min(1),
});

const deleteInput = z.object({
  surveyId: z.number().int().positive(),
  residentId: z.number().int().positive().optional(),
  surveyCaseId: z.number().int().positive().optional(),
  templateId: z.number().int().positive(),
  questionId: z.number().int().positive(),
});

export const pocRouter = createTRPCRouter({
  list: protectedProcedure.input(listInput).query(async ({ input, ctx }) => {
    const whereConditions: any[] = [eq(surveyPOC.surveyId, input.surveyId)];
    
    if (input.residentId !== undefined) {
      whereConditions.push(eq(surveyPOC.residentId, input.residentId));
    } else if (input.surveyCaseId !== undefined) {
      whereConditions.push(eq(surveyPOC.surveyCaseId, input.surveyCaseId));
    } else {
      whereConditions.push(isNull(surveyPOC.residentId));
      whereConditions.push(isNull(surveyPOC.surveyCaseId));
    }

    return await ctx.db
      .select()
      .from(surveyPOC)
      .where(and(...whereConditions));
  }),

  // ✅ CORRECTED: Use column arrays for onConflictDoUpdate target
  upsert: protectedProcedure.input(upsertInput).mutation(async ({ input, ctx }) => {
    const { surveyId, templateId, questionId, pocText, residentId, surveyCaseId } = input;
    
    const pocData = {
      surveyId,
      templateId,
      questionId,
      pocText,
      residentId: residentId || null,
      surveyCaseId: surveyCaseId || null,
    };

    if (residentId) {
      // ✅ CORRECTED: Use column array for resident constraint
      return await ctx.db
        .insert(surveyPOC)
        .values([pocData])
        .onConflictDoUpdate({
          target: [surveyPOC.surveyId, surveyPOC.residentId, surveyPOC.templateId, surveyPOC.questionId],
          set: { pocText: sql`excluded.poc_text` },
        });
    } else if (surveyCaseId) {
      // ✅ CORRECTED: Use column array for case constraint
      return await ctx.db
        .insert(surveyPOC)
        .values([pocData])
        .onConflictDoUpdate({
          target: [surveyPOC.surveyId, surveyPOC.surveyCaseId, surveyPOC.templateId, surveyPOC.questionId],
          set: { pocText: sql`excluded.poc_text` },
        });
    } else {
      // ✅ CORRECTED: Use column array for general constraint
      return await ctx.db
        .insert(surveyPOC)
        .values([pocData])
        .onConflictDoUpdate({
          target: [surveyPOC.surveyId, surveyPOC.questionId],
          set: { pocText: sql`excluded.poc_text` },
        });
    }
  }),

  delete: protectedProcedure.input(deleteInput).mutation(async ({ input, ctx }) => {
    const whereConditions: any[] = [
      eq(surveyPOC.surveyId, input.surveyId),
      eq(surveyPOC.templateId, input.templateId),
      eq(surveyPOC.questionId, input.questionId),
    ];

    if (input.residentId !== undefined) {
      whereConditions.push(eq(surveyPOC.residentId, input.residentId));
    } else if (input.surveyCaseId !== undefined) {
      whereConditions.push(eq(surveyPOC.surveyCaseId, input.surveyCaseId));
    } else {
      whereConditions.push(isNull(surveyPOC.residentId));
      whereConditions.push(isNull(surveyPOC.surveyCaseId));
    }

    await ctx.db
      .delete(surveyPOC)
      .where(and(...whereConditions));

    return { success: true };
  }),
});
