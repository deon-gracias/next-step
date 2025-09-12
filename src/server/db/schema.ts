import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  primaryKey,
  unique,
  pgEnum,
  date,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified")
    .$defaultFn(() => false)
    .notNull(),
  image: text("image"),
  createdAt: timestamp("created_at")
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
  updatedAt: timestamp("updated_at")
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  activeOrganizationId: text("active_organization_id"),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").$defaultFn(
    () => /* @__PURE__ */ new Date(),
  ),
  updatedAt: timestamp("updated_at").$defaultFn(
    () => /* @__PURE__ */ new Date(),
  ),
});

export const organization = pgTable("organization", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").unique(),
  logo: text("logo"),
  createdAt: timestamp("created_at").notNull(),
  metadata: text("metadata"),
});

export const member = pgTable("member", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  role: text("role").default("member").notNull(),
  createdAt: timestamp("created_at").notNull(),
});

export const invitation = pgTable("invitation", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  role: text("role"),
  status: text("status").default("pending").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  inviterId: text("inviter_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const memberFacility = pgTable("member_facility", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),

  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  facilityId: integer("facility_id")
    .notNull()
    .references(() => facility.id, { onDelete: "cascade" }),
});

export const resident = pgTable("resident", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  roomId: text("room_id").notNull(),
  pcciId: text("ppci_id").notNull(),
  facilityId: integer("facility_id")
    .references(() => facility.id)
    .notNull(),
});

export const facility = pgTable("facility", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  address: text("address").notNull(),
});

export const templateTypeEnum = pgEnum("template_type", [
  "resident",
  "general",
  "case",
]);

export const template = pgTable("template", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  type: templateTypeEnum("type").notNull(),
});

export const ftag = pgTable("ftag", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  code: text("code").notNull().unique(),
  description: text("description"),
});

export const question = pgTable("question", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  text: text("text").notNull(),
  points: integer().notNull(),
  templateId: integer("template_id")
    .references(() => template.id)
    .notNull(),
});

export const cases = pgTable("case", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  code: text("code").notNull().unique(),
  description: text("description"),
});

export const questionFtag = pgTable(
  "question_ftag",
  {
    questionId: integer("question_id")
      .references(() => question.id)
      .notNull(),
    ftagId: integer("ftag_id")
      .references(() => ftag.id)
      .notNull(),
  },
  (table) => [primaryKey({ columns: [table.questionId, table.ftagId] })],
);

export const survey = pgTable("survey", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  surveyorId: text("surveyor_id")
    .references(() => user.id, { onDelete: "cascade" })
    .notNull(),
  facilityId: integer("facility_id")
    .references(() => facility.id)
    .notNull(),
  templateId: integer("template_id")
    .references(() => template.id)
    .notNull(),
  isLocked: boolean("is_locked").default(false).notNull(),
  surveyDate: date("survey_date").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const surveyResident = pgTable(
  "survey_resident",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    surveyId: integer("survey_id")
      .references(() => survey.id)
      .notNull(),
    residentId: integer("resident_id")
      .references(() => resident.id)
      .notNull(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [unique().on(table.residentId, table.surveyId)],
);

export const surveyCases = pgTable("survey_case", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  surveyId: integer("survey_id")
    .references(() => survey.id)
    .notNull(),
  caseCode: text("case_code").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const metStatusEnum = pgEnum("met_status_enum", [
  "met",
  "unmet",
  "not_applicable",
]);

// Replace your existing surveyResponse definition with this block

export const surveyResponse = pgTable(
  "survey_response",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),

    surveyId: integer("survey_id")
      .references(() => survey.id)
      .notNull(),

    // Optional for case-level flows; NOT part of the unique key for resident page
    surveyCaseId: integer("survey_case_id").references(() => surveyCases.id),

    // Make residentId NOT NULL so (survey_id, resident_id, question_id) is always valid
    residentId: integer("resident_id")
      .references(() => resident.id)
      .notNull(),

    questionId: integer("question_id")
      .references(() => question.id)
      .notNull(),

    requirementsMetOrUnmet: metStatusEnum("requirements_met_or_unmet").default(
      "not_applicable",
    ),

    findings: text("findings"),
  },
  (table) => [
    // EXACT three-column composite unique key you want to upsert on
    unique().on(table.surveyId, table.residentId, table.questionId),
  ],
);


//survey POC table
export const surveyPOC = pgTable(
  "survey_poc",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),

    // Context keys (all required)
    surveyId: integer("survey_id")
      .notNull()
      .references(() => survey.id, { onDelete: "cascade" }),

    residentId: integer("resident_id")
      .notNull()
      .references(() => resident.id, { onDelete: "cascade" }),

    templateId: integer("template_id")
      .notNull()
      .references(() => template.id, { onDelete: "cascade" }),

    questionId: integer("question_id")
      .notNull()
      .references(() => question.id, { onDelete: "cascade" }),

    // Optional: link to survey_response row for easier joins/validation
    surveyResponseId: integer("survey_response_id").references(
      () => surveyResponse.id,
      { onDelete: "set null" },
    ),

    // Content
    pocText: text("poc_text").notNull(),

    // Auditing (optional if you already track users)
    createdByUserId: text("created_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    updatedByUserId: text("updated_by_user_id").references(() => user.id, {
      onDelete: "set null" },
    ),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    // One POC per survey+resident+template+question
    unique().on(
      table.surveyId,
      table.residentId,
      table.templateId,
      table.questionId,
    ),
  ],
);

export const pocComment = pgTable("poc_comment", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  
  // Reference to the survey and template (for easier querying)
  surveyId: integer("survey_id")
    .notNull()
    .references(() => survey.id, { onDelete: "cascade" }),
  
  templateId: integer("template_id")
    .notNull()
    .references(() => template.id, { onDelete: "cascade" }),
  
  // Comment content
  commentText: text("comment_text").notNull(),
  
  // Author tracking
  authorId: text("author_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  
  // Timestamps (comments cannot be edited)
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const dietarySurveys = pgTable("dietary_surveys", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const dietaryQuestions = pgTable("dietary_questions", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  question: text("question").notNull(),
  category: text("category"),
});

export const dietarySurveyQuestions = pgTable("dietary_survey_questions", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  surveyId: integer("survey_id")
    .notNull()
    .references(() => dietarySurveys.id, { onDelete: "cascade" }),
  questionId: integer("question_id")
    .notNull()
    .references(() => dietaryQuestions.id, { onDelete: "cascade" }),
  order: integer("order").default(0),
});

export const dietaryAnswerStatusEnum = pgEnum("dietary_answer_status", [
  "met",
  "unmet",
  "n/a",
]);

export const dietaryAnswers = pgTable("dietary_answers", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  questionId: integer("question_id")
    .notNull()
    .references(() => dietaryQuestions.id, { onDelete: "cascade" }),
  status: dietaryAnswerStatusEnum("status").notNull(),
  comments_or_actions: text("comments"),
  validation_or_completion: text("validation"),
});

// Resident
export const residentInsertSchema = createInsertSchema(resident);
export type ResidentInsertType = z.infer<typeof residentInsertSchema>;
export const residentSelectSchema = createSelectSchema(resident);
export type ResidentSelectType = z.infer<typeof residentSelectSchema>;

// Facility
export const facilityInsertSchema = createInsertSchema(facility);
export type FacilityInsertType = z.infer<typeof facilityInsertSchema>;
export const facilitySelectSchema = createSelectSchema(facility);
export type FacilitySelectType = z.infer<typeof facilitySelectSchema>;

// Template
export const templateInsertSchema = createInsertSchema(template);
export type TemplateInsertType = z.infer<typeof templateInsertSchema>;
export const templateSelectSchema = createSelectSchema(template);
export type TemplateSelectType = z.infer<typeof templateSelectSchema>;

// Question
export const questionInsertSchema = createInsertSchema(question);
export type QuestionInsertType = z.infer<typeof questionInsertSchema>;
export const questionSelectSchema = createSelectSchema(question);
export type QuestionSelectType = z.infer<typeof questionSelectSchema>;

// FTag
export const ftagInsertSchema = createInsertSchema(ftag);
export type FTagInsertType = z.infer<typeof ftagInsertSchema>;
export const ftagSelectSchema = createSelectSchema(ftag);
export type FTagSelectType = z.infer<typeof ftagSelectSchema>;

// QuestionFTag
export const questionFtagInsertSchema = createInsertSchema(questionFtag);
export type QuestionFtagInsertType = z.infer<typeof questionFtagInsertSchema>;
export const questionFtagSelectSchema = createSelectSchema(questionFtag);
export type QuestionFtagSelectType = z.infer<typeof questionFtagSelectSchema>;

// Cases
export const caseInsertSchema = createInsertSchema(cases);
export type CaseInsertType = z.infer<typeof caseInsertSchema>;
export const caseSelectSchema = createSelectSchema(cases);
export type CaseSelectType = z.infer<typeof caseSelectSchema>;

// Survey
export const surveyInsertSchema = createInsertSchema(survey);
export type SurveyInsertType = z.infer<typeof surveyInsertSchema>;
export const surveySelectSchema = createSelectSchema(survey);
export type SurveySelectType = z.infer<typeof surveySelectSchema>;

// Survey Resident
export const surveyResidentInsertSchema = createInsertSchema(surveyResident);
export type surveyResidentInsertType = z.infer<
  typeof surveyResidentInsertSchema
>;
export const surveyResidentSelectSchema = createSelectSchema(surveyResident);
export type surveyResidentSelectType = z.infer<
  typeof surveyResidentSelectSchema
>;

// Survey Case
export const surveyCasesInsertSchema = createInsertSchema(surveyCases);
export type surveyCasesInsertType = z.infer<typeof surveyCasesInsertSchema>;
export const surveyCasesSelectSchema = createSelectSchema(surveyCases);
export type surveyCasesSelectType = z.infer<typeof surveyCasesSelectSchema>;

// Survey Response
export const surveyResponseInsertSchema = createInsertSchema(surveyResponse);
export type SurveyResponseInsertType = z.infer<
  typeof surveyResponseInsertSchema
>;
export const surveyResponseSelectSchema = createSelectSchema(surveyResponse);
export type SurveyResponseSelectType = z.infer<
  typeof surveyResponseSelectSchema
>;

// Survey POC
export const surveyPOCInsertSchema = createInsertSchema(surveyPOC, {
  pocText: (schema) => schema.min(1, "POC cannot be empty"),
});
export type SurveyPOCInsertType = z.infer<typeof surveyPOCInsertSchema>;

export const surveyPOCSelectSchema = createSelectSchema(surveyPOC);
export type SurveyPOCSelectType = z.infer<typeof surveyPOCSelectSchema>;

// Dietary Survey
export const dietarySurveysInsertSchema = createInsertSchema(dietarySurveys);
export type DietarySurveysInsertType = z.infer<
  typeof dietarySurveysInsertSchema
>;
export const dietarySurveysSelectSchema = createSelectSchema(dietarySurveys);
export type DietarySurveysSelectType = z.infer<
  typeof dietarySurveysSelectSchema
>;

// Dietary Question
export const dietaryQuestionInsertSchema = createInsertSchema(dietaryQuestions);
export type DietaryQuestionInsertType = z.infer<
  typeof dietaryQuestionInsertSchema
>;
export const dietaryQuestionSelectSchema = createSelectSchema(dietaryQuestions);
export type DietaryQuestionSelectType = z.infer<
  typeof dietaryQuestionSelectSchema
>;

// Dietary Survey Questions
export const dietarySurveyQuestionInsertSchema = createInsertSchema(
  dietarySurveyQuestions,
);
export type DietarySurveyQuestionInsertType = z.infer<
  typeof dietarySurveyQuestionInsertSchema
>;
export const dietarySurveyQuestionSelectSchema = createSelectSchema(
  dietarySurveyQuestions,
);
export type DietarySurveyQuestionSelectType = z.infer<
  typeof dietarySurveyQuestionSelectSchema
>;

// Dietary Survey Answers
export const dietaryAnswerInsertSchema = createInsertSchema(dietaryAnswers);
export type DietaryAnswerInsertType = z.infer<typeof dietaryAnswerInsertSchema>;
export const dietaryAnswerSelectSchema = createSelectSchema(dietaryAnswers);
export type DietaryAnswerSelectType = z.infer<typeof dietaryAnswerSelectSchema>;

export const pocCommentInsertSchema = createInsertSchema(pocComment, {
  commentText: (schema) => schema.min(1, "Comment cannot be empty"),
});
export type PocCommentInsertType = z.infer<typeof pocCommentInsertSchema>;

export const pocCommentSelectSchema = createSelectSchema(pocComment);
export type PocCommentSelectType = z.infer<typeof pocCommentSelectSchema>;