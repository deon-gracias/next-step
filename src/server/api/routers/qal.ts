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
  qalPOC,          // ✅ NEW
  qalPocComment,   // ✅ NEW
} from "@/server/db/schema";
import { and, eq, inArray, asc, desc, sql } from "drizzle-orm"; // ✅ sql added


function toDbNumeric(value: number): string {
  return value.toFixed(4);
}


export const qalRouter = createTRPCRouter({
  createTemplate: protectedProcedure
  .input(
    z.object({
      name: z.string().min(1).max(255),
      meta: z.string().optional(),
      sections: z.array(
        z.object({
          title: z.string().min(1),
          description: z.string().optional(),
          possiblePoints: z.number(),
          sortOrder: z.number(),
          questions: z.array(
            z.object({
              prompt: z.string().min(1),
              guidance: z.string().optional(),
              fixedSample: z.number(),
              possiblePoints: z.number(),
              sortOrder: z.number(),
            })
          ),
        })
      ).optional().default([]),
    })
  )
  .mutation(async ({ ctx, input }) => {
    // Create template
    const [template] = await ctx.db
      .insert(qalTemplate)
      .values({
        name: input.name,
        meta: input.meta || null,
        isActive: true,
      })
      .returning();

    if (!template) throw new Error("Failed to create template");

    // Create sections and questions if provided
    if (input.sections && input.sections.length > 0) {
      for (const sectionInput of input.sections) {
        const [section] = await ctx.db
          .insert(qalSection)
          .values({
            templateId: template.id,
            title: sectionInput.title,
            description: sectionInput.description || null,
            possiblePoints: sectionInput.possiblePoints,
            sortOrder: sectionInput.sortOrder,
          })
          .returning();

        if (!section) continue;

        // Create questions for this section
        if (sectionInput.questions.length > 0) {
          await ctx.db.insert(qalQuestion).values(
            sectionInput.questions.map((q) => ({
              sectionId: section.id,
              prompt: q.prompt,
              guidance: q.guidance || null,
              fixedSample: q.fixedSample,
              possiblePoints: toDbNumeric(q.possiblePoints),
              sortOrder: q.sortOrder,
            }))
          );
        }
      }
    }

    return template;
  }),

  // Add these to your QAL router

// Check if question is used in any surveys
checkQuestionUsage: protectedProcedure
  .input(z.object({ questionId: z.number().int().positive() }))
  .query(async ({ ctx, input }) => {
    const responses = await ctx.db
      .select()
      .from(qalQuestionResponse)
      .where(eq(qalQuestionResponse.questionId, input.questionId))
      .limit(1);

    const pocs = await ctx.db
      .select()
      .from(qalPOC)
      .where(eq(qalPOC.questionId, input.questionId))
      .limit(1);

    return {
      isUsed: responses.length > 0 || pocs.length > 0,
      responseCount: responses.length,
      pocCount: pocs.length,
    };
  }),

// Delete question with safety check
deleteQuestion: protectedProcedure
  .input(z.object({ id: z.number().int().positive() }))
  .mutation(async ({ ctx, input }) => {
    // Check if used
    const responses = await ctx.db
      .select()
      .from(qalQuestionResponse)
      .where(eq(qalQuestionResponse.questionId, input.id));

    const pocs = await ctx.db
      .select()
      .from(qalPOC)
      .where(eq(qalPOC.questionId, input.id));

    if (responses.length > 0 || pocs.length > 0) {
      throw new Error(
        "Cannot delete question: it is being used in surveys or POCs"
      );
    }

    await ctx.db.delete(qalQuestion).where(eq(qalQuestion.id, input.id));

    return { success: true };
  }),




  listTemplates: protectedProcedure.query(async ({ ctx }) => {
  const templates = await ctx.db
    .select()
    .from(qalTemplate)
    .orderBy(desc(qalTemplate.createdAt));

  // Get counts for each template
  const templatesWithCounts = await Promise.all(
    templates.map(async (template) => {
      const sections = await ctx.db
        .select()
        .from(qalSection)
        .where(eq(qalSection.templateId, template.id));

      const sectionIds = sections.map((s) => s.id);
      
      let questionCount = 0;
      if (sectionIds.length > 0) {
        const questions = await ctx.db
          .select()
          .from(qalQuestion)
          .where(inArray(qalQuestion.sectionId, sectionIds));
        questionCount = questions.length;
      }

      return {
        ...template,
        sectionCount: sections.length,
        questionCount,
      };
    })
  );

  return templatesWithCounts;
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


  createSurvey: protectedProcedure
    .input(
      z.object({
        templateId: z.number().int().positive(),
        facilityId: z.number().int().positive(),
        surveyDate: z.date(),
        auditorUserId: z.string(),
        surveyType: z.enum(["onsite", "offsite"]),
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
          surveyType: input.surveyType,
          administrator: input.administrator,
          businessOfficeManager: input.businessOfficeManager,
          assistantBusinessOfficeManager: input.assistantBusinessOfficeManager || null,
          isLocked: false,
          totalPossible: "0",
          totalEarned: "0",
          overallPercent: "0",
          // pocGenerated defaults in schema
        })
        .returning();

      if (!survey) throw new Error("Failed to create survey");

      return survey;
    }),


  deleteSurvey: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(qalQuestionResponse)
        .where(eq(qalQuestionResponse.surveyId, input.id));
      
      await ctx.db
        .delete(qalSurveySection)
        .where(eq(qalSurveySection.surveyId, input.id));
      
      await ctx.db
        .delete(qalSurvey)
        .where(eq(qalSurvey.id, input.id));
      
      return { success: true };
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


  // ========= NEW POC + COMMENTS ROUTES =========

  generatePOCs: protectedProcedure
    .input(z.object({ surveyId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const [survey] = await ctx.db
        .select()
        .from(qalSurvey)
        .where(eq(qalSurvey.id, input.surveyId))
        .limit(1);

      if (!survey) throw new Error("Survey not found");
      if (!survey.isLocked) throw new Error("Lock survey before generating POCs");

      // Clear existing POCs
      await ctx.db.delete(qalPOC).where(eq(qalPOC.surveyId, input.surveyId));

      // Load sections & questions
      const sections = await ctx.db
        .select()
        .from(qalSection)
        .where(eq(qalSection.templateId, survey.templateId));

      const questions = await ctx.db
        .select()
        .from(qalQuestion)
        .where(
          inArray(
            qalQuestion.sectionId,
            sections.map((s) => s.id)
          )
        );

      const responses = await ctx.db
        .select()
        .from(qalQuestionResponse)
        .where(eq(qalQuestionResponse.surveyId, input.surveyId));

      const questionsById = new Map(questions.map((q) => [q.id, q]));
      const sectionIdByQuestionId = new Map(
        questions.map((q) => [q.id, q.sectionId])
      );

      const pocInserts: any[] = [];

      for (const resp of responses) {
        const q = questionsById.get(resp.questionId);
        if (!q) continue;

        if (resp.isNotApplicable) continue;
        if (!resp.sampleSize || resp.sampleSize <= 0) continue;

        const sampleSize = resp.sampleSize;
        const passed = resp.passedCount ?? 0;
        if (passed === sampleSize) continue; // fully passed

        const sectionId = sectionIdByQuestionId.get(resp.questionId)!;
        const possiblePoints = Number(q.possiblePoints || 0);

        pocInserts.push({
          surveyId: input.surveyId,
          sectionId,
          questionId: resp.questionId,
          possiblePoints: toDbNumeric(possiblePoints),
          sampleSize,
          passedCount: passed,
          testingSample: resp.testingSample ?? null,
          comments: resp.comments ?? null,
          pocText: "",
          complianceDate: null,
        });
      }

      if (pocInserts.length > 0) {
        await ctx.db
          .insert(qalPOC)
          .values(pocInserts)
          .onConflictDoUpdate({
            target: [qalPOC.surveyId, qalPOC.questionId],
            set: {
              possiblePoints: sql`excluded.possible_points`,
              sampleSize: sql`excluded.sample_size`,
              passedCount: sql`excluded.passed_count`,
              testingSample: sql`excluded.testing_sample`,
              comments: sql`excluded.comments`,
              updatedAt: sql`now()`,
            },
          });
      }

      await ctx.db
        .update(qalSurvey)
        .set({ pocGenerated: true })
        .where(eq(qalSurvey.id, input.surveyId));

      return { count: pocInserts.length };
    }),


  listPOCs: protectedProcedure
    .input(z.object({ surveyId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select({
          poc: qalPOC,
          question: qalQuestion,
          section: qalSection,
        })
        .from(qalPOC)
        .innerJoin(qalQuestion, eq(qalPOC.questionId, qalQuestion.id))
        .innerJoin(qalSection, eq(qalPOC.sectionId, qalSection.id))
        .where(eq(qalPOC.surveyId, input.surveyId))
        .orderBy(asc(qalSection.sortOrder), asc(qalQuestion.sortOrder));
    }),


  upsertPOC: protectedProcedure
  .input(
    z.object({
      id: z.number().int().positive(),            // ✅ require id
      surveyId: z.number().int().positive(),
      questionId: z.number().int().positive(),
      sectionId: z.number().int().positive(),
      pocText: z.string().min(1),
      complianceDate: z.date().nullable().optional(),
    })
  )
  .mutation(async ({ ctx, input }) => {
    const complianceDate =
      input.complianceDate
        ? input.complianceDate.toISOString().slice(0, 10)
        : null;

    const [updated] = await ctx.db
      .update(qalPOC)
      .set({
        pocText: input.pocText,
        complianceDate,
        updatedAt: new Date(),
      })
      .where(eq(qalPOC.id, input.id))
      .returning();

    return updated;
  }),



  listPocComments: protectedProcedure
    .input(z.object({ pocId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select()
        .from(qalPocComment)
        .where(eq(qalPocComment.pocId, input.pocId))
        .orderBy(asc(qalPocComment.createdAt));
    }),


  addPocComment: protectedProcedure
    .input(
      z.object({
        pocId: z.number().int().positive(),
        surveyId: z.number().int().positive(),
        commentText: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [inserted] = await ctx.db
        .insert(qalPocComment)
        .values({
          pocId: input.pocId,
          surveyId: input.surveyId,
          commentText: input.commentText,
          authorId: ctx.session.user.id,
        })
        .returning();

      return inserted;
    }),

    // In your QAL router file
addSection: protectedProcedure
  .input(
    z.object({
      templateId: z.number(),
      title: z.string(),
      description: z.string().optional(),
      possiblePoints: z.number(),
      sortOrder: z.number(),
    })
  )
  .mutation(async ({ ctx, input }) => {
    const [section] = await ctx.db
      .insert(qalSection)
      .values({
        templateId: input.templateId,
        title: input.title,
        description: input.description,
        possiblePoints: input.possiblePoints,
        sortOrder: input.sortOrder,
      })
      .returning();
    return section;
  }),    
  addQuestion: protectedProcedure
  .input(
    z.object({
      sectionId: z.number(),
      prompt: z.string(),
      guidance: z.string().optional(),
      fixedSample: z.number(),
      possiblePoints: z.number(),
      sortOrder: z.number(),
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


  // Check if template is used anywhere
checkTemplateUsage: protectedProcedure
  .input(z.object({ templateId: z.number().int().positive() }))
  .query(async ({ ctx, input }) => {
    const surveys = await ctx.db
      .select()
      .from(qalSurvey)
      .where(eq(qalSurvey.templateId, input.templateId))
      .limit(1);

    const pocDocs = await ctx.db
      .select()
      .from(qalPOC)
      .innerJoin(qalSection, eq(qalPOC.sectionId, qalSection.id))
      .where(eq(qalSection.templateId, input.templateId))
      .limit(1);

    return { isUsed: surveys.length > 0 || pocDocs.length > 0 };
  }),

// Safe delete template
deleteTemplate: protectedProcedure
  .input(z.object({ id: z.number().int().positive() }))
  .mutation(async ({ ctx, input }) => {
    const surveys = await ctx.db
      .select()
      .from(qalSurvey)
      .where(eq(qalSurvey.templateId, input.id))
      .limit(1);

    if (surveys.length > 0) {
      throw new Error("Cannot delete template: it is used by surveys");
    }

    await ctx.db.delete(qalTemplate).where(eq(qalTemplate.id, input.id));
    return { success: true };
  }),

// Check if section is used in surveys/POCs
checkSectionUsage: protectedProcedure
  .input(z.object({ sectionId: z.number().int().positive() }))
  .query(async ({ ctx, input }) => {
    const surveySections = await ctx.db
      .select()
      .from(qalSurveySection)
      .where(eq(qalSurveySection.sectionId, input.sectionId))
      .limit(1);

    const pocs = await ctx.db
      .select()
      .from(qalPOC)
      .where(eq(qalPOC.sectionId, input.sectionId))
      .limit(1);

    return { isUsed: surveySections.length > 0 || pocs.length > 0 };
  }),

// Safe delete section
deleteSection: protectedProcedure
  .input(z.object({ id: z.number().int().positive() }))
  .mutation(async ({ ctx, input }) => {
    const surveySections = await ctx.db
      .select()
      .from(qalSurveySection)
      .where(eq(qalSurveySection.sectionId, input.id))
      .limit(1);

    const pocs = await ctx.db
      .select()
      .from(qalPOC)
      .where(eq(qalPOC.sectionId, input.id))
      .limit(1);

    if (surveySections.length > 0 || pocs.length > 0) {
      throw new Error("Cannot delete section: it is used in surveys or POCs");
    }

    await ctx.db.delete(qalSection).where(eq(qalSection.id, input.id));
    return { success: true };
  }),




});



// ======= existing helper functions unchanged =======

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

  const allNA =
    responses.length > 0 &&
    responses.every((r: { isNotApplicable: any }) => r.isNotApplicable);

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
  const [survey] = await ctx.db
    .select()
    .from(qalSurvey)
    .where(eq(qalSurvey.id, surveyId))
    .limit(1);

  if (!survey) return;

  const sections = await ctx.db
    .select()
    .from(qalSection)
    .where(eq(qalSection.templateId, survey.templateId));

  let totalPossible = 0;
  let totalEarned = 0;

  for (const sec of sections) {
    const questions = await ctx.db
      .select()
      .from(qalQuestion)
      .where(eq(qalQuestion.sectionId, sec.id));

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

    let sectionAdjustedPossible = 0;
    let sectionEarned = 0;

    for (const q of questions) {
      const qResponse = questionResponses.find((r: any) => r.questionId === q.id);
      
      const questionPossiblePoints = Number(q.possiblePoints || 0);
      
      if (qResponse && qResponse.isNotApplicable) {
        continue;
      }
      
      sectionAdjustedPossible += questionPossiblePoints;
      
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
