import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import {
  pocComment,
  pocCommentInsertSchema,
  user,
} from "@/server/db/schema";
import { eq, desc } from "drizzle-orm";

export const pocCommentRouter = createTRPCRouter({
  // Create a new comment
  create: protectedProcedure
    .input(
      z.object({
        surveyId: z.number(),
        templateId: z.number(),
        commentText: z.string().min(1, "Comment cannot be empty"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const newComment = await ctx.db
        .insert(pocComment)
        .values({
          surveyId: input.surveyId,
          templateId: input.templateId,
          commentText: input.commentText,
          authorId: ctx.session.user.id,
        })
        .returning();

      return newComment[0];
    }),

  // List comments for a survey/template combination
  list: protectedProcedure
    .input(
      z.object({
        surveyId: z.number(),
        templateId: z.number(),
      }),
    )
    .query(async ({ ctx, input }) => {
      return await ctx.db
        .select({
          id: pocComment.id,
          commentText: pocComment.commentText,
          createdAt: pocComment.createdAt,
          author: {
            id: user.id,
            name: user.name,
            email: user.email,
          },
        })
        .from(pocComment)
        .leftJoin(user, eq(pocComment.authorId, user.id))
        .where(
          eq(pocComment.surveyId, input.surveyId) &&
          eq(pocComment.templateId, input.templateId)
        )
        .orderBy(desc(pocComment.createdAt));
    }),

  // Delete a comment (if needed)
  delete: protectedProcedure
    .input(
      z.object({
        id: z.number(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Optional: Add authorization check to ensure user can only delete their own comments
      await ctx.db
        .delete(pocComment)
        .where(eq(pocComment.id, input.id));
    }),
});
