import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  primaryKey,
  unique,
  pgEnum,
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

export const template = pgTable("template", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
});

export const question = pgTable("question", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  text: text("text").notNull(),
  points: integer().notNull(),
  templateId: integer("template_id")
    .references(() => template.id)
    .notNull(),
});

export const ftag = pgTable("ftag", {
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

export const metStatusEnum = pgEnum("met_status_enum", [
  "met",
  "unmet",
  "not_applicable",
]);

export const surveyResponse = pgTable(
  "survey_response",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    surveyId: integer("survey_id")
      .references(() => survey.id)
      .notNull(),
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
  (table) => [unique().on(table.surveyId, table.residentId, table.questionId)],
);

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

// SurveyResponse
export const surveyResponseInsertSchema = createInsertSchema(surveyResponse);
export type SurveyResponseInsertType = z.infer<
  typeof surveyResponseInsertSchema
>;
export const surveyResponseSelectSchema = createSelectSchema(surveyResponse);
export type SurveyResponseSelectType = z.infer<
  typeof surveyResponseSelectSchema
>;
