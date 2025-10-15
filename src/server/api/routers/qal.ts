import { z } from "zod";
import { asc, desc, eq, inArray, and } from "drizzle-orm";
import {
  qalSurvey,
  qalSurveySection,
  qalQuestion,
  qalSection,
  qalTemplate,
  facility,
  toDbNumeric,
  qalSurveyQuestion,
} from "@/server/db/schema";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function computeSectionEarned(args: {
  possiblePoints: number;
  sampleCount: number;
  passedCount: number;
  notApplicable?: boolean | null;
}) {
  const possible = Number(args.possiblePoints) || 0;
  const tested = Math.max(0, Number(args.sampleCount) || 0);
  const passed = clamp(Number(args.passedCount) || 0, 0, tested);
  if (args.notApplicable || possible <= 0) return 0;
  if (tested <= 0) return 0;
  return (possible * passed) / tested;
}

function aggregateSurvey(rows: Array<{ possiblePoints: number; earnedPoints: number }>) {
  const totalPossible = rows.reduce((s, r) => s + (Number(r.possiblePoints) || 0), 0);
  const totalEarned = rows.reduce((s, r) => s + (Number(r.earnedPoints) || 0), 0);
  const overallPercent = totalPossible > 0 ? (100 * totalEarned) / totalPossible : 100;
  const band =
    overallPercent >= 90 ? "A" :
      overallPercent >= 80 ? "B" :
        overallPercent >= 70 ? "C" :
          overallPercent >= 60 ? "D" : "F";
  return { totalPossible, totalEarned, overallPercent, band };
}

export const qalRouter = createTRPCRouter({
  listFacilities: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.select().from(facility).orderBy(asc(facility.name));
  }),

  getActiveTemplate: protectedProcedure.query(async ({ ctx }) => {
    const [tpl] = await ctx.db.select().from(qalTemplate).where(eq(qalTemplate.isActive, true)).limit(1);
    if (!tpl) return null;
    const sections = await ctx.db
      .select()
      .from(qalSection)
      .where(eq(qalSection.templateId, tpl.id))
      .orderBy(asc(qalSection.sortOrder));
    return { ...tpl, sections };
  }),

  getSectionMasterQuestions: protectedProcedure
    .input(z.object({ sectionId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select()
        .from(qalQuestion)
        .where(eq(qalQuestion.sectionId, input.sectionId))
        .orderBy(asc(qalQuestion.sortOrder));
    }),

  listSurveys: protectedProcedure
    .input(z.object({
      page: z.number().int().min(1),
      pageSize: z.number().int().min(1).max(100),
      facilityId: z.number().int().positive().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const where = input.facilityId ? eq(qalSurvey.facilityId, input.facilityId) : undefined;
      const rows = await ctx.db
        .select()
        .from(qalSurvey)
        .where(where)
        .orderBy(desc(qalSurvey.id))
        .limit(input.pageSize);
      return rows;
    }),

  createSurvey: protectedProcedure
    .input(z.object({ facilityId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const [tpl] = await ctx.db.select().from(qalTemplate).where(eq(qalTemplate.isActive, true)).limit(1);
      if (!tpl) throw new Error("No active QAL template");

      const [sv] = await ctx.db.insert(qalSurvey).values({
        facilityId: input.facilityId,
        templateId: tpl.id,
        isLocked: false,
        totalPossible: toDbNumeric(0),
        totalEarned: toDbNumeric(0),
        overallPercent: toDbNumeric(0),
        gradeBand: null,
      }).returning();
      if (!sv) throw new Error("Failed to create survey");

      const sections = await ctx.db
        .select()
        .from(qalSection)
        .where(eq(qalSection.templateId, tpl.id))
        .orderBy(asc(qalSection.sortOrder));

      if (sections.length) {
        await ctx.db.insert(qalSurveySection).values(
          sections.map((s) => ({
            surveyId: sv.id,
            sectionId: s.id,
            sampleCount: 0,
            passedCount: 0,
            notApplicable: false,
            earnedPoints: toDbNumeric(0),
            sampleNotes: null,
            comments: null,
          })),
        );
      }
      return sv;
    }),

  getSurvey: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const [sv] = await ctx.db.select().from(qalSurvey).where(eq(qalSurvey.id, input.id)).limit(1);
      if (!sv) throw new Error("Survey not found");

      const rows = await ctx.db
        .select({
          id: qalSurveySection.id,
          surveyId: qalSurveySection.surveyId,
          sectionId: qalSurveySection.sectionId,
          sampleCount: qalSurveySection.sampleCount,
          passedCount: qalSurveySection.passedCount,
          notApplicable: qalSurveySection.notApplicable,
          earnedPoints: qalSurveySection.earnedPoints,
          sampleNotes: qalSurveySection.sampleNotes,
          comments: qalSurveySection.comments,
          section: {
            id: qalSection.id,
            title: qalSection.title,
            description: qalSection.description,
            possiblePoints: qalSection.possiblePoints,
            sortOrder: qalSection.sortOrder,
            templateId: qalSection.templateId,
          },
        })
        .from(qalSurveySection)
        .innerJoin(qalSection, eq(qalSurveySection.sectionId, qalSection.id))
        .where(eq(qalSurveySection.surveyId, sv.id))
        .orderBy(asc(qalSection.sortOrder));
      return { survey: sv, sections: rows };
    }),

  lock: protectedProcedure
    .input(z.object({ surveyId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db.update(qalSurvey)
        .set({ isLocked: true })
        .where(eq(qalSurvey.id, input.surveyId))
        .returning();
      return row;
    }),

  unlock: protectedProcedure
    .input(z.object({ surveyId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db.update(qalSurvey)
        .set({ isLocked: false })
        .where(eq(qalSurvey.id, input.surveyId))
        .returning();
      return row;
    }),

  getSectionQuestions: protectedProcedure
  .input(z.object({
    surveyId: z.number().int().positive(),
    sectionId: z.number().int().positive(),
  }))
  .query(async ({ ctx, input }) => {
    // Fetch questions for the section
    const qs = await ctx.db
      .select({
        id: qalQuestion.id,
        sectionId: qalQuestion.sectionId,
        prompt: qalQuestion.prompt,
        guidance: qalQuestion.guidance,
        sortOrder: qalQuestion.sortOrder,
        // left-join answer
        answerId: qalSurveyQuestion.id,
        answerResult: qalSurveyQuestion.result,
      })
      .from(qalQuestion)
      .leftJoin(
        qalSurveyQuestion,
        and(
          eq(qalSurveyQuestion.questionId, qalQuestion.id),
          eq(qalSurveyQuestion.surveyId, input.surveyId),
        ),
      )
      .where(eq(qalQuestion.sectionId, input.sectionId))
      .orderBy(asc(qalQuestion.sortOrder));

    // Normalize to { id, prompt, guidance, answer: { result } | null }
    return qs.map((r) => ({
      id: r.id,
      sectionId: r.sectionId,
      prompt: r.prompt,
      guidance: r.guidance,
      sortOrder: r.sortOrder,
      answer: r.answerId ? { result: r.answerResult } : null,
    }));
  }),


  saveQuestionAnswer: protectedProcedure
  .input(z.object({
    surveyId: z.number().int().positive(),
    questionId: z.number().int().positive(),
    result: z.enum(["pass", "fail", "na"]),
  }))
  .mutation(async ({ ctx, input }) => {
    // Ensure question exists, get its section
    const [qRow] = await ctx.db.select().from(qalQuestion).where(eq(qalQuestion.id, input.questionId)).limit(1);
    if (!qRow) throw new Error("Question not found");

    // Upsert the per-question answer
    // For Postgres with drizzle, emulate upsert: try update, if 0 rows updated then insert
    const updated = await ctx.db.update(qalSurveyQuestion)
      .set({ result: input.result })
      .where(and(
        eq(qalSurveyQuestion.surveyId, input.surveyId),
        eq(qalSurveyQuestion.questionId, input.questionId),
      ))
      .returning();

    if (updated.length === 0) {
      await ctx.db.insert(qalSurveyQuestion).values({
        surveyId: input.surveyId,
        questionId: input.questionId,
        result: input.result,
        notes: null,
      });
    }

    // Recompute section counts from answers for this section
    const answers = await ctx.db
      .select({ result: qalSurveyQuestion.result })
      .from(qalSurveyQuestion)
      .where(and(
        eq(qalSurveyQuestion.surveyId, input.surveyId),
        // only answers of questions in this section
        inArray(
          qalSurveyQuestion.questionId,
          (
            await ctx.db.select({ id: qalQuestion.id })
              .from(qalQuestion)
              .where(eq(qalQuestion.sectionId, qRow.sectionId))
          ).map(r => r.id)
        ),
      ));

    let sample = 0;
    let passed = 0;
    for (const a of answers) {
      if (a.result === "pass") { sample++; passed++; }
      else if (a.result === "fail") { sample++; }
    }

    // Compute earned by formula
    const [secMeta] = await ctx.db.select().from(qalSection).where(eq(qalSection.id, qRow.sectionId)).limit(1);
    const possible = Number(secMeta?.possiblePoints ?? 0);
    const earnedNum = (possible > 0 && sample > 0) ? (possible * (passed / sample)) : 0;

    // Update qal_survey_section row
    const [svSec] = await ctx.db
      .select()
      .from(qalSurveySection)
      .where(and(
        eq(qalSurveySection.surveyId, input.surveyId),
        eq(qalSurveySection.sectionId, qRow.sectionId),
      ))
      .limit(1);
    if (!svSec) throw new Error("Survey section not found");

    await ctx.db.update(qalSurveySection)
      .set({
        sampleCount: sample,
        passedCount: passed,
        earnedPoints: toDbNumeric(earnedNum),
      })
      .where(eq(qalSurveySection.id, svSec.id));

    // Recompute survey totals
    const secRows = await ctx.db
      .select()
      .from(qalSurveySection)
      .where(eq(qalSurveySection.surveyId, input.surveyId));

    const masters = await ctx.db
      .select()
      .from(qalSection)
      .where(inArray(qalSection.id, secRows.map((r) => r.sectionId)));

    const agg = secRows.reduce(
      (acc, r) => {
        const possiblePoints = Number(masters.find((m) => m.id === r.sectionId)?.possiblePoints ?? 0);
        const earned = Number(r.earnedPoints ?? 0);
        acc.totalPossible += possiblePoints;
        acc.totalEarned += earned;
        return acc;
      },
      { totalPossible: 0, totalEarned: 0 }
    );
    const overallPercent = agg.totalPossible > 0 ? (100 * agg.totalEarned) / agg.totalPossible : 100;
    const band =
      overallPercent >= 90 ? "A" :
      overallPercent >= 80 ? "B" :
      overallPercent >= 70 ? "C" :
      overallPercent >= 60 ? "D" : "F";

    await ctx.db.update(qalSurvey)
      .set({
        totalPossible: toDbNumeric(agg.totalPossible),
        totalEarned: toDbNumeric(agg.totalEarned),
        overallPercent: toDbNumeric(overallPercent),
        gradeBand: band,
      })
      .where(eq(qalSurvey.id, input.surveyId));

    return { ok: true };
  }),


  saveSection: protectedProcedure
    .input(z.object({
      id: z.number().int().positive(),
      sampleCount: z.number().int().min(0),
      passedCount: z.number().int().min(0),
      notApplicable: z.boolean().optional(),
      sampleNotes: z.string().optional(),
      comments: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db.select().from(qalSurveySection).where(eq(qalSurveySection.id, input.id)).limit(1);
      if (!row) throw new Error("Section row not found");

      const [meta] = await ctx.db.select().from(qalSection).where(eq(qalSection.id, row.sectionId)).limit(1);

      const earnedNum = computeSectionEarned({
        possiblePoints: Number(meta?.possiblePoints ?? 0),
        sampleCount: input.sampleCount,
        passedCount: input.passedCount,
        notApplicable: input.notApplicable,
      });

      await ctx.db.update(qalSurveySection)
        .set({
          sampleCount: input.sampleCount,
          passedCount: input.passedCount,
          notApplicable: !!input.notApplicable,
          sampleNotes: input.sampleNotes ?? null,
          comments: input.comments ?? null,
          earnedPoints: toDbNumeric(earnedNum),
        })
        .where(eq(qalSurveySection.id, input.id));

      const secRows = await ctx.db
        .select()
        .from(qalSurveySection)
        .where(eq(qalSurveySection.surveyId, row.surveyId));

      const masters = await ctx.db
        .select()
        .from(qalSection)
        .where(inArray(qalSection.id, secRows.map((r) => r.sectionId)));

      const agg = aggregateSurvey(
        secRows.map((r) => ({
          possiblePoints: Number(masters.find((m) => m.id === r.sectionId)?.possiblePoints ?? 0),
          earnedPoints: Number(r.earnedPoints ?? 0),
        })),
      );

      await ctx.db.update(qalSurvey)
        .set({
          totalPossible: toDbNumeric(agg.totalPossible),
          totalEarned: toDbNumeric(agg.totalEarned),
          overallPercent: toDbNumeric(agg.overallPercent),
          gradeBand: agg.band,
        })
        .where(eq(qalSurvey.id, row.surveyId));

      return { ok: true };
    }),
});
