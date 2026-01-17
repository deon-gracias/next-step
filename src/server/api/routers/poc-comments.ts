import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import {
  pocComment,
  pocCommentInsertSchema,
  pocCommentSelectSchema,
  user,
  member,
  survey,
  memberFacility,
} from "@/server/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

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

      // --- SECURITY CHECK START ---
      const activeOrgId = ctx.session.session.activeOrganizationId;
      if (!activeOrgId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "No active organization",
        });
      }

      const [memberRecord] = await ctx.db
        .select({ role: member.role })
        .from(member)
        .where(
          and(
            eq(member.userId, ctx.session.user.id),
            eq(member.organizationId, activeOrgId),
          ),
        )
        .limit(1);

      if (!memberRecord) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "User is not a member of the organization",
        });
      }

      // 1. Admin & Lead Surveyor: Allow
      if (
        memberRecord.role === "admin" ||
        memberRecord.role === "lead_surveyor"
      ) {
        // Allow proceed
      }
      // 2. Facility Coordinator: Check assignment
      else if (memberRecord.role === "facility_coordinator") {
        // Get Survey's Facility
        const [surveyRecord] = await ctx.db
          .select({ facilityId: survey.facilityId })
          .from(survey)
          .where(eq(survey.id, input.surveyId))
          .limit(1);

        if (!surveyRecord)
          throw new TRPCError({ code: "NOT_FOUND", message: "Survey not found" });

        // Check assignment
        const [assignment] = await ctx.db
          .select()
          .from(memberFacility)
          .where(
            and(
              eq(memberFacility.userId, ctx.session.user.id),
              eq(memberFacility.facilityId, surveyRecord.facilityId),
            ),
          )
          .limit(1);

        if (!assignment) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Restricted: You are not assigned to this facility.",
          });
        }
      }
      // 3. Others: Deny
      else {
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            "Insufficient permissions. Only Admins, Lead Surveyors, and assigned Facility Coordinators can add comments.",
        });
      }
      // --- SECURITY CHECK END ---

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
