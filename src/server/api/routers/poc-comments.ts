import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import {
  pocComment,
  pocCommentInsertSchema,
  pocCommentSelectSchema,
  user,
} from "@/server/db/schema";
import { eq, desc, and } from "drizzle-orm";

export const pocCommentRouter = createTRPCRouter({
  create: protectedProcedure
    .input(
      pocCommentInsertSchema.pick({
        surveyId: true,
        templateId: true,
        commentText: true,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [newComment] = await ctx.db
        .insert(pocComment)
        .values({
          surveyId: input.surveyId,
          templateId: input.templateId,
          commentText: input.commentText,
          authorId: ctx.session.user.id,
        })
        .returning();

      return newComment;
    }),

  list: protectedProcedure
    .input(pocCommentSelectSchema.pick({ surveyId: true, templateId: true }))
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
          and(
            eq(pocComment.surveyId, input.surveyId),
            eq(pocComment.templateId, input.templateId),
          ),
        )
        .orderBy(desc(pocComment.createdAt));
    }),

  delete: protectedProcedure
    .input(pocCommentSelectSchema.pick({ id: true }))
    .mutation(async ({ ctx, input }) => {
      const existingComment = await ctx.db.query.pocComment.findFirst({
        where: eq(pocComment.id, input.id),
        columns: { authorId: true },
      });

      if (!existingComment) {
        throw new Error("Comment not found");
      }

      if (existingComment.authorId !== ctx.session.user.id) {
        throw new Error("Unauthorized: You can only delete your own comments");
      }

      await ctx.db.delete(pocComment).where(eq(pocComment.id, input.id));

      return { success: true };
    }),
});
