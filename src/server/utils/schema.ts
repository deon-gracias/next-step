import { z } from "zod/v4";
import { questionInsertSchema, surveyInsertSchema } from "../db/schema";
import { and, or, SQL } from "drizzle-orm";

export const paginationInputSchema = z.object({
  page: z.number().min(1).default(2),
  pageSize: z.number().min(1).max(100).default(10),
});

export type paginationInputType = z.infer<typeof paginationInputSchema>;

export const questionCreateInputSchema = questionInsertSchema.extend({
  ftagIds: z.number().array().optional(),
});
export type QuestionCreateInputType = z.infer<typeof questionCreateInputSchema>;

export const surveyCreateInputSchema = surveyInsertSchema.extend({
  residentIds: z.array(z.number()),
  caseCodes: z.array(z.string()),
});
export type SurveyCreateInputType = z.infer<typeof surveyCreateInputSchema>;

export const matchTypeOptions = ["AND", "OR"] as const;
export const matchTypeOption = z.enum(matchTypeOptions);
export type MatchType = z.infer<typeof matchTypeOption>;

export function matchTypeToDrizzleCondition(matchType: MatchType) {
  switch (matchType) {
    case "AND":
      return and;
    case "OR":
      return or;
    default:
      return and;
  }
}
