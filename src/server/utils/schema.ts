import { z } from "zod/v4";
import { questionInsertSchema, surveyInsertSchema } from "../db/schema";

export const paginationInputSchema = z.object({
  page: z.number().min(1).default(1),
  pageSize: z.number().min(1).max(100).default(10),
});

export type paginationInputType = z.infer<typeof paginationInputSchema>;

export const questionCreateInputSchema = questionInsertSchema.extend({
  ftagIds: z.number().array().optional(),
});
export type QuestionCreateInputType = z.infer<typeof questionCreateInputSchema>;

export const surveyCreateInputSchema = surveyInsertSchema.extend({
  residentIds: z.array(z.number()),
});
export type SurveyCreateInputType = z.infer<typeof surveyCreateInputSchema>;
