// server/api/routers/survey.ts
import { z } from "zod";
import {
  survey,
  surveySelectSchema,
  surveyResponse,
  surveyResident,
  template,
  surveyResponseSelectSchema,
  user,
  facility,
  surveyCases,
  surveyPOC,
  question,
  surveyDOC,
  resident,
} from "@/server/db/schema";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { getAllowedFacilities } from "./user";
import {
  eq,
  and,
  inArray,
  sql,
  getTableColumns,
  asc,
  desc,
  isNull,
  or,
  count,
} from "drizzle-orm";
import {
  paginationInputSchema,
  surveyCreateInputSchema,
} from "@/server/utils/schema";
import { TRPCError } from "@trpc/server";

const saveGeneralResponsesInput = z.object({
  surveyId: z.number().int().positive(),
  responses: z.array(
    z.object({
      questionId: z.number().int().positive(),
      requirementsMetOrUnmet: z.enum(["met", "unmet", "not_applicable"]),
      findings: z.string().optional().nullable(),
    }),
  ),
});

const saveResponsesInput = z.object({
  surveyId: z.number().int().positive(),
  residentId: z.number().int().positive().optional(),
  surveyCaseId: z.number().int().positive().optional(),
  responses: z.array(
    z.object({
      questionId: z.number().int().positive(),
      requirementsMetOrUnmet: z.enum(["met", "unmet", "not_applicable"]),
      findings: z.string().optional().nullable(),
    }),
  ),
});

export const surveyRouter = createTRPCRouter({
  create: protectedProcedure
    .input(surveyCreateInputSchema)
    .mutation(async ({ input, ctx }) => {
      const { residentIds: residents, caseCodes: cases, ...surveyData } = input;
      const [newSurvey] = await ctx.db
        .insert(survey)
        .values(surveyData)
        .returning();
      if (!newSurvey) throw Error("Failed to create survey");

      if (residents.length > 0) {
        await ctx.db.insert(surveyResident).values(
          residents.map((residentId) => ({
            surveyId: newSurvey.id,
            residentId,
          })),
        );
      }

      if (cases.length > 0) {
        await ctx.db.insert(surveyCases).values(
          cases.map((caseCode) => ({
            surveyId: newSurvey.id,
            caseCode,
          })),
        );
      }

      return newSurvey;
    }),

  delete: protectedProcedure
    .input(z.object({ id: surveySelectSchema.shape.id }))
    .mutation(async ({ ctx, input }) => {
      // Delete all related records first to avoid foreign key constraint violations

      // 1. Delete survey responses
      await ctx.db
        .delete(surveyResponse)
        .where(eq(surveyResponse.surveyId, input.id));

      // 2. Delete survey residents
      await ctx.db
        .delete(surveyResident)
        .where(eq(surveyResident.surveyId, input.id));

      // 3. Delete survey cases
      await ctx.db
        .delete(surveyCases)
        .where(eq(surveyCases.surveyId, input.id));

      // 4. Delete survey POCs
      await ctx.db.delete(surveyPOC).where(eq(surveyPOC.surveyId, input.id));

      // 5. Delete survey DOCs
      await ctx.db.delete(surveyDOC).where(eq(surveyDOC.surveyId, input.id));

      // 6. Finally delete the survey itself
      await ctx.db.delete(survey).where(eq(survey.id, input.id));

      return { success: true, deletedSurveyId: input.id };
    }),

  // ✅ Simplified: Just upsert without complex where clauses
  createGeneralResponse: protectedProcedure
    .input(saveGeneralResponsesInput)
    .mutation(async ({ ctx, input }) => {
      const { surveyId, responses } = input;

      // Insert responses with NULL for both residentId and surveyCaseId
      const values = responses.map((r) => ({
        surveyId,
        residentId: null,
        surveyCaseId: null,
        questionId: r.questionId,
        requirementsMetOrUnmet: r.requirementsMetOrUnmet,
        findings: r.findings ?? null,
      }));

      // ✅ Simplified: Use basic conflict resolution
      for (const value of values) {
        await ctx.db
          .insert(surveyResponse)
          .values([value])
          .onConflictDoUpdate({
            target: [surveyResponse.surveyId, surveyResponse.questionId],
            set: {
              requirementsMetOrUnmet: sql`excluded.requirements_met_or_unmet`,
              findings: sql`excluded.findings`,
            },
          });
      }

      return { success: true, responseType: "general" };
    }),

  byId: protectedProcedure
    .input(z.object({ id: surveySelectSchema.shape.id }))
    .query(async ({ ctx, input }) => {
      return (
        await ctx.db
          .select({
            ...getTableColumns(survey),
            template: getTableColumns(template),
          })
          .from(survey)
          .where(eq(survey.id, input.id))
          .leftJoin(template, eq(survey.templateId, template.id))
          .limit(1)
      )[0];
    }),

  scoreById: protectedProcedure
    .input(z.object({ id: surveySelectSchema.shape.id }))
    .query(async ({ ctx, input }) => {
      // 1. Fetch Survey metadata
      const surveyData = await ctx.db.query.survey.findFirst({
        where: eq(survey.id, input.id),
        columns: { templateId: true }, // We only need the templateId
      });

      if (!surveyData) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Survey not found" });
      }

      // 2. Run all heavy data fetching in parallel
      const [questions, residentCountArr, caseCountArr, rawResponses] =
        await Promise.all([
          // Fetch Questions (Points only)
          ctx.db
            .select({ id: question.id, points: question.points })
            .from(question)
            .where(eq(question.templateId, surveyData.templateId)),

          // Fetch Count of Residents
          ctx.db
            .select({ count: count() })
            .from(surveyResident)
            .where(eq(surveyResident.surveyId, input.id)),

          // Fetch Count of Cases
          ctx.db
            .select({ count: count() })
            .from(surveyCases)
            .where(eq(surveyCases.surveyId, input.id)),

          // Fetch Responses (Just status and questionId)
          ctx.db
            .select({
              questionId: surveyResponse.questionId,
              status: surveyResponse.requirementsMetOrUnmet,
            })
            .from(surveyResponse)
            .where(eq(surveyResponse.surveyId, input.id)),
        ]);

      // 3. Determine the "Expected Response Count" per question
      // If no residents/cases, it's a "General" survey (1 response expected per question).
      // Otherwise, it's (Residents + Cases) responses expected per question.
      const totalResidents = residentCountArr[0]?.count ?? 0;
      const totalCases = caseCountArr[0]?.count ?? 0;
      const entityCount = totalResidents + totalCases;

      const requiredResponsesPerQuestion = entityCount === 0 ? 1 : entityCount;

      // 4. Group responses by Question ID for O(1) lookup
      // Map<QuestionID, Array<Status>>
      const responsesByQuestion = new Map<number, string[]>();

      for (const r of rawResponses) {
        const existing = responsesByQuestion.get(r.questionId) ?? [];
        // Only push non-null statuses (valid answers)
        if (r.status) existing.push(r.status);
        responsesByQuestion.set(r.questionId, existing);
      }

      // 5. Calculate Score
      let awarded = 0;
      let totalPossible = 0;

      for (const q of questions) {
        const points = q.points ?? 0;
        totalPossible += points;

        const answers = responsesByQuestion.get(q.id) ?? [];

        // CHECK 1: Completeness
        // Did everyone answer? (If fewer answers than entities, someone skipped it)
        if (answers.length < requiredResponsesPerQuestion) {
          continue; // Fail: Unanswered question
        }

        // CHECK 2: Quality
        // Did anyone mark it as "unmet"?
        const hasFailure = answers.includes("unmet");
        if (hasFailure) {
          continue; // Fail: Requirement unmet
        }

        // CHECK 3: Success Logic
        // If we are here: Everyone answered, and nobody failed.
        // (This covers the "Met || All NA" logic automatically)
        awarded += points;
      }

      return {
        score: awarded,
        totalPossible,
        percentage:
          totalPossible > 0 ? Math.round((awarded / totalPossible) * 100) : 0,
      };
    }),

  list: protectedProcedure
    .input(
      z.object({
        ...surveySelectSchema.partial().shape,
        facilityId: z.array(z.number()).optional(),
        templateId: z.array(z.number()).optional(),
        surveyorId: z.array(z.string()).optional(),
        ...paginationInputSchema.shape,
      }),
    )
    .query(async ({ ctx, input }) => {
      const allowedFacilities = await getAllowedFacilities(ctx);

      const offset = (input.page - 1) * input.pageSize;

      const conditions = [];
      if (input.id !== undefined) conditions.push(eq(survey.id, input.id));

      if (input.surveyDate !== undefined)
        conditions.push(eq(survey.surveyDate, input.surveyDate));

      if (input.surveyorId !== undefined)
        conditions.push(inArray(survey.surveyorId, input.surveyorId));

      if (input.facilityId !== undefined)
        conditions.push(inArray(survey.facilityId, input.facilityId));

      if (input.templateId !== undefined)
        conditions.push(inArray(survey.templateId, input.templateId));

      const statusConditions = [];
      if (input.pocGenerated !== undefined)
        statusConditions.push(eq(survey.pocGenerated, input.pocGenerated));
      if (input.isLocked !== undefined)
        statusConditions.push(eq(survey.isLocked, input.isLocked));

      conditions.push(or(...statusConditions));

      if (input.surveyorId && input.surveyorId.length > 0)
        conditions.push(inArray(survey.surveyorId, input.surveyorId));

      const allowedFacilityIds = allowedFacilities.map((f) => f.id);
      if (allowedFacilityIds.length > 0)
        conditions.push(inArray(survey.facilityId, allowedFacilityIds));

      const whereClause = and(...conditions);

      const [totalResult] = await ctx.db
        .select({ count: count() })
        .from(survey)
        .where(whereClause);

      const total = totalResult?.count ?? 0;

      const data = await ctx.db
        .select({
          ...getTableColumns(survey),
          surveyor: getTableColumns(user),
          facility: getTableColumns(facility),
          template: getTableColumns(template),
        })
        .from(survey)
        .where(whereClause)
        .leftJoin(user, eq(survey.surveyorId, user.id))
        .leftJoin(facility, eq(survey.facilityId, facility.id))
        .leftJoin(template, eq(survey.templateId, template.id))
        .orderBy(desc(survey.surveyDate))
        .limit(input.pageSize)
        .offset(offset);

      return {
        data,
        meta: { total, pageCount: Math.ceil(total / input.pageSize) },
      };
    }),

  listResidents: protectedProcedure
    .input(z.object({ surveyId: z.number() }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select({
          // Survey resident fields
          id: surveyResident.id,
          surveyId: surveyResident.surveyId,
          residentId: surveyResident.residentId,
          createdAt: surveyResident.createdAt,
          name: resident.name,
          roomId: resident.roomId,
          pcciId: resident.pcciId,
          facilityId: resident.facilityId,
        })
        .from(surveyResident)
        .innerJoin(resident, eq(surveyResident.residentId, resident.id))
        .where(eq(surveyResident.surveyId, input.surveyId));
    }),

  listCases: protectedProcedure
    .input(z.object({ surveyId: z.number() }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select()
        .from(surveyCases)
        .where(eq(surveyCases.surveyId, input.surveyId));
    }),

  pendingSurveys: protectedProcedure
    .input(
      z.object({
        ...surveySelectSchema.partial().shape,
        ...paginationInputSchema.shape,
      }),
    )
    .query(async ({ ctx, input }) => {
      const { page, pageSize, templateId, facilityId, surveyorId } = input;
      const offset = (page - 1) * pageSize;

      const whereConditions = [];
      if (surveyorId !== undefined)
        whereConditions.push(eq(survey.surveyorId, surveyorId));
      if (templateId !== undefined)
        whereConditions.push(eq(survey.templateId, templateId));
      if (facilityId !== undefined)
        whereConditions.push(eq(survey.facilityId, facilityId));

      const rows = await ctx.db
        .select({
          ...getTableColumns(survey),
          surveyor: getTableColumns(user),
          facility: getTableColumns(facility),
          template: getTableColumns(template),
        })
        .from(survey)
        .where(and(...whereConditions))
        .leftJoin(user, eq(survey.surveyorId, user.id))
        .leftJoin(facility, eq(survey.facilityId, facility.id))
        .leftJoin(template, eq(survey.templateId, template.id))
        .orderBy(desc(survey.surveyDate), asc(survey.id))
        .limit(pageSize)
        .offset(offset);

      return rows;
    }),

  markPocGenerated: protectedProcedure
    .input(z.object({ surveyId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(survey)
        .set({ pocGenerated: true })
        .where(eq(survey.id, input.surveyId))
        .returning();

      if (!updated) throw new Error("Survey not found");
      return updated;
    }),

  getSurveyCaseById: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const row = await ctx.db
        .select()
        .from(surveyCases)
        .where(eq(surveyCases.id, input.id))
        .limit(1);
      return row[0] ?? null;
    }),

  checkCompletion: protectedProcedure
    .input(z.object({ surveyId: z.number() }))
    .query(async ({ ctx, input }) => {
      // Get the survey and its template
      const surveyData = await ctx.db
        .select({
          id: survey.id,
          templateId: survey.templateId,
        })
        .from(survey)
        .where(eq(survey.id, input.surveyId))
        .limit(1);

      if (!surveyData[0]) throw new Error("Survey not found");

      // Get all residents for this survey
      const residents = await ctx.db
        .select()
        .from(surveyResident)
        .where(eq(surveyResident.surveyId, input.surveyId));

      // Get all cases for this survey
      const cases = await ctx.db
        .select()
        .from(surveyCases)
        .where(eq(surveyCases.surveyId, input.surveyId));

      // Get all questions for this template
      const questions = await ctx.db
        .select()
        .from(question)
        .where(eq(question.templateId, surveyData[0].templateId));

      // Get all responses for this survey that have valid statuses
      const responses = await ctx.db
        .select()
        .from(surveyResponse)
        .where(
          and(
            eq(surveyResponse.surveyId, input.surveyId),
            inArray(surveyResponse.requirementsMetOrUnmet, [
              "met",
              "unmet",
              "not_applicable",
            ]),
          ),
        );

      const totalRequired =
        (residents.length + cases.length) * questions.length;
      const totalAnswered = responses.length;
      const isComplete = totalAnswered === totalRequired && totalRequired > 0;

      return {
        totalRequired,
        totalAnswered,
        isComplete,
        residents: residents.length,
        cases: cases.length,
        questions: questions.length,
        completionPercentage:
          totalRequired > 0
            ? Math.round((totalAnswered / totalRequired) * 100)
            : 0,
      };
    }),

  // ✅ SUPER SIMPLIFIED: Let the database constraints handle uniqueness
  createResponse: protectedProcedure
    .input(saveResponsesInput)
    .mutation(async ({ ctx, input }) => {
      const { surveyId, residentId, surveyCaseId } = input;
      const qids = input.responses.map((r) => r.questionId);

      // 1) Load existing statuses for these questions (for POC deletion logic)
      let existing;
      if (residentId) {
        existing = await ctx.db
          .select({
            questionId: surveyResponse.questionId,
            status: surveyResponse.requirementsMetOrUnmet,
          })
          .from(surveyResponse)
          .where(
            and(
              eq(surveyResponse.surveyId, surveyId),
              eq(surveyResponse.residentId, residentId),
              inArray(surveyResponse.questionId, qids),
            ),
          );
      } else if (surveyCaseId) {
        existing = await ctx.db
          .select({
            questionId: surveyResponse.questionId,
            status: surveyResponse.requirementsMetOrUnmet,
          })
          .from(surveyResponse)
          .where(
            and(
              eq(surveyResponse.surveyId, surveyId),
              eq(surveyResponse.surveyCaseId, surveyCaseId),
              inArray(surveyResponse.questionId, qids),
            ),
          );
      }
      // ✅ ADD: Handle general surveys
      else {
        existing = await ctx.db
          .select({
            questionId: surveyResponse.questionId,
            status: surveyResponse.requirementsMetOrUnmet,
          })
          .from(surveyResponse)
          .where(
            and(
              eq(surveyResponse.surveyId, surveyId),
              isNull(surveyResponse.residentId),
              isNull(surveyResponse.surveyCaseId),
              inArray(surveyResponse.questionId, qids),
            ),
          );
      }

      const beforeMap = new Map<number, "met" | "unmet" | "not_applicable">(
        existing?.map((r) => [r.questionId, r.status as any]) || [],
      );

      // 2) ✅ FIXED: Create the values and handle all three cases
      const values = input.responses.map((r) => ({
        surveyId,
        residentId: residentId || null,
        surveyCaseId: surveyCaseId || null,
        questionId: r.questionId,
        requirementsMetOrUnmet: r.requirementsMetOrUnmet,
        findings: r.findings ?? null,
      }));

      // ✅ FIXED: Handle all three survey types
      for (const value of values) {
        if (residentId) {
          // Resident constraint
          await ctx.db
            .insert(surveyResponse)
            .values([value])
            .onConflictDoUpdate({
              target: [
                surveyResponse.surveyId,
                surveyResponse.residentId,
                surveyResponse.questionId,
              ],
              set: {
                requirementsMetOrUnmet: sql`excluded.requirements_met_or_unmet`,
                findings: sql`excluded.findings`,
              },
            });
        } else if (surveyCaseId) {
          // Case constraint
          await ctx.db
            .insert(surveyResponse)
            .values([value])
            .onConflictDoUpdate({
              target: [
                surveyResponse.surveyId,
                surveyResponse.surveyCaseId,
                surveyResponse.questionId,
              ],
              set: {
                requirementsMetOrUnmet: sql`excluded.requirements_met_or_unmet`,
                findings: sql`excluded.findings`,
              },
            });
        }
        // ✅ ADD: Handle general surveys (neither residentId nor surveyCaseId)
        else {
          // Check if general response exists
          const existingGeneral = await ctx.db
            .select()
            .from(surveyResponse)
            .where(
              and(
                eq(surveyResponse.surveyId, surveyId),
                eq(surveyResponse.questionId, value.questionId),
                isNull(surveyResponse.residentId),
                isNull(surveyResponse.surveyCaseId),
              ),
            )
            .limit(1);

          if (existingGeneral.length > 0) {
            // Update existing general response
            await ctx.db
              .update(surveyResponse)
              .set({
                requirementsMetOrUnmet: value.requirementsMetOrUnmet,
                findings: value.findings,
              })
              .where(
                and(
                  eq(surveyResponse.surveyId, surveyId),
                  eq(surveyResponse.questionId, value.questionId),
                  isNull(surveyResponse.residentId),
                  isNull(surveyResponse.surveyCaseId),
                ),
              );
          } else {
            // Insert new general response
            await ctx.db.insert(surveyResponse).values([value]);
          }
        }
      }

      // 3) Handle POC deletion (only for resident responses)
      let transitionedToMet: number[] = [];
      if (residentId) {
        for (const r of input.responses) {
          const before = beforeMap.get(r.questionId);
          if (before === "unmet" && r.requirementsMetOrUnmet === "met") {
            transitionedToMet.push(r.questionId);
          }
        }

        if (transitionedToMet.length > 0) {
          await ctx.db
            .delete(surveyPOC)
            .where(
              and(
                eq(surveyPOC.surveyId, surveyId),
                eq(surveyPOC.residentId, residentId),
                inArray(surveyPOC.questionId, transitionedToMet),
              ),
            );
        }
      }

      return {
        success: true,
        deletedPOCsForQuestions: transitionedToMet,
        responseType: residentId
          ? "resident"
          : surveyCaseId
            ? "case"
            : "general",
      };
    }),

  listResponses: protectedProcedure
    .input(
      surveyResponseSelectSchema
        .pick({
          surveyId: true,
          residentId: true,
          surveyCaseId: true,
          questionId: true,
        })
        .partial(),
    )
    .query(async ({ ctx, input }) => {
      const whereConditions: any[] = [];

      if (input.surveyId !== undefined) {
        whereConditions.push(eq(surveyResponse.surveyId, input.surveyId));
      }

      if (input.residentId !== undefined) {
        if (input.residentId === null) {
          whereConditions.push(isNull(surveyResponse.residentId));
        } else {
          whereConditions.push(eq(surveyResponse.residentId, input.residentId));
        }
      }

      if (input.surveyCaseId !== undefined) {
        if (input.surveyCaseId === null) {
          whereConditions.push(isNull(surveyResponse.surveyCaseId));
        } else {
          whereConditions.push(
            eq(surveyResponse.surveyCaseId, input.surveyCaseId),
          );
        }
      }

      if (input.questionId !== undefined) {
        whereConditions.push(eq(surveyResponse.questionId, input.questionId));
      }

      return await ctx.db
        .select()
        .from(surveyResponse)
        .where(whereConditions.length ? and(...whereConditions) : undefined);
    }),

  lock: protectedProcedure
    .input(z.object({ surveyId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(survey)
        .set({ isLocked: true })
        .where(eq(survey.id, input.surveyId))
        .returning();
      if (!updated) throw new Error("Survey not found");
      return updated;
    }),

  unlock: protectedProcedure
    .input(z.object({ surveyId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(survey)
        .set({ isLocked: false })
        .where(eq(survey.id, input.surveyId))
        .returning();
      if (!updated) throw new Error("Survey not found");
      return updated;
    }),
  // Add to survey router
  updateSurveyor: protectedProcedure
    .input(
      z.object({
        surveyId: z.number().int().positive(),
        surveyorId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(survey)
        .set({ surveyorId: input.surveyorId })
        .where(eq(survey.id, input.surveyId))
        .returning();
      if (!updated) throw new Error("Survey not found");
      return updated;
    }),

  addResident: protectedProcedure
    .input(
      z.object({
        surveyId: z.number().int().positive(),
        residentId: z.number().int().positive(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Check if already exists
      const existing = await ctx.db
        .select()
        .from(surveyResident)
        .where(
          and(
            eq(surveyResident.surveyId, input.surveyId),
            eq(surveyResident.residentId, input.residentId),
          ),
        )
        .limit(1);

      if (existing.length > 0) {
        throw new Error("Resident already added to this survey");
      }

      // ✅ Delete ALL POCs for this survey
      await ctx.db
        .delete(surveyPOC)
        .where(eq(surveyPOC.surveyId, input.surveyId));

      // ✅ Set pocGenerated to false
      await ctx.db
        .update(survey)
        .set({ pocGenerated: false })
        .where(eq(survey.id, input.surveyId));

      // Add the resident
      const [added] = await ctx.db
        .insert(surveyResident)
        .values({
          surveyId: input.surveyId,
          residentId: input.residentId,
        })
        .returning();

      return added;
    }),

  removeResident: protectedProcedure
    .input(
      z.object({
        surveyId: z.number().int().positive(),
        residentId: z.number().int().positive(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Delete all responses for this resident first
      await ctx.db
        .delete(surveyResponse)
        .where(
          and(
            eq(surveyResponse.surveyId, input.surveyId),
            eq(surveyResponse.residentId, input.residentId),
          ),
        );

      // Delete POCs
      await ctx.db
        .delete(surveyPOC)
        .where(
          and(
            eq(surveyPOC.surveyId, input.surveyId),
            eq(surveyPOC.residentId, input.residentId),
          ),
        );

      // Delete DOCs
      await ctx.db
        .delete(surveyDOC)
        .where(
          and(
            eq(surveyDOC.surveyId, input.surveyId),
            eq(surveyDOC.residentId, input.residentId),
          ),
        );

      // Finally delete the survey resident link
      await ctx.db
        .delete(surveyResident)
        .where(
          and(
            eq(surveyResident.surveyId, input.surveyId),
            eq(surveyResident.residentId, input.residentId),
          ),
        );

      return { success: true };
    }),

  addCase: protectedProcedure
    .input(
      z.object({
        surveyId: z.number().int().positive(),
        caseCode: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Check if already exists
      const existing = await ctx.db
        .select()
        .from(surveyCases)
        .where(
          and(
            eq(surveyCases.surveyId, input.surveyId),
            eq(surveyCases.caseCode, input.caseCode),
          ),
        )
        .limit(1);

      if (existing.length > 0) {
        throw new Error("Case already added to this survey");
      }

      // ✅ Delete ALL POCs for this survey
      await ctx.db
        .delete(surveyPOC)
        .where(eq(surveyPOC.surveyId, input.surveyId));

      // ✅ Set pocGenerated to false
      await ctx.db
        .update(survey)
        .set({ pocGenerated: false })
        .where(eq(survey.id, input.surveyId));

      // Add the case
      const [added] = await ctx.db
        .insert(surveyCases)
        .values({
          surveyId: input.surveyId,
          caseCode: input.caseCode,
        })
        .returning();

      return added;
    }),

  removeCase: protectedProcedure
    .input(
      z.object({
        surveyId: z.number().int().positive(),
        caseId: z.number().int().positive(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Delete all responses for this case first
      await ctx.db
        .delete(surveyResponse)
        .where(
          and(
            eq(surveyResponse.surveyId, input.surveyId),
            eq(surveyResponse.surveyCaseId, input.caseId),
          ),
        );

      // Delete POCs
      await ctx.db
        .delete(surveyPOC)
        .where(
          and(
            eq(surveyPOC.surveyId, input.surveyId),
            eq(surveyPOC.surveyCaseId, input.caseId),
          ),
        );

      // Delete DOCs
      await ctx.db
        .delete(surveyDOC)
        .where(
          and(
            eq(surveyDOC.surveyId, input.surveyId),
            eq(surveyDOC.surveyCaseId, input.caseId),
          ),
        );

      // Finally delete the survey case link
      await ctx.db.delete(surveyCases).where(eq(surveyCases.id, input.caseId));

      return { success: true };
    }),
});
