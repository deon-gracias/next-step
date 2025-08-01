import {
  survey,
  surveyResident,
  surveySelectSchema,
  template,
  question,
  surveyResponse,
  surveyResponseInsertSchema,
  surveyResponseSelectSchema,
} from "@/server/db/schema";
import {
  surveyCreateInputSchema,
  paginationInputSchema,
} from "@/server/utils/schema";
import { z } from "zod/v4";
import { eq, and, sql, getTableColumns } from "drizzle-orm";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const surveyRouter = createTRPCRouter({
  create: protectedProcedure
    .input(surveyCreateInputSchema)
    .mutation(async ({ input, ctx }) => {
      const { residentIds: residents, ...surveyData } = input;

      // Create survey
      const [newSurvey] = await ctx.db
        .insert(survey)
        .values(surveyData)
        .returning();

      if (!newSurvey) throw Error("Failed to create survey");

      // Insert into survey_resident table
      await ctx.db.insert(surveyResident).values(
        residents.map((residentId) => ({
          surveyId: newSurvey.id,
          residentId,
        })),
      );

      return newSurvey;
    }),

  delete: protectedProcedure
    .input(z.object({ id: surveySelectSchema.shape.id }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(survey).where(eq(survey.id, input.id));
    }),

  byId: protectedProcedure
    .input(z.object({ id: surveySelectSchema.shape.id }))
    .query(async ({ ctx, input }) => {
      return (
        await ctx.db
          .select()
          .from(survey)
          .where(eq(survey.id, input.id))
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
      if (input.surveyorId !== undefined)
        conditions.push(eq(survey.surveyorId, input.surveyorId));
      if (input.facilityId !== undefined)
        conditions.push(eq(survey.facilityId, input.facilityId));
      if (input.templateId !== undefined)
        conditions.push(eq(survey.templateId, input.templateId));

      const whereClause =
        conditions.length > 0 ? and(...conditions) : undefined;

      return await ctx.db
        .select()
        .from(survey)
        .where(whereClause)
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
      if (surveyorId !== undefined)
        whereConditions.push(eq(survey.surveyorId, surveyorId));
      if (templateId !== undefined)
        whereConditions.push(eq(survey.templateId, templateId));
      if (facilityId !== undefined)
        whereConditions.push(eq(survey.facilityId, facilityId));

      const pendingPairs = ctx.db
        .select({
          surveyId: survey.id,
          residentId: surveyResident.residentId,
        })
        .from(survey)
        .innerJoin(surveyResident, eq(surveyResident.surveyId, survey.id))
        .innerJoin(template, eq(survey.templateId, template.id))
        .leftJoin(question, eq(question.templateId, template.id))
        .leftJoin(
          surveyResponse,
          and(
            eq(surveyResponse.surveyId, survey.id),
            eq(surveyResponse.residentId, surveyResident.residentId),
            eq(surveyResponse.questionId, question.id),
          ),
        )
        .groupBy(survey.id, surveyResident.residentId)
        .having(
          sql`count(distinct ${surveyResponse.id}) < count(distinct ${question.id})`,
        )
        .where(whereConditions.length ? and(...whereConditions) : undefined)
        .as("pending");

      const rows = await ctx.db
        .selectDistinctOn([survey.id], getTableColumns(survey))
        .from(survey)
        .innerJoin(pendingPairs, eq(pendingPairs.surveyId, survey.id))
        .limit(pageSize)
        .offset(offset);

      return rows;
    }),

  createResponse: protectedProcedure
    .input(
      z.object({
        surveyId: z.number(),
        responses: z.array(surveyResponseInsertSchema),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const data = input.responses.map((r) => ({
        ...r,
        surveyId: input.surveyId,
      }));

      await ctx.db
        .insert(surveyResponse)
        .values(data)
        .onConflictDoUpdate({
          target: surveyResponse.id,
          set: {
            requirementsMetOrUnmet: sql.raw(
              `excluded.${surveyResponse.requirementsMetOrUnmet.name}`,
            ),
            findings: sql.raw(`excluded.${surveyResponse.findings.name}`),
          },
        });
      return { success: true };
    }),

  listResponses: protectedProcedure
    .input(surveyResponseSelectSchema.partial())
    .query(async ({ ctx, input }) => {
      return await ctx.db
        .select()
        .from(surveyResponse)
        .where(eq(surveyResponse.surveyId, input.surveyId));
    }),
});
