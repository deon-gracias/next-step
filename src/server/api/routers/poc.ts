// server/api/routers/poc.ts - CORRECTED CONSTRAINT VERSION
import { z } from "zod";
import { and, eq, isNull, sql } from "drizzle-orm";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { surveyPOC, member, survey, memberFacility } from "@/server/db/schema";
import { TRPCError } from "@trpc/server";

const listInput = z.object({
  surveyId: z.number().int().positive(),
  residentId: z.number().int().positive().optional(),
  surveyCaseId: z.number().int().positive().optional(),
});

const upsertInput = z.object({
  surveyId: z.number().int().positive(),
  residentId: z.number().int().positive().optional(),
  surveyCaseId: z.number().int().positive().optional(),
  templateId: z.number().int().positive(),
  questionId: z.number().int().positive(),
  pocText: z.string().min(1),
});

const deleteInput = z.object({
  surveyId: z.number().int().positive(),
  residentId: z.number().int().positive().optional(),
  surveyCaseId: z.number().int().positive().optional(),
  templateId: z.number().int().positive(),
  questionId: z.number().int().positive(),
});

export const pocRouter = createTRPCRouter({
  list: protectedProcedure.input(listInput).query(async ({ input, ctx }) => {
    const whereConditions: any[] = [eq(surveyPOC.surveyId, input.surveyId)];

    if (input.residentId !== undefined) {
      whereConditions.push(eq(surveyPOC.residentId, input.residentId));
    } else if (input.surveyCaseId !== undefined) {
      whereConditions.push(eq(surveyPOC.surveyCaseId, input.surveyCaseId));
    } else {
      whereConditions.push(isNull(surveyPOC.residentId));
      whereConditions.push(isNull(surveyPOC.surveyCaseId));
    }

    return await ctx.db
      .select()
      .from(surveyPOC)
      .where(and(...whereConditions));
  }),

  // ✅ CORRECTED: Use column arrays for onConflictDoUpdate target
  upsert: protectedProcedure.input(upsertInput).mutation(async ({ input, ctx }) => {
    const { surveyId, templateId, questionId, pocText, residentId, surveyCaseId } = input;

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

    // 1. Admin: Allow
    if (memberRecord.role === "admin") {
      // Allow proceed
    }
    // 2. Facility Coordinator: Check assignment
    else if (memberRecord.role === "facility_coordinator") {
      // Get Survey's Facility
      const [surveyRecord] = await ctx.db
        .select({ facilityId: survey.facilityId })
        .from(survey)
        .where(eq(survey.id, surveyId))
        .limit(1);

      if (!surveyRecord) throw new TRPCError({ code: "NOT_FOUND", message: "Survey not found" });

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
          message:
            "Restricted: You are not assigned to this facility.",
        });
      }
    }
    // 3. Others: Deny
    else {
      throw new TRPCError({
        code: "FORBIDDEN",
        message:
          "Insufficient permissions. Only Admins and assigned Facility Coordinators can fill POCs.",
      });
    }
    // --- SECURITY CHECK END ---

    const pocData = {
      surveyId,
      templateId,
      questionId,
      pocText,
      residentId: residentId || null,
      surveyCaseId: surveyCaseId || null,
    };

    if (residentId) {
      // ✅ CORRECTED: Use column array for resident constraint
      return await ctx.db
        .insert(surveyPOC)
        .values([pocData])
        .onConflictDoUpdate({
          target: [surveyPOC.surveyId, surveyPOC.residentId, surveyPOC.templateId, surveyPOC.questionId],
          set: { pocText: sql`excluded.poc_text` },
        });
    } else if (surveyCaseId) {
      // ✅ CORRECTED: Use column array for case constraint
      return await ctx.db
        .insert(surveyPOC)
        .values([pocData])
        .onConflictDoUpdate({
          target: [surveyPOC.surveyId, surveyPOC.surveyCaseId, surveyPOC.templateId, surveyPOC.questionId],
          set: { pocText: sql`excluded.poc_text` },
        });
    } else {
      // ✅ CORRECTED: Use column array for general constraint
      return await ctx.db
        .insert(surveyPOC)
        .values([pocData])
        .onConflictDoUpdate({
          target: [surveyPOC.surveyId, surveyPOC.questionId],
          set: { pocText: sql`excluded.poc_text` },
        });
    }
  }),

  delete: protectedProcedure.input(deleteInput).mutation(async ({ input, ctx }) => {
    const whereConditions: any[] = [
      eq(surveyPOC.surveyId, input.surveyId),
      eq(surveyPOC.templateId, input.templateId),
      eq(surveyPOC.questionId, input.questionId),
    ];

    if (input.residentId !== undefined) {
      whereConditions.push(eq(surveyPOC.residentId, input.residentId));
    } else if (input.surveyCaseId !== undefined) {
      whereConditions.push(eq(surveyPOC.surveyCaseId, input.surveyCaseId));
    } else {
      whereConditions.push(isNull(surveyPOC.residentId));
      whereConditions.push(isNull(surveyPOC.surveyCaseId));
    }

    await ctx.db
      .delete(surveyPOC)
      .where(and(...whereConditions));

    return { success: true };
  }),
});
