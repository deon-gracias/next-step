import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import {
    dietarySurvey,
    dietaryTemplate,
    dietarySurveyResponse,
    facility,
    dietarySection,
    dietaryQuestion
} from "@/server/db/schema";
import { eq, and, desc, sql, ilike } from "drizzle-orm";

export const dietaryRouter = createTRPCRouter({
    // List all surveys
    list: protectedProcedure
        .input(
            z.object({
                facilityId: z.number().optional(),
                page: z.number().default(1),
                pageSize: z.number().default(100),
            })
        )
        .query(async ({ ctx, input }) => {
            const { facilityId, page, pageSize } = input;

            const orgId = ctx.session.session.activeOrganizationId;
            if (!orgId) {
                throw new Error("No active organization");
            }

            const where = facilityId
                ? and(
                    eq(dietarySurvey.facilityId, facilityId),
                    eq(dietarySurvey.organizationId, orgId)
                )
                : eq(dietarySurvey.organizationId, orgId);

            const surveys = await ctx.db.query.dietarySurvey.findMany({
                where,
                limit: pageSize,
                offset: (page - 1) * pageSize,
                orderBy: [desc(dietarySurvey.surveyDate)],
                with: {
                    facility: true,
                    template: true,
                    surveyor: true,
                },
            });

            return surveys;
        }),

    // Create a new survey
    create: protectedProcedure
        .input(
            z.object({
                facilityId: z.number(),
                templateId: z.number(),
                surveyDate: z.date(),
                surveyorId: z.string().optional(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const orgId = ctx.session.session.activeOrganizationId;
            if (!orgId) {
                throw new Error("No active organization");
            }

            const [survey] = await ctx.db
                .insert(dietarySurvey)
                .values({
                    organizationId: orgId,
                    facilityId: input.facilityId,
                    templateId: input.templateId,
                    surveyDate: input.surveyDate.toISOString(),
                    surveyorId: input.surveyorId || ctx.session.user.id,
                    isLocked: false,
                    totalScore: "0",
                    possibleScore: "0",
                    compliancePercentage: "0",
                    createdAt: new Date(),
                    updatedAt: new Date(),
                })
                .returning();

            return survey;
        }),

    // Get survey by ID with full template structure
    getById: protectedProcedure
        .input(z.object({ id: z.number() }))
        .query(async ({ ctx, input }) => {
            const orgId = ctx.session.session.activeOrganizationId;
            if (!orgId) {
                throw new Error("No active organization");
            }

            const survey = await ctx.db.query.dietarySurvey.findFirst({
                where: and(
                    eq(dietarySurvey.id, input.id),
                    eq(dietarySurvey.organizationId, orgId)
                ),
                with: {
                    facility: true,
                    template: {
                        with: {
                            sections: {
                                with: {
                                    questions: {
                                        orderBy: (questions, { asc }) => [asc(questions.sortOrder)],
                                    },
                                },
                                orderBy: (sections, { asc }) => [asc(sections.sortOrder)],
                            },
                        },
                    },
                    surveyor: true,
                    responses: true, // Get existing responses
                },
            });

            return survey;
        }),

    // Update answer for a question
    updateAnswer: protectedProcedure
        .input(
            z.object({
                surveyId: z.number(),
                questionId: z.number(),
                status: z.enum(["met", "unmet", "na"]),
                comments: z.string().optional(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const orgId = ctx.session.session.activeOrganizationId;
            if (!orgId) {
                throw new Error("No active organization");
            }

            // Check if response already exists
            const existing = await ctx.db.query.dietarySurveyResponse.findFirst({
                where: and(
                    eq(dietarySurveyResponse.surveyId, input.surveyId),
                    eq(dietarySurveyResponse.questionId, input.questionId)
                ),
            });

            if (existing) {
                // Update existing response
                await ctx.db
                    .update(dietarySurveyResponse)
                    .set({
                        status: input.status,
                        comments: input.comments || null,
                        createdAt: new Date(),
                    })
                    .where(eq(dietarySurveyResponse.id, existing.id));
            } else {
                // Insert new response
                await ctx.db.insert(dietarySurveyResponse).values({
                    surveyId: input.surveyId,
                    questionId: input.questionId,
                    status: input.status,
                    comments: input.comments || null,
                    createdAt: new Date(),
                });
            }

            return { success: true };
        }),

    // Lock survey
    lock: protectedProcedure
        .input(z.object({ surveyId: z.number() }))
        .mutation(async ({ ctx, input }) => {
            const orgId = ctx.session.session.activeOrganizationId;
            if (!orgId) {
                throw new Error("No active organization");
            }

            await ctx.db
                .update(dietarySurvey)
                .set({
                    isLocked: true,
                    updatedAt: new Date(),
                })
                .where(
                    and(
                        eq(dietarySurvey.id, input.surveyId),
                        eq(dietarySurvey.organizationId, orgId)
                    )
                );

            return { success: true };
        }),

    // Unlock survey
    unlock: protectedProcedure
        .input(z.object({ surveyId: z.number() }))
        .mutation(async ({ ctx, input }) => {
            const orgId = ctx.session.session.activeOrganizationId;
            if (!orgId) {
                throw new Error("No active organization");
            }

            await ctx.db
                .update(dietarySurvey)
                .set({
                    isLocked: false,
                    updatedAt: new Date(),
                })
                .where(
                    and(
                        eq(dietarySurvey.id, input.surveyId),
                        eq(dietarySurvey.organizationId, orgId)
                    )
                );

            return { success: true };
        }),

    // Delete survey
    delete: protectedProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ ctx, input }) => {
            const orgId = ctx.session.session.activeOrganizationId;
            if (!orgId) {
                throw new Error("No active organization");
            }

            await ctx.db
                .delete(dietarySurvey)
                .where(
                    and(
                        eq(dietarySurvey.id, input.id),
                        eq(dietarySurvey.organizationId, orgId)
                    )
                );
            return { success: true };
        }),

    listTemplates: protectedProcedure
        .input(
            z.object({
                page: z.number().min(1).default(1),
                pageSize: z.number().min(1).max(100).default(10),
                search: z.string().optional(),
            })
        )
        .query(async ({ ctx, input }) => {
            const { page, pageSize, search } = input;
            const offset = (page - 1) * pageSize;

            const data = await ctx.db
                .select({
                    id: dietaryTemplate.id,
                    name: dietaryTemplate.name,
                    machineType: dietaryTemplate.machineType,
                    totalPoints: sql<number>`
          COALESCE(
            (SELECT SUM(dietary_question.points)
             FROM dietary_section
             INNER JOIN dietary_question ON dietary_question.section_id = dietary_section.id
             WHERE dietary_section.template_id = dietary_template.id),
            0
          )
        `.as("totalPoints"),
                })
                .from(dietaryTemplate)
                .where(search ? ilike(dietaryTemplate.name, `%${search}%`) : undefined)
                .limit(pageSize)
                .offset(offset)
                .orderBy(desc(dietaryTemplate.createdAt));

            const totalCount = await ctx.db
                .select({ count: sql<number>`count(*)` })
                .from(dietaryTemplate)
                .where(search ? ilike(dietaryTemplate.name, `%${search}%`) : undefined);

            return {
                data,
                totalPages: Math.ceil((totalCount[0]?.count ?? 0) / pageSize),
                totalCount: totalCount[0]?.count ?? 0,
            };
        }),

    // Get template with sections and questions
getTemplate: protectedProcedure
  .input(z.object({ id: z.number() }))
  .query(async ({ ctx, input }) => {
    const template = await ctx.db
      .select()
      .from(dietaryTemplate)
      .where(eq(dietaryTemplate.id, input.id))
      .limit(1);

    if (!template[0]) {
      throw new Error("Template not found");
    }

    const sections = await ctx.db
      .select()
      .from(dietarySection)
      .where(eq(dietarySection.templateId, input.id))
      .orderBy(dietarySection.sortOrder);

    const sectionsWithQuestions = await Promise.all(
      sections.map(async (section) => {
        const questions = await ctx.db
          .select()
          .from(dietaryQuestion)
          .where(eq(dietaryQuestion.sectionId, section.id))
          .orderBy(dietaryQuestion.sortOrder);

        return {
          ...section,
          questions,
        };
      })
    );

    return {
      ...template[0],
      sections: sectionsWithQuestions,
    };
  }),

// Get section with questions
getSection: protectedProcedure
  .input(z.object({ id: z.number() }))
  .query(async ({ ctx, input }) => {
    const section = await ctx.db
      .select()
      .from(dietarySection)
      .where(eq(dietarySection.id, input.id))
      .limit(1);

    if (!section[0]) {
      throw new Error("Section not found");
    }

    const questions = await ctx.db
      .select()
      .from(dietaryQuestion)
      .where(eq(dietaryQuestion.sectionId, input.id))
      .orderBy(dietaryQuestion.sortOrder);

    return {
      ...section[0],
      questions,
    };
  }),

// Create section
createSection: protectedProcedure
  .input(
    z.object({
      templateId: z.number(),
      sectionNumber: z.number(),
      title: z.string().min(1),
      maxPoints: z.number(),
      sortOrder: z.number(),
    })
  )
  .mutation(async ({ ctx, input }) => {
    const section = await ctx.db
      .insert(dietarySection)
      .values({
        templateId: input.templateId,
        sectionNumber: input.sectionNumber,
        title: input.title,
        maxPoints: input.maxPoints,
        sortOrder: input.sortOrder,
      })
      .returning();

    return section[0];
  }),

// Update section
updateSection: protectedProcedure
  .input(
    z.object({
      id: z.number(),
      sectionNumber: z.number().optional(),
      title: z.string().min(1).optional(),
      maxPoints: z.number().optional(),
      sortOrder: z.number().optional(),
    })
  )
  .mutation(async ({ ctx, input }) => {
    const { id, ...updates } = input;

    const updated = await ctx.db
      .update(dietarySection)
      .set(updates)
      .where(eq(dietarySection.id, id))
      .returning();

    return updated[0];
  }),

// Delete section
deleteSection: protectedProcedure
  .input(z.object({ id: z.number() }))
  .mutation(async ({ ctx, input }) => {
    await ctx.db.delete(dietarySection).where(eq(dietarySection.id, input.id));
  }),

// Create question
createQuestion: protectedProcedure
  .input(
    z.object({
      sectionId: z.number(),
      questionLetter: z.string().min(1),
      questionText: z.string().min(1),
      points: z.number(),
      sortOrder: z.number(),
    })
  )
  .mutation(async ({ ctx, input }) => {
    const question = await ctx.db
      .insert(dietaryQuestion)
      .values({
        sectionId: input.sectionId,
        questionLetter: input.questionLetter,
        questionText: input.questionText,
        points: input.points,
        sortOrder: input.sortOrder,
      })
      .returning();

    return question[0];
  }),

// Update question
updateQuestion: protectedProcedure
  .input(
    z.object({
      id: z.number(),
      questionLetter: z.string().min(1).optional(),
      questionText: z.string().min(1).optional(),
      points: z.number().optional(),
      sortOrder: z.number().optional(),
    })
  )
  .mutation(async ({ ctx, input }) => {
    const { id, ...updates } = input;

    const updated = await ctx.db
      .update(dietaryQuestion)
      .set(updates)
      .where(eq(dietaryQuestion.id, id))
      .returning();

    return updated[0];
  }),

// Delete question
deleteQuestion: protectedProcedure
  .input(z.object({ id: z.number() }))
  .mutation(async ({ ctx, input }) => {
    await ctx.db.delete(dietaryQuestion).where(eq(dietaryQuestion.id, input.id));
  }),





    // Delete template
    deleteTemplate: protectedProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ ctx, input }) => {
            await ctx.db.delete(dietaryTemplate).where(eq(dietaryTemplate.id, input.id));
        }),
});
