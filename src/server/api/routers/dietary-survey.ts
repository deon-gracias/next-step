import { z } from "zod";
import {
  dietarySurveys,
  dietaryQuestions,
  dietaryQuestionInsertSchema,
  dietaryQuestionSelectSchema,
  dietarySurveyQuestions,
  dietarySurveyQuestionInsertSchema,
  dietaryAnswers,
  dietaryAnswerInsertSchema,
  dietaryAnswerSelectSchema,
  dietarySurveysSelectSchema,
  dietarySurveysInsertSchema,
} from "@/server/db/schema";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { eq, and, getTableColumns } from "drizzle-orm";
import { paginationInputSchema } from "@/server/utils/schema";

export const dietarySurveyRouter = createTRPCRouter({
  createSurvey: protectedProcedure
    .input(dietarySurveysInsertSchema)
    .mutation(async ({ ctx, input }) => {
      const [newSurvey] = await ctx.db
        .insert(dietarySurveys)
        .values(input)
        .returning();

      if (!newSurvey) throw new Error("Failed to create dietary survey");

      return newSurvey;
    }),

  deleteSurvey: protectedProcedure
    .input(z.object({ id: dietarySurveysSelectSchema.shape.id }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(dietarySurveys)
        .where(eq(dietarySurveys.id, input.id));
    }),

  surveyById: protectedProcedure
    .input(z.object({ id: dietarySurveysSelectSchema.shape.id }))
    .query(async ({ ctx, input }) => {
      return (
        await ctx.db
          .select()
          .from(dietarySurveys)
          .where(eq(dietarySurveys.id, input.id))
          .limit(1)
      )[0];
    }),

  listSurveys: protectedProcedure
    .input(
      z.object({
        ...dietarySurveysSelectSchema.partial().shape,
        ...paginationInputSchema.shape,
      }),
    )
    .query(async ({ ctx, input }) => {
      const offset = (input.page - 1) * input.pageSize;
      const whereConditions = [];
      if (input.id !== undefined)
        whereConditions.push(eq(dietarySurveys.id, input.id));

      return {
        data: await ctx.db
          .select({
            ...getTableColumns(dietarySurveys),
          })
          .from(dietarySurveys)
          .where(whereConditions.length ? and(...whereConditions) : undefined)
          .limit(input.pageSize)
          .offset(offset),
        page: input.page,
        pageSize: input.pageSize,
      };
    }),

  createQuestion: protectedProcedure
    .input(dietaryQuestionInsertSchema)
    .mutation(async ({ ctx, input }) => {
      const [newQuestion] = await ctx.db
        .insert(dietaryQuestions)
        .values(input)
        .returning();
      return newQuestion;
    }),

  listQuestions: protectedProcedure
    .input(dietaryQuestionSelectSchema.partial())
    .query(async ({ ctx, input }) => {
      const whereConditions = [];
      if (input.category)
        whereConditions.push(eq(dietaryQuestions.category, input.category));
      return await ctx.db
        .select()
        .from(dietaryQuestions)
        .where(whereConditions.length ? and(...whereConditions) : undefined);
    }),

  // ─── Survey ↔ Questions Linking ─────────────────────────────
  linkQuestionsToSurvey: protectedProcedure
    .input(z.array(dietarySurveyQuestionInsertSchema))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.insert(dietarySurveyQuestions).values(input);
      return { success: true };
    }),

  listSurveyQuestions: protectedProcedure
    .input(z.object({ surveyId: z.number() }))
    .query(async ({ ctx, input }) => {
      return await ctx.db
        .select({
          ...getTableColumns(dietarySurveyQuestions),
          question: getTableColumns(dietaryQuestions),
        })
        .from(dietarySurveyQuestions)
        .where(eq(dietarySurveyQuestions.surveyId, input.surveyId))
        .leftJoin(
          dietaryQuestions,
          eq(dietarySurveyQuestions.questionId, dietaryQuestions.id),
        );
    }),

  // ─── Answers ─────────────────────────────
  createAnswers: protectedProcedure
    .input(
      z.object({
        questionId: z.number(),
        answers: z.array(dietaryAnswerInsertSchema),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .insert(dietaryAnswers)
        .values(input.answers)
        .onConflictDoUpdate({
          target: [dietaryAnswers.questionId],
          set: {
            status: dietaryAnswers.status,
            comments_or_actions: dietaryAnswers.comments_or_actions,
            validation_or_completion: dietaryAnswers.validation_or_completion,
          },
        });
      return { success: true };
    }),

  listAnswers: protectedProcedure
    .input(dietaryAnswerSelectSchema.partial())
    .query(async ({ ctx, input }) => {
      const whereConditions = [];
      if (input.questionId)
        whereConditions.push(eq(dietaryAnswers.questionId, input.questionId));
      return await ctx.db
        .select()
        .from(dietaryAnswers)
        .where(whereConditions.length ? and(...whereConditions) : undefined);
    }),
});
