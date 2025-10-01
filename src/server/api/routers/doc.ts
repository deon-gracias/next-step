import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { surveyDOC, surveyDOCSelectSchema } from "@/server/db/schema";
import { eq, and, isNull, sql } from "drizzle-orm";

export const docRouter = createTRPCRouter({
  // ✅ UPDATED: Support all survey types
  upsert: protectedProcedure
    .input(
      z.object({
        surveyId: z.number().int().positive(),
        residentId: z.number().int().positive().optional(), // ✅ Make optional
        surveyCaseId: z.number().int().positive().optional(), // ✅ ADD this
        templateId: z.number().int().positive(),
        questionId: z.number().int().positive(),
        complianceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { surveyId, residentId, surveyCaseId, templateId, questionId, complianceDate } = input;

      const docData = {
        surveyId,
        residentId: residentId || null,
        surveyCaseId: surveyCaseId || null,
        templateId,
        questionId,
        complianceDate,
        createdByUserId: ctx.session.user.id,
        updatedByUserId: ctx.session.user.id,
      };

      // ✅ Handle different survey types with proper constraints
      if (residentId) {
        return await ctx.db
          .insert(surveyDOC)
          .values(docData)
          .onConflictDoUpdate({
            target: [surveyDOC.surveyId, surveyDOC.residentId, surveyDOC.templateId, surveyDOC.questionId],
            set: {
              complianceDate,
              updatedByUserId: ctx.session.user.id,
              updatedAt: new Date(),
            },
          })
          .returning();
      } else if (surveyCaseId) {
        return await ctx.db
          .insert(surveyDOC)
          .values(docData)
          .onConflictDoUpdate({
            target: [surveyDOC.surveyId, surveyDOC.surveyCaseId, surveyDOC.templateId, surveyDOC.questionId],
            set: {
              complianceDate,
              updatedByUserId: ctx.session.user.id,
              updatedAt: new Date(),
            },
          })
          .returning();
      } else {
        return await ctx.db
          .insert(surveyDOC)
          .values(docData)
          .onConflictDoUpdate({
            target: [surveyDOC.surveyId, surveyDOC.questionId],
            set: {
              complianceDate,
              updatedByUserId: ctx.session.user.id,
              updatedAt: new Date(),
            },
          })
          .returning();
      }
    }),

  // ✅ UPDATED: Support all survey types
  list: protectedProcedure
    .input(
      z.object({
        surveyId: z.number().int().positive(),
        residentId: z.number().int().positive().optional(),
        surveyCaseId: z.number().int().positive().optional(), // ✅ ADD this
        templateId: z.number().int().positive().optional(),
        questionId: z.number().int().positive().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const conditions = [eq(surveyDOC.surveyId, input.surveyId)];

      if (input.residentId !== undefined) {
        conditions.push(eq(surveyDOC.residentId, input.residentId));
      } else if (input.surveyCaseId !== undefined) {
        conditions.push(eq(surveyDOC.surveyCaseId, input.surveyCaseId));
      } else if (input.residentId === undefined && input.surveyCaseId === undefined) {
        // General DOCs - both residentId and surveyCaseId are null
        conditions.push(isNull(surveyDOC.residentId));
        conditions.push(isNull(surveyDOC.surveyCaseId));
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
