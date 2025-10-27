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

function toDbNumeric(value: number): string {
  return value.toFixed(4);
}

export const qalRouter = createTRPCRouter({
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

  createQuestion: protectedProcedure
    .input(
      z.object({
        sectionId: z.number().int().positive(),
        prompt: z.string().min(1),
        guidance: z.string().optional(),
        fixedSample: z.number().int().min(0),
        possiblePoints: z.number().min(0),
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
          possiblePoints: toDbNumeric(input.possiblePoints),
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
        possiblePoints: z.number().min(0).optional(),
        sortOrder: z.number().int().min(0).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, possiblePoints, ...updates } = input;

      const updateData: any = updates;
      if (possiblePoints !== undefined) {
        updateData.possiblePoints = toDbNumeric(possiblePoints);
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

createSurvey: protectedProcedure
  .input(
    z.object({
      templateId: z.number().int().positive(),
      facilityId: z.number().int().positive(),
      surveyDate: z.date(),
      auditorUserId: z.string(),
      surveyType: z.enum(["onsite", "offsite"]), // ✅ ADD THIS
      administrator: z.string().min(1, "Administrator is required"),
      businessOfficeManager: z.string().min(1, "Business Office Manager is required"),
      assistantBusinessOfficeManager: z.string().optional(),
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
        surveyType: input.surveyType, // ✅ ADD THIS
        administrator: input.administrator,
        businessOfficeManager: input.businessOfficeManager,
        assistantBusinessOfficeManager: input.assistantBusinessOfficeManager || null,
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

      const sections = await ctx.db
        .select()
        .from(qalSection)
        .where(eq(qalSection.templateId, survey.templateId))
        .orderBy(asc(qalSection.sortOrder));

      const sectionResponses = await ctx.db
        .select()
        .from(qalSurveySection)
        .where(eq(qalSurveySection.surveyId, input.id));

      const sectionsWithResponses = sections.map((section) => ({
        section,
        response: sectionResponses.find((r) => r.sectionId === section.id) || null,
      }));

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
      const [section] = await ctx.db
        .select()
        .from(qalSection)
        .where(eq(qalSection.id, input.sectionId))
        .limit(1);

      if (!section) throw new Error("Section not found");

      const questions = await ctx.db
        .select()
        .from(qalQuestion)
        .where(eq(qalQuestion.sectionId, input.sectionId))
        .orderBy(asc(qalQuestion.sortOrder));

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

  saveQuestionResponse: protectedProcedure
    .input(
      z.object({
        surveyId: z.number().int().positive(),
        questionId: z.number().int().positive(),
        sampleSize: z.number().int().min(0).optional(),
        passedCount: z.number().int().min(0).nullable(),
        isNotApplicable: z.boolean().optional(),
        testingSample: z.string().optional(),
        comments: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [question] = await ctx.db
        .select()
        .from(qalQuestion)
        .where(eq(qalQuestion.id, input.questionId))
        .limit(1);

      if (!question) throw new Error("Question not found");

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

      const updateData: any = {
        passedCount: input.passedCount,
        isNotApplicable: input.isNotApplicable ?? false,
        testingSample: input.testingSample || null,
        comments: input.comments || null,
      };

      if (input.sampleSize !== undefined) {
        updateData.sampleSize = input.sampleSize;
      }

      if (existing.length > 0 && existing[0]) {
        await ctx.db
          .update(qalQuestionResponse)
          .set(updateData)
          .where(eq(qalQuestionResponse.id, existing[0].id));
      } else {
        await ctx.db.insert(qalQuestionResponse).values({
          surveyId: input.surveyId,
          questionId: input.questionId,
          sampleSize: input.sampleSize ?? 0,
          ...updateData,
        });
      }

      await recalculateSection(ctx, input.surveyId, question.sectionId);
      return { ok: true };
    }),

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
          questions.map((q: { id: any }) => q.id)
        )
      )
    );

  let sectionEarnedPoints = 0;
  let totalSamples = 0;
  let totalPassed = 0;

  for (const question of questions) {
    const response = responses.find((r: any) => r.questionId === question.id);
    
    if (!response) continue;

    const questionPossiblePoints = Number(question.possiblePoints || 0);
    const sampleSize = response.sampleSize ?? 0;
    const passedCount = response.isNotApplicable ? 0 : (response.passedCount || 0);

    totalSamples += sampleSize;
    if (!response.isNotApplicable) {
      totalPassed += passedCount;
    }

    if (!response.isNotApplicable && sampleSize > 0) {
      const questionEarned = (passedCount / sampleSize) * questionPossiblePoints;
      sectionEarnedPoints += questionEarned;
    }
  }

  const allNA = responses.length > 0 && responses.every((r: { isNotApplicable: any }) => r.isNotApplicable);

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

  await recalculateSurveyTotals(ctx, surveyId);
}

async function recalculateSurveyTotals(ctx: any, surveyId: number) {
  // Get survey to find template
  const [survey] = await ctx.db
    .select()
    .from(qalSurvey)
    .where(eq(qalSurvey.id, surveyId))
    .limit(1);

  if (!survey) return;

  // Get all sections for this template
  const sections = await ctx.db
    .select()
    .from(qalSection)
    .where(eq(qalSection.templateId, survey.templateId));

  let totalPossible = 0;
  let totalEarned = 0;

  for (const sec of sections) {
    // Get all questions in this section
    const questions = await ctx.db
      .select()
      .from(qalQuestion)
      .where(eq(qalQuestion.sectionId, sec.id));

    // Get question responses
    const questionResponses = await ctx.db
      .select()
      .from(qalQuestionResponse)
      .where(
        and(
          eq(qalQuestionResponse.surveyId, surveyId),
          inArray(
            qalQuestionResponse.questionId,
            questions.map((q: { id: any }) => q.id)
          )
        )
      );

    // Calculate adjusted possible points (exclude N/A items)
    let sectionAdjustedPossible = 0;
    let sectionEarned = 0;

    for (const q of questions) {
      const qResponse = questionResponses.find((r: any) => r.questionId === q.id);
      
      const questionPossiblePoints = Number(q.possiblePoints || 0);
      
      // If N/A, exclude from both earned and possible
      if (qResponse && qResponse.isNotApplicable) {
        continue;
      }
      
      // Add to possible total
      sectionAdjustedPossible += questionPossiblePoints;
      
      // Calculate earned for this question
      if (qResponse && qResponse.sampleSize && qResponse.sampleSize > 0) {
        const passedCount = qResponse.passedCount || 0;
        const questionEarned = (passedCount / qResponse.sampleSize) * questionPossiblePoints;
        sectionEarned += questionEarned;
      }
    }

    totalPossible += sectionAdjustedPossible;
    totalEarned += sectionEarned;
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
