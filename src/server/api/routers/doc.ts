import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { surveyDOC, surveyDOCSelectSchema } from "@/server/db/schema";
import { eq, and } from "drizzle-orm";

export const docRouter = createTRPCRouter({
  upsert: protectedProcedure
    .input(
      z.object({
        surveyId: z.number().int().positive(),
        residentId: z.number().int().positive(),
        templateId: z.number().int().positive(),
        questionId: z.number().int().positive(),
        complianceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { surveyId, residentId, templateId, questionId, complianceDate } = input;

      const [result] = await ctx.db
        .insert(surveyDOC)
        .values({
          surveyId,
          residentId,
          templateId,
          questionId,
          complianceDate, // This is now a string in YYYY-MM-DD format
          createdByUserId: ctx.session.user.id,
          updatedByUserId: ctx.session.user.id,
        })
        .onConflictDoUpdate({
          target: [
            surveyDOC.surveyId,
            surveyDOC.residentId,
            surveyDOC.templateId,
            surveyDOC.questionId,
          ],
          set: {
            complianceDate,
            updatedByUserId: ctx.session.user.id,
            updatedAt: new Date(),
          },
        })
        .returning();

      return result;
    }),

  list: protectedProcedure
    .input(
      z.object({
        surveyId: z.number().int().positive(),
        residentId: z.number().int().positive().optional(),
        templateId: z.number().int().positive().optional(),
        questionId: z.number().int().positive().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const conditions = [eq(surveyDOC.surveyId, input.surveyId)];

      if (input.residentId !== undefined) {
        conditions.push(eq(surveyDOC.residentId, input.residentId));
      }
      if (input.templateId !== undefined) {
        conditions.push(eq(surveyDOC.templateId, input.templateId));
      }
      if (input.questionId !== undefined) {
        conditions.push(eq(surveyDOC.questionId, input.questionId));
      }

      return await ctx.db
        .select()
        .from(surveyDOC)
        .where(and(...conditions));
    }),

  delete: protectedProcedure
    .input(z.object({ id: surveyDOCSelectSchema.shape.id }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(surveyDOC).where(eq(surveyDOC.id, input.id));
      return { success: true };
    }),
});
