// server/api/routers/survey.ts
import { z } from "zod";
import {
  survey,
  surveySelectSchema,
  surveyResponse,
  surveyResident,
  template,
  surveyResponseSelectSchema,
  user,
  facility,
  surveyCases,
  surveyPOC,
  question,
  surveyDOC,
} from "@/server/db/schema";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { eq, and, inArray, sql, getTableColumns, asc, desc } from "drizzle-orm";
import {
  paginationInputSchema,
  surveyCreateInputSchema,
} from "@/server/utils/schema";

const saveResponsesInput = z.object({
  surveyId: z.number().int().positive(),
  residentId: z.number().int().positive(),
  responses: z.array(
    z.object({
      questionId: z.number().int().positive(),
      requirementsMetOrUnmet: z.enum(["met", "unmet", "not_applicable"]),
      findings: z.string().optional().nullable(),
    }),
  ),
});

export const surveyRouter = createTRPCRouter({
  create: protectedProcedure
    .input(surveyCreateInputSchema)
    .mutation(async ({ input, ctx }) => {
      const { residentIds: residents, caseCodes: cases, ...surveyData } = input;
      const [newSurvey] = await ctx.db.insert(survey).values(surveyData).returning();
      if (!newSurvey) throw Error("Failed to create survey");

      if (residents.length > 0) {
        await ctx.db.insert(surveyResident).values(
          residents.map((residentId) => ({
            surveyId: newSurvey.id,
            residentId,
          })),
        );
      }

      if (cases.length > 0) {
        await ctx.db.insert(surveyCases).values(
          cases.map((caseCode) => ({
            surveyId: newSurvey.id,
            caseCode,
          })),
        );
      }

      return newSurvey;
    }),

  delete: protectedProcedure
  .input(z.object({ id: surveySelectSchema.shape.id }))
  .mutation(async ({ ctx, input }) => {
    // Delete all related records first to avoid foreign key constraint violations
    
    // 1. Delete survey responses
    await ctx.db
      .delete(surveyResponse)
      .where(eq(surveyResponse.surveyId, input.id));
    
    // 2. Delete survey residents
    await ctx.db
      .delete(surveyResident)
      .where(eq(surveyResident.surveyId, input.id));
    
    // 3. Delete survey cases
    await ctx.db
      .delete(surveyCases)
      .where(eq(surveyCases.surveyId, input.id));
    
    // 4. Delete survey POCs
    await ctx.db
      .delete(surveyPOC)
      .where(eq(surveyPOC.surveyId, input.id));
    
    // 5. Delete survey DOCs (ADD THIS)
    await ctx.db
      .delete(surveyDOC)
      .where(eq(surveyDOC.surveyId, input.id));
    
    // 6. Finally delete the survey itself
    await ctx.db
      .delete(survey)
      .where(eq(survey.id, input.id));
    
    return { success: true, deletedSurveyId: input.id };
  }),



  byId: protectedProcedure
    .input(z.object({ id: surveySelectSchema.shape.id }))
    .query(async ({ ctx, input }) => {
      return (
        await ctx.db
          .select({
            ...getTableColumns(survey),
            template: getTableColumns(template),
          })
          .from(survey)
          .where(eq(survey.id, input.id))
          .leftJoin(template, eq(survey.templateId, template.id))
          .limit(1)
      )[0];
    }),

  list: protectedProcedure
    .input(
      z.object({
        ...surveySelectSchema.partial().shape,
        ...paginationInputSchema.shape,
      }),
    )
    .query(async ({ ctx, input }) => {
      const offset = (input.page - 1) * input.pageSize;

      const conditions = [];
      if (input.id !== undefined) conditions.push(eq(survey.id, input.id));
      if (input.surveyorId !== undefined) conditions.push(eq(survey.surveyorId, input.surveyorId));
      if (input.facilityId !== undefined) conditions.push(eq(survey.facilityId, input.facilityId));
      if (input.templateId !== undefined) conditions.push(eq(survey.templateId, input.templateId));

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      return await ctx.db
        .select({
          ...getTableColumns(survey),
          surveyor: getTableColumns(user),
          facility: getTableColumns(facility),
          template: getTableColumns(template),
        })
        .from(survey)
        .where(whereClause)
        .leftJoin(user, eq(survey.surveyorId, user.id))
        .leftJoin(facility, eq(survey.facilityId, facility.id))
        .leftJoin(template, eq(survey.templateId, template.id))
        .limit(input.pageSize)
        .offset(offset);
    }),

  listResidents: protectedProcedure
    .input(z.object({ surveyId: z.number() }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select()
        .from(surveyResident)
        .where(eq(surveyResident.surveyId, input.surveyId));
    }),

  listCases: protectedProcedure
    .input(z.object({ surveyId: z.number() }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select()
        .from(surveyCases)
        .where(eq(surveyCases.surveyId, input.surveyId));
    }),

  pendingSurveys: protectedProcedure
    .input(
      z.object({
        ...surveySelectSchema.partial().shape,
        ...paginationInputSchema.shape,
      }),
    )
    .query(async ({ ctx, input }) => {
      const { page, pageSize, templateId, facilityId, surveyorId } = input;
      const offset = (page - 1) * pageSize;

      const whereConditions = [];
      if (surveyorId !== undefined) whereConditions.push(eq(survey.surveyorId, surveyorId));
      if (templateId !== undefined) whereConditions.push(eq(survey.templateId, templateId));
      if (facilityId !== undefined) whereConditions.push(eq(survey.facilityId, facilityId));

      const rows = await ctx.db
        .select({
          ...getTableColumns(survey),
          surveyor: getTableColumns(user),
          facility: getTableColumns(facility),
          template: getTableColumns(template),
        })
        .from(survey)
        .where(and(...whereConditions))
        .leftJoin(user, eq(survey.surveyorId, user.id))
        .leftJoin(facility, eq(survey.facilityId, facility.id))
        .leftJoin(template, eq(survey.templateId, template.id))
        .orderBy(desc(survey.surveyDate), asc(survey.id))
        .limit(pageSize)
        .offset(offset);

      return rows;
    }),

markPocGenerated: protectedProcedure
  .input(z.object({ surveyId: z.number() }))
  .mutation(async ({ ctx, input }) => {
    const [updated] = await ctx.db
      .update(survey)
      .set({ pocGenerated: true })
      .where(eq(survey.id, input.surveyId))
      .returning();
    
    if (!updated) throw new Error("Survey not found");
    return updated;
  }),

  // Add this to your surveyRouter object, before the closing });

checkCompletion: protectedProcedure
  .input(z.object({ surveyId: z.number() }))
  .query(async ({ ctx, input }) => {
    // Get the survey and its template
    const surveyData = await ctx.db
      .select({
        id: survey.id,
        templateId: survey.templateId
      })
      .from(survey)
      .where(eq(survey.id, input.surveyId))
      .limit(1);

    if (!surveyData[0]) throw new Error("Survey not found");

    // Get all residents for this survey
    const residents = await ctx.db
      .select()
      .from(surveyResident)
      .where(eq(surveyResident.surveyId, input.surveyId));

    // Get all questions for this template
    const questions = await ctx.db
      .select()
      .from(question)
      .where(eq(question.templateId, surveyData[0].templateId));

    // Get all responses for this survey that have valid statuses
    const responses = await ctx.db
      .select()
      .from(surveyResponse)
      .where(
        and(
          eq(surveyResponse.surveyId, input.surveyId),
          inArray(surveyResponse.requirementsMetOrUnmet, ["met", "unmet", "not_applicable"])
        )
      );

    const totalRequired = residents.length * questions.length;
    const totalAnswered = responses.length;
    const isComplete = totalAnswered === totalRequired && totalRequired > 0;

    console.log(`Survey ${input.surveyId} completion check:`, {
      residents: residents.length,
      questions: questions.length,
      totalRequired,
      totalAnswered,
      isComplete
    });

    return {
      totalRequired,
      totalAnswered,
      isComplete,
      residents: residents.length,
      questions: questions.length,
      completionPercentage: totalRequired > 0 ? Math.round((totalAnswered / totalRequired) * 100) : 0
    };
  }),


  // Save resident-level responses and delete POCs for unmet -> met transitions
  createResponse: protectedProcedure
    .input(saveResponsesInput)
    .mutation(async ({ ctx, input }) => {
      const { surveyId, residentId } = input;
      const qids = input.responses.map((r) => r.questionId);

      // 1) Load existing statuses for these questions (before update)
      const existing = await ctx.db
        .select({
          questionId: surveyResponse.questionId,
          status: surveyResponse.requirementsMetOrUnmet,
        })
        .from(surveyResponse)
        .where(
          and(
            eq(surveyResponse.surveyId, surveyId),
            eq(surveyResponse.residentId, residentId),
            inArray(surveyResponse.questionId, qids),
          ),
        );

      const beforeMap = new Map<number, "met" | "unmet" | "not_applicable">(
        existing.map((r) => [r.questionId, r.status as any]),
      );

      // 2) Upsert responses on 3-column composite key
      const values = input.responses.map((r) => ({
        surveyId,
        residentId,
        questionId: r.questionId,
        requirementsMetOrUnmet: r.requirementsMetOrUnmet,
        findings: r.findings ?? null,
      }));

      await ctx.db
        .insert(surveyResponse)
        .values(values)
        .onConflictDoUpdate({
          target: [
            surveyResponse.surveyId,
            surveyResponse.residentId,
            surveyResponse.questionId,
          ],
          set: {
            requirementsMetOrUnmet: sql`excluded.requirements_met_or_unmet`,
            findings: sql`excluded.findings`,
          },
        });

      // 3) Determine which questions transitioned from unmet -> met
      const transitionedToMet: number[] = [];
      for (const r of input.responses) {
        const before = beforeMap.get(r.questionId);
        if (before === "unmet" && r.requirementsMetOrUnmet === "met") {
          transitionedToMet.push(r.questionId);
        }
      }

      // 4) If any transitioned to met, delete corresponding POCs by composite key
      if (transitionedToMet.length > 0) {
        await ctx.db
          .delete(surveyPOC)
          .where(
            and(
              eq(surveyPOC.surveyId, surveyId),
              eq(surveyPOC.residentId, residentId),
              inArray(surveyPOC.questionId, transitionedToMet),
            ),
          );
      }

      return { success: true, deletedPOCsForQuestions: transitionedToMet };
    }),

  listResponses: protectedProcedure
    .input(
      surveyResponseSelectSchema
        .pick({
          surveyId: true,
          residentId: true,
          questionId: true,
        })
        .partial(),
    )
    .query(async ({ ctx, input }) => {
      const whereConditions: any[] = [];
      if (input.surveyId !== undefined)
        whereConditions.push(eq(surveyResponse.surveyId, input.surveyId));
      if (input.residentId !== undefined)
        whereConditions.push(eq(surveyResponse.residentId, input.residentId));
      if (input.questionId !== undefined)
        whereConditions.push(eq(surveyResponse.questionId, input.questionId));

      return await ctx.db
        .select()
        .from(surveyResponse)
        .where(whereConditions.length ? and(...whereConditions) : undefined);
    }),

  // ===== Lock / Unlock (no role checks; no server-side "all answered" check) =====
  lock: protectedProcedure
    .input(z.object({ surveyId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(survey)
        .set({ isLocked: true })
        .where(eq(survey.id, input.surveyId))
        .returning();
      if (!updated) throw new Error("Survey not found");
      return updated;
    }),

  unlock: protectedProcedure
    .input(z.object({ surveyId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(survey)
        .set({ isLocked: false })
        .where(eq(survey.id, input.surveyId))
        .returning();
      if (!updated) throw new Error("Survey not found");
      return updated;
    }),
});
