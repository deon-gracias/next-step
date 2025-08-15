import { z } from "zod";
import {
  survey,
  surveyInsertSchema,
  surveySelectSchema,
  surveyResponse,
  surveyResponseInsertSchema,
  surveyResident,
  type SurveySelectType,
  template,
  question,
  surveyResponseSelectSchema,
  user,
  facility,
  surveyCases,
} from "@/server/db/schema";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { eq, and, sql, getTableColumns, SQL, asc, desc } from "drizzle-orm";
import {
  paginationInputSchema,
  surveyCreateInputSchema,
} from "@/server/utils/schema";

export const surveyRouter = createTRPCRouter({
  create: protectedProcedure
    .input(surveyCreateInputSchema)
    .mutation(async ({ input, ctx }) => {
      const { residentIds: residents, caseCodes: cases, ...surveyData } = input;

      // Create survey
      const [newSurvey] = await ctx.db
        .insert(survey)
        .values(surveyData)
        .returning();

      if (!newSurvey) throw Error("Failed to create survey");

      // Insert into survey_resident table
      if (residents.length > 0)
        await ctx.db.insert(surveyResident).values(
          residents.map((residentId) => ({
            surveyId: newSurvey.id,
            residentId,
          })),
        );

      // Insert into survey_case
      if (cases.length > 0)
        await ctx.db.insert(surveyCases).values(
          cases.map((caseCode) => ({
            surveyId: newSurvey.id,
            caseCode,
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
      if (input.surveyorId !== undefined)
        conditions.push(eq(survey.surveyorId, input.surveyorId));
      if (input.facilityId !== undefined)
        conditions.push(eq(survey.facilityId, input.facilityId));
      if (input.templateId !== undefined)
        conditions.push(eq(survey.templateId, input.templateId));

      const whereClause =
        conditions.length > 0 ? and(...conditions) : undefined;

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
      if (surveyorId !== undefined)
        whereConditions.push(eq(survey.surveyorId, surveyorId));
      if (templateId !== undefined)
        whereConditions.push(eq(survey.templateId, templateId));
      if (facilityId !== undefined)
        whereConditions.push(eq(survey.facilityId, facilityId));

      const rows = await ctx.db
        .select({
          ...getTableColumns(survey),
          surveyor: getTableColumns(user),
          facility: getTableColumns(facility),
          template: getTableColumns(template),
        })
        .from(survey)
        .leftJoin(user, eq(survey.surveyorId, user.id))
        .leftJoin(facility, eq(survey.facilityId, facility.id))
        .leftJoin(template, eq(survey.templateId, template.id))
        .orderBy(desc(survey.surveyDate), asc(survey.id))
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
          target: [
            surveyResponse.surveyId,
            surveyResponse.residentId,
            surveyResponse.surveyCaseId,
            surveyResponse.questionId,
          ],
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
    .input(
      surveyResponseSelectSchema
        .pick({
          surveyId: true,
          residentId: true,
          surveyCaseId: true,
          questionId: true,
        })
        .partial(),
    )
    .query(async ({ ctx, input }) => {
      const whereConditions = [];

      if (input.surveyId !== undefined)
        whereConditions.push(eq(surveyResponse.surveyId, input.surveyId));
      if (input.residentId)
        whereConditions.push(eq(surveyResponse.residentId, input.residentId));
      if (input.surveyCaseId)
        whereConditions.push(
          eq(surveyResponse.surveyCaseId, input.surveyCaseId),
        );
      if (input.questionId !== undefined)
        whereConditions.push(eq(surveyResponse.questionId, input.questionId));

      return await ctx.db
        .select()
        .from(surveyResponse)
        .where(whereConditions.length ? and(...whereConditions) : undefined);
    }),
});
