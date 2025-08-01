import { z } from "zod";
import {
  question,
  questionInsertSchema,
  questionSelectSchema,
  ftag,
  questionFtag,
} from "@/server/db/schema";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { eq, ilike, and, inArray } from "drizzle-orm";
import {
  paginationInputSchema,
  questionCreateInputSchema,
} from "@/server/utils/schema";

export const questionRouter = createTRPCRouter({
  create: protectedProcedure
    .input(questionCreateInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { ftagIds, ...questionData } = input;

      const [created] = await ctx.db
        .insert(question)
        .values(questionData)
        .returning({ id: question.id });

      if (!created) {
        throw new Error("Failed to insert question");
      }

      if (ftagIds && ftagIds.length > 0) {
        await ctx.db.insert(questionFtag).values(
          ftagIds.map((ftagId) => ({
            questionId: created.id,
            ftagId,
          })),
        );
      }
    }),

  delete: protectedProcedure
    .input(z.object({ id: questionSelectSchema.shape.id }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(question).where(eq(question.id, input.id));
    }),

  byId: protectedProcedure
    .input(z.object({ id: questionSelectSchema.shape.id }))
    .query(async ({ ctx, input }) => {
      const questionRow = await ctx.db
        .select()
        .from(question)
        .where(eq(question.id, input.id))
        .limit(1);

      if (!questionRow[0]) return null;

      const ftagRows = await ctx.db
        .select()
        .from(questionFtag)
        .innerJoin(ftag, eq(questionFtag.ftagId, ftag.id))
        .where(eq(questionFtag.questionId, input.id));

      return {
        ...questionRow[0],
        ftags: ftagRows,
      };
    }),

  getFtagsByQuestionId: protectedProcedure
    .input(z.object({ questionId: z.number() }))
    .query(async ({ ctx, input }) => {
      return await ctx.db
        .select({
          id: ftag.id,
          code: ftag.code,
          description: ftag.description,
        })
        .from(questionFtag)
        .innerJoin(ftag, eq(questionFtag.ftagId, ftag.id))
        .where(eq(questionFtag.questionId, input.questionId));
    }),

  list: protectedProcedure
    .input(
      z.object({
        ...questionSelectSchema.partial().shape,
        ...paginationInputSchema.shape,
        ftagCode: z.string().optional(), // filter by ftag.code
      }),
    )
    .query(async ({ ctx, input }) => {
      const offset = (input.page - 1) * input.pageSize;

      const conditions = [];
      if (input.id !== undefined) conditions.push(eq(question.id, input.id));
      if (input.text) conditions.push(ilike(question.text, `%${input.text}%`));
      if (input.templateId !== undefined)
        conditions.push(eq(question.templateId, input.templateId));

      // If filtering by ftagCode, resolve matching question IDs first
      let questionIdsToFilter: number[] | undefined;
      if (input.ftagCode) {
        const matchedQuestionIds = await ctx.db
          .select({ questionId: questionFtag.questionId })
          .from(questionFtag)
          .innerJoin(ftag, eq(questionFtag.ftagId, ftag.id))
          .where(ilike(ftag.code, `%${input.ftagCode}%`));

        questionIdsToFilter = matchedQuestionIds.map((row) => row.questionId);

        if (questionIdsToFilter.length === 0) {
          return []; // No matches
        }

        conditions.push(inArray(question.id, questionIdsToFilter));
      }

      const whereClause =
        conditions.length > 0 ? and(...conditions) : undefined;

      return await ctx.db
        .select()
        .from(question)
        .where(whereClause)
        .limit(input.pageSize)
        .offset(offset);
    }),
});
