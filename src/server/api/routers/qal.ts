// server/api/routers/qal.ts
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import {
  qalTemplate,
  qalSurvey,
  qalSection,
  qalQuestion,
  qalSurveySection,
  qalQuestionResponse,
  facility,
} from "@/server/db/schema";
import { and, eq, inArray, asc, desc } from "drizzle-orm";

// Helper to convert number to DB numeric string
function toDbNumeric(value: number): string {
  return value.toFixed(4);
}

export const qalRouter = createTRPCRouter({
  // ===========================
  // TEMPLATE MANAGEMENT
  // ===========================
  
  createTemplate: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255),
        description: z.string().optional(),
        meta: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [template] = await ctx.db
        .insert(qalTemplate)
        .values({
          name: input.name,
          meta: input.meta || null,
          isActive: true,
        })
        .returning();
      
      return template;
    }),

  listTemplates: protectedProcedure.query(async ({ ctx }) => {
    return await ctx.db
      .select()
      .from(qalTemplate)
      .orderBy(desc(qalTemplate.createdAt));
  }),

  getTemplate: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const [template] = await ctx.db
        .select()
        .from(qalTemplate)
        .where(eq(qalTemplate.id, input.id))
        .limit(1);

      if (!template) throw new Error("Template not found");

      // Get sections with questions
      const sections = await ctx.db
        .select()
        .from(qalSection)
        .where(eq(qalSection.templateId, input.id))
        .orderBy(asc(qalSection.sortOrder));

      const sectionsWithQuestions = await Promise.all(
        sections.map(async (section) => {
          const questions = await ctx.db
            .select()
            .from(qalQuestion)
            .where(eq(qalQuestion.sectionId, section.id))
            .orderBy(asc(qalQuestion.sortOrder));

          return {
            ...section,
            questions,
          };
        })
      );

      return {
        template,
        sections: sectionsWithQuestions,
      };
    }),

  // ===========================
  // SECTION MANAGEMENT
  // ===========================

  createSection: protectedProcedure
    .input(
      z.object({
        templateId: z.number().int().positive(),
        title: z.string().min(1).max(255),
        description: z.string().optional(),
        possiblePoints: z.number().int().min(0),
        sortOrder: z.number().int().min(0),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [section] = await ctx.db
        .insert(qalSection)
        .values({
          templateId: input.templateId,
          title: input.title,
          description: input.description || null,
          possiblePoints: input.possiblePoints,
          sortOrder: input.sortOrder,
        })
        .returning();

      return section;
    }),

  updateSection: protectedProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        title: z.string().min(1).max(255).optional(),
        description: z.string().optional(),
        possiblePoints: z.number().int().min(0).optional(),
        sortOrder: z.number().int().min(0).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updates } = input;
      
      const [updated] = await ctx.db
        .update(qalSection)
        .set(updates)
        .where(eq(qalSection.id, id))
        .returning();

      return updated;
    }),

  deleteSection: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(qalSection)
        .where(eq(qalSection.id, input.id));

      return { success: true };
    }),

  // ===========================
  // QUESTION MANAGEMENT
  // ===========================

  createQuestion: protectedProcedure
    .input(
      z.object({
        sectionId: z.number().int().positive(),
        prompt: z.string().min(1),
        guidance: z.string().optional(),
        fixedSample: z.number().int().min(0),
        possiblePoints: z.number().min(0), // ✅ ADDED
        sortOrder: z.number().int().min(0),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [question] = await ctx.db
        .insert(qalQuestion)
        .values({
          sectionId: input.sectionId,
          prompt: input.prompt,
          guidance: input.guidance || null,
          fixedSample: input.fixedSample,
          possiblePoints: toDbNumeric(input.possiblePoints), // ✅ ADDED
          sortOrder: input.sortOrder,
        })
        .returning();

      return question;
    }),

  updateQuestion: protectedProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        prompt: z.string().min(1).optional(),
        guidance: z.string().optional(),
        fixedSample: z.number().int().min(0).optional(),
        possiblePoints: z.number().min(0).optional(), // ✅ ADDED
        sortOrder: z.number().int().min(0).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, possiblePoints, ...updates } = input;

      const updateData: any = updates;
      if (possiblePoints !== undefined) {
        updateData.possiblePoints = toDbNumeric(possiblePoints); // ✅ ADDED
      }

      const [updated] = await ctx.db
        .update(qalQuestion)
        .set(updateData)
        .where(eq(qalQuestion.id, id))
        .returning();

      return updated;
    }),

  deleteQuestion: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(qalQuestion)
        .where(eq(qalQuestion.id, input.id));

      return { success: true };
    }),

  // ===========================
  // SURVEY MANAGEMENT
  // ===========================

  createSurvey: protectedProcedure
    .input(
      z.object({
        templateId: z.number().int().positive(),
        facilityId: z.number().int().positive(),
        surveyDate: z.date(),
        auditorUserId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [survey] = await ctx.db
        .insert(qalSurvey)
        .values({
          templateId: input.templateId,
          facilityId: input.facilityId,
          surveyDate: input.surveyDate,
          auditorUserId: input.auditorUserId,
          isLocked: false,
          totalPossible: "0",
          totalEarned: "0",
          overallPercent: "0",
        })
        .returning();

      if (!survey) throw new Error("Failed to create survey");

      return survey;
    }),

  listSurveys: protectedProcedure
    .input(
      z.object({
        facilityId: z.number().int().positive().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      if (input.facilityId) {
        return await ctx.db
          .select()
          .from(qalSurvey)
          .where(eq(qalSurvey.facilityId, input.facilityId))
          .orderBy(desc(qalSurvey.surveyDate));
      }

      return await ctx.db
        .select()
        .from(qalSurvey)
        .orderBy(desc(qalSurvey.surveyDate));
    }),

  getSurvey: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const [survey] = await ctx.db
        .select()
        .from(qalSurvey)
        .where(eq(qalSurvey.id, input.id))
        .limit(1);

      if (!survey) throw new Error("Survey not found");

      // Get template sections
      const sections = await ctx.db
        .select()
        .from(qalSection)
        .where(eq(qalSection.templateId, survey.templateId))
        .orderBy(asc(qalSection.sortOrder));

      // Get section responses
      const sectionResponses = await ctx.db
        .select()
        .from(qalSurveySection)
        .where(eq(qalSurveySection.surveyId, input.id));

      const sectionsWithResponses = sections.map((section) => ({
        section,
        response: sectionResponses.find((r) => r.sectionId === section.id) || null,
      }));

      // Get facility
      const [fac] = await ctx.db
        .select()
        .from(facility)
        .where(eq(facility.id, survey.facilityId))
        .limit(1);

      return {
        survey,
        sections: sectionsWithResponses,
        facility: fac || null,
      };
    }),

  getSectionWithQuestions: protectedProcedure
    .input(
      z.object({
        surveyId: z.number().int().positive(),
        sectionId: z.number().int().positive(),
      })
    )
    .query(async ({ ctx, input }) => {
      // Get section metadata
      const [section] = await ctx.db
        .select()
        .from(qalSection)
        .where(eq(qalSection.id, input.sectionId))
        .limit(1);

      if (!section) throw new Error("Section not found");

      // Get questions for this section
      const questions = await ctx.db
        .select()
        .from(qalQuestion)
        .where(eq(qalQuestion.sectionId, input.sectionId))
        .orderBy(asc(qalQuestion.sortOrder));

      // Get section response if exists
      const [sectionResponse] = await ctx.db
        .select()
        .from(qalSurveySection)
        .where(
          and(
            eq(qalSurveySection.surveyId, input.surveyId),
            eq(qalSurveySection.sectionId, input.sectionId)
          )
        )
        .limit(1);

      // Get individual question responses
      const questionResponses = await ctx.db
        .select()
        .from(qalQuestionResponse)
        .where(
          and(
            eq(qalQuestionResponse.surveyId, input.surveyId),
            inArray(
              qalQuestionResponse.questionId,
              questions.map((q) => q.id)
            )
          )
        );

      return {
        section,
        questions: questions.map((q) => ({
          ...q,
          response: questionResponses.find((r) => r.questionId === q.id) || null,
        })),
        sectionResponse,
      };
    }),

  // ===========================
  // RESPONSE SAVING & SCORING
  // ===========================

  saveQuestionResponse: protectedProcedure
    .input(
      z.object({
        surveyId: z.number().int().positive(),
        questionId: z.number().int().positive(),
        passedCount: z.number().int().min(0).nullable(),
        isNotApplicable: z.boolean().optional(),
        testingSample: z.string().optional(),
        comments: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Get question to find section
      const [question] = await ctx.db
        .select()
        .from(qalQuestion)
        .where(eq(qalQuestion.id, input.questionId))
        .limit(1);

      if (!question) throw new Error("Question not found");

      // Upsert response
      const existing = await ctx.db
        .select()
        .from(qalQuestionResponse)
        .where(
          and(
            eq(qalQuestionResponse.surveyId, input.surveyId),
            eq(qalQuestionResponse.questionId, input.questionId)
          )
        )
        .limit(1);

      if (existing.length > 0 && existing[0]) {
        await ctx.db
          .update(qalQuestionResponse)
          .set({
            passedCount: input.passedCount,
            isNotApplicable: input.isNotApplicable ?? false,
            testingSample: input.testingSample || null,
            comments: input.comments || null,
          })
          .where(eq(qalQuestionResponse.id, existing[0].id));
      } else {
        await ctx.db.insert(qalQuestionResponse).values({
          surveyId: input.surveyId,
          questionId: input.questionId,
          passedCount: input.passedCount,
          isNotApplicable: input.isNotApplicable ?? false,
          testingSample: input.testingSample || null,
          comments: input.comments || null,
        });
      }

      // Recalculate section totals
      await recalculateSection(ctx, input.surveyId, question.sectionId);

      return { ok: true };
    }),

  // ===========================
  // LOCK/UNLOCK
  // ===========================

  lock: protectedProcedure
    .input(z.object({ surveyId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(qalSurvey)
        .set({ isLocked: true })
        .where(eq(qalSurvey.id, input.surveyId))
        .returning();

      return updated;
    }),

  unlock: protectedProcedure
    .input(z.object({ surveyId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(qalSurvey)
        .set({ isLocked: false })
        .where(eq(qalSurvey.id, input.surveyId))
        .returning();

      return updated;
    }),
});

// ===========================
// HELPER FUNCTIONS
// ===========================

async function recalculateSection(ctx: any, surveyId: number, sectionId: number) {
  const [section] = await ctx.db
    .select()
    .from(qalSection)
    .where(eq(qalSection.id, sectionId))
    .limit(1);

  if (!section) return;

  const questions = await ctx.db
    .select()
    .from(qalQuestion)
    .where(eq(qalQuestion.sectionId, sectionId));

  const responses = await ctx.db
    .select()
    .from(qalQuestionResponse)
    .where(
      and(
        eq(qalQuestionResponse.surveyId, surveyId),
        inArray(
          qalQuestionResponse.questionId,
          questions.map((q: { id: any; }) => q.id)
        )
      )
    );

  // ✅ NEW CALCULATION: Sum up earned points per question
  let sectionEarnedPoints = 0;
  let totalSamples = 0;
  let totalPassed = 0;

  for (const question of questions) {
    const response = responses.find((r: any) => r.questionId === question.id);
    
    if (!response) continue;

    const questionPossiblePoints = Number(question.possiblePoints || 0);
    const fixedSample = question.fixedSample;
    const passedCount = response.isNotApplicable ? 0 : (response.passedCount || 0);

    totalSamples += fixedSample;
    if (!response.isNotApplicable) {
      totalPassed += passedCount;
    }

    // Calculate earned points for this question
    // Formula: (Passed / Sample) × Possible Points
    if (!response.isNotApplicable && fixedSample > 0) {
      const questionEarned = (passedCount / fixedSample) * questionPossiblePoints;
      sectionEarnedPoints += questionEarned;
    }
  }

  const allNA = responses.length > 0 && responses.every((r: { isNotApplicable: any; }) => r.isNotApplicable);

  // Upsert section response
  const [existing] = await ctx.db
    .select()
    .from(qalSurveySection)
    .where(
      and(
        eq(qalSurveySection.surveyId, surveyId),
        eq(qalSurveySection.sectionId, sectionId)
      )
    )
    .limit(1);

  if (existing) {
    await ctx.db
      .update(qalSurveySection)
      .set({
        fixedSample: totalSamples,
        passedCount: totalPassed,
        isNotApplicable: allNA,
        earnedPoints: toDbNumeric(sectionEarnedPoints),
      })
      .where(eq(qalSurveySection.id, existing.id));
  } else {
    await ctx.db.insert(qalSurveySection).values({
      surveyId,
      sectionId,
      fixedSample: totalSamples,
      passedCount: totalPassed,
      isNotApplicable: allNA,
      earnedPoints: toDbNumeric(sectionEarnedPoints),
    });
  }

  // Recalculate survey totals
  await recalculateSurveyTotals(ctx, surveyId);
}

async function recalculateSurveyTotals(ctx: any, surveyId: number) {
  const sectionResponses = await ctx.db
    .select()
    .from(qalSurveySection)
    .where(eq(qalSurveySection.surveyId, surveyId));

  const sections = await ctx.db
    .select()
    .from(qalSection)
    .where(
      inArray(
        qalSection.id,
        sectionResponses.map((r: { sectionId: any; }) => r.sectionId)
      )
    );

  let totalPossible = 0;
  let totalEarned = 0;

  for (const sr of sectionResponses) {
    const sec = sections.find((s: { id: any; }) => s.id === sr.sectionId);
    if (sec) {
      totalPossible += Number(sec.possiblePoints);
      totalEarned += Number(sr.earnedPoints || 0);
    }
  }

  const overallPercent = totalPossible > 0 ? (totalEarned / totalPossible) * 100 : 0;

  await ctx.db
    .update(qalSurvey)
    .set({
      totalPossible: toDbNumeric(totalPossible),
      totalEarned: toDbNumeric(totalEarned),
      overallPercent: toDbNumeric(overallPercent),
    })
    .where(eq(qalSurvey.id, surveyId));
}
