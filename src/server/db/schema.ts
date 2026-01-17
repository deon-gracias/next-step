import { relations } from "drizzle-orm";
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
  varchar,
  numeric,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
  role: text("role"),
  banned: boolean("banned").default(false),
  banReason: text("ban_reason"),
  banExpires: timestamp("ban_expires"),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    activeOrganizationId: text("active_organization_id"),
    impersonatedBy: text("impersonated_by"),
  },
  (table) => [index("session_userId_idx").on(table.userId)],
);

export const account = pgTable(
  "account",
  {
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
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("account_userId_idx").on(table.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

export const organization = pgTable(
  "organization",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    logo: text("logo"),
    createdAt: timestamp("created_at").notNull(),
    metadata: text("metadata"),
  },
  (table) => [uniqueIndex("organization_slug_uidx").on(table.slug)],
);

export const member = pgTable(
  "member",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: text("role").default("member").notNull(),
    createdAt: timestamp("created_at").notNull(),
  },
  (table) => [
    index("member_organizationId_idx").on(table.organizationId),
    index("member_userId_idx").on(table.userId),
  ],
);

export const invitation = pgTable(
  "invitation",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: text("role"),
    status: text("status").default("pending").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    inviterId: text("inviter_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("invitation_organizationId_idx").on(table.organizationId),
    index("invitation_email_idx").on(table.email),
  ],
);

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  members: many(member),
  invitations: many(invitation),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

export const organizationRelations = relations(organization, ({ many }) => ({
  members: many(member),
  invitations: many(invitation),
}));

export const memberRelations = relations(member, ({ one }) => ({
  organization: one(organization, {
    fields: [member.organizationId],
    references: [organization.id],
  }),
  user: one(user, {
    fields: [member.userId],
    references: [user.id],
  }),
}));

export const invitationRelations = relations(invitation, ({ one }) => ({
  organization: one(organization, {
    fields: [invitation.organizationId],
    references: [organization.id],
  }),
  user: one(user, {
    fields: [invitation.inviterId],
    references: [user.id],
  }),
}));

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
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

export const facility = pgTable("facility", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  address: text("address").notNull(),
  facilityCode: varchar("facility_code", { length: 10 }).notNull(), // Add .notNull()
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
  pocGenerated: boolean("poc_generated").default(false).notNull(),
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
  // (table) => [unique().on(table.residentId, table.surveyId)],
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

// ✅ FIXED: Simplified surveyResponse with only necessary constraints
export const surveyResponse = pgTable(
  "survey_response",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),

    surveyId: integer("survey_id")
      .references(() => survey.id)
      .notNull(),

    // Optional for general surveys
    residentId: integer("resident_id").references(() => resident.id),

    // Optional for general surveys
    surveyCaseId: integer("survey_case_id").references(() => surveyCases.id),

    questionId: integer("question_id")
      .references(() => question.id)
      .notNull(),

    requirementsMetOrUnmet: metStatusEnum("requirements_met_or_unmet").default(
      "not_applicable",
    ),

    findings: text("findings"),
  },
  (table) => [
    // ✅ Keep only the working constraints
    unique("unique_resident_response").on(
      table.surveyId,
      table.residentId,
      table.questionId,
    ),

    unique("unique_case_response").on(
      table.surveyId,
      table.surveyCaseId,
      table.questionId,
    ),

    // ✅ REMOVED: The problematic unique_general_response constraint
    // This constraint was causing the error because it was being triggered
    // by resident responses that had NULL values
  ],
);

//survey POC table
//survey POC table
export const surveyPOC = pgTable(
  "survey_poc",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),

    // Context keys (all required)
    surveyId: integer("survey_id")
      .notNull()
      .references(() => survey.id, { onDelete: "cascade" }),

    residentId: integer("resident_id").references(() => resident.id), // ✅ Optional for case/general
    surveyCaseId: integer("survey_case_id").references(() => surveyCases.id), // ✅ ADD this

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
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    // ✅ FIXED: Add all three constraint types

    // Resident POCs: One POC per survey+resident+template+question
    unique("unique_resident_poc").on(
      table.surveyId,
      table.residentId,
      table.templateId,
      table.questionId,
    ),

    // ✅ NEW: Case POCs: One POC per survey+case+template+question
    unique("unique_case_poc").on(
      table.surveyId,
      table.surveyCaseId,
      table.templateId,
      table.questionId,
    ),

    // ✅ NEW: General POCs: One POC per survey+question (no resident/case)
    unique("unique_general_poc").on(table.surveyId, table.questionId),
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

export const surveyDOC = pgTable(
  "survey_doc",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),

    // Context keys - same structure as POC
    surveyId: integer("survey_id")
      .notNull()
      .references(() => survey.id, { onDelete: "cascade" }),

    residentId: integer("resident_id").references(() => resident.id), // ✅ Make optional
    surveyCaseId: integer("survey_case_id").references(() => surveyCases.id), // ✅ ADD this

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

    // Content - compliance date instead of POC text
    complianceDate: date("compliance_date").notNull(),

    // Auditing (same as POC)
    createdByUserId: text("created_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    updatedByUserId: text("updated_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    // ✅ FIXED: Add all three constraint types

    // Resident DOCs
    unique("unique_resident_doc").on(
      table.surveyId,
      table.residentId,
      table.templateId,
      table.questionId,
    ),

    // ✅ NEW: Case DOCs
    unique("unique_case_doc").on(
      table.surveyId,
      table.surveyCaseId,
      table.templateId,
      table.questionId,
    ),

    // ✅ NEW: General DOCs
    unique("unique_general_doc").on(table.surveyId, table.questionId),
  ],
);

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

// ============== QAL (Facility-level audit) ==============

// QAL Facility (reuse existing "facility" if you prefer; keeping separate provides isolation)
// If you want to reuse existing "facility", skip this table and reference facility.id below.
export const qalFacility = pgTable("qal_facility", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  location: text("location"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const qalTemplate = pgTable("qal_template", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(), // "RCO QAL Audit"
  isActive: boolean("is_active").default(true).notNull(),
  meta: text("meta"), // optional JSON as string if preferred
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const qalSection = pgTable("qal_section", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  templateId: integer("template_id")
    .notNull()
    .references(() => qalTemplate.id, { onDelete: "cascade" }),
  title: text("title").notNull(), // "Admissions", etc.
  description: text("description"),
  sortOrder: integer("sort_order").notNull(),
  possiblePoints: integer("possible_points").notNull(), // e.g., 35, 5, 10
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const qalQuestion = pgTable("qal_question", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  sectionId: integer("section_id")
    .notNull()
    .references(() => qalSection.id, { onDelete: "cascade" }),
  prompt: text("prompt").notNull(), // audit item text
  guidance: text("guidance"), // additional instructions
  sortOrder: integer("sort_order").notNull(),
  fixedSample: integer("fixed_sample").notNull(), // e.g., 3 for Admissions items
  possiblePoints: numeric("possible_points", { precision: 12, scale: 4 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const surveyTypeEnum = pgEnum("survey_type", ["onsite", "offsite"]);

// Facility-level survey (no residents)
export const qalSurvey = pgTable("qal_survey", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  facilityId: integer("facility_id")
    .notNull()
    .references(() => facility.id, { onDelete: "restrict" }),
  templateId: integer("template_id")
    .notNull()
    .references(() => qalTemplate.id, { onDelete: "restrict" }),
  auditorUserId: text("auditor_user_id").references(() => user.id, {
    onDelete: "set null",
  }),
  surveyDate: timestamp("survey_date").defaultNow().notNull(),
  surveyType: surveyTypeEnum("survey_type").notNull().default("onsite"),
  administrator: text("administrator"),
  businessOfficeManager: text("business_office_manager"),
  assistantBusinessOfficeManager: text("assistant_business_office_manager"),
  isLocked: boolean("is_locked").default(false).notNull(),

  // ✅ ADD THIS
  pocGenerated: boolean("poc_generated").default(false).notNull(),

  totalPossible: numeric("total_possible", { precision: 12, scale: 4 }).default(
    "0",
  ),
  totalEarned: numeric("total_earned", { precision: 12, scale: 4 }).default(
    "0",
  ),
  overallPercent: numeric("overall_percent", {
    precision: 7,
    scale: 4,
  }).default("0"),
  gradeBand: text("grade_band"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Section score row for a survey
export const qalSurveySection = pgTable("qal_survey_section", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  surveyId: integer("survey_id")
    .notNull()
    .references(() => qalSurvey.id, { onDelete: "cascade" }),
  sectionId: integer("section_id")
    .notNull()
    .references(() => qalSection.id, { onDelete: "restrict" }),

  // Scoring fields
  fixedSample: integer("fixed_sample").notNull(), // copied from section total
  passedCount: integer("passed_count"), // user input or "NA"
  isNotApplicable: boolean("is_not_applicable").default(false),
  earnedPoints: numeric("earned_points", { precision: 12, scale: 4 }).default(
    "0",
  ),

  // Testing Sample & Comments
  testingSample: text("testing_sample"), // PCC IDs, dates JSON or text
  comments: text("comments"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Per-survey item results (pass/fail/na)
export const qalSurveyQuestion = pgTable(
  "qal_survey_question",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    surveyId: integer("survey_id")
      .notNull()
      .references(() => qalSurvey.id, { onDelete: "cascade" }),
    questionId: integer("question_id")
      .notNull()
      .references(() => qalQuestion.id, { onDelete: "cascade" }),
    result: text("result").notNull(), // "pass" | "fail" | "na"
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [unique("uq_qal_survey_question").on(t.surveyId, t.questionId)],
);

export const qalQuestionResponse = pgTable(
  "qal_question_response",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    surveyId: integer("survey_id")
      .notNull()
      .references(() => qalSurvey.id, { onDelete: "cascade" }),
    questionId: integer("question_id")
      .notNull()
      .references(() => qalQuestion.id, { onDelete: "cascade" }),
    sampleSize: integer("sample_size").default(0), // ✅ ADD THIS LINE
    passedCount: integer("passed_count"),
    isNotApplicable: boolean("is_not_applicable").default(false),
    testingSample: text("testing_sample"),
    comments: text("comments"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [unique("uq_qal_question_response").on(t.surveyId, t.questionId)],
);

// QAL POC per section
export const qalPOC = pgTable(
  "qal_poc",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),

    surveyId: integer("survey_id")
      .notNull()
      .references(() => qalSurvey.id, { onDelete: "cascade" }),

    sectionId: integer("section_id")
      .notNull()
      .references(() => qalSection.id, { onDelete: "cascade" }),

    questionId: integer("question_id")
      .notNull()
      .references(() => qalQuestion.id, { onDelete: "cascade" }),

    // Snapshot of failure context
    possiblePoints: numeric("possible_points", {
      precision: 12,
      scale: 4,
    }).notNull(),
    sampleSize: integer("sample_size").notNull(),
    passedCount: integer("passed_count").notNull(),
    testingSample: text("testing_sample"),
    comments: text("comments"),

    // POC content
    pocText: text("poc_text").notNull(),
    complianceDate: date("compliance_date"),

    createdByUserId: text("created_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    updatedByUserId: text("updated_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    // one POC per survey+question
    unique("uq_qal_poc_per_question").on(t.surveyId, t.questionId),
  ],
);

export const qalPocComment = pgTable("qal_poc_comment", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),

  surveyId: integer("survey_id")
    .notNull()
    .references(() => qalSurvey.id, { onDelete: "cascade" }),

  pocId: integer("poc_id")
    .notNull()
    .references(() => qalPOC.id, { onDelete: "cascade" }),

  commentText: text("comment_text").notNull(),

  authorId: text("author_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),

  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ==================== DIETARY TABLES ====================

// Dietary Template (High Temp vs Low Temp machine types)
export const dietaryTemplate = pgTable("dietary_template", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  name: text("name").notNull(), // "High Temp Machine" or "Low Temp Machine"
  machineType: text("machine_type").notNull(), // "high_temp" or "low_temp"
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const dietarySection = pgTable("dietary_section", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  templateId: integer("template_id")
    .notNull()
    .references(() => dietaryTemplate.id, { onDelete: "cascade" }),
  sectionNumber: integer("section_number").notNull(), // 1, 2, 3...
  title: text("title").notNull(), // "STOREROOMS", "KITCHEN REFRIGERATORS"
  maxPoints: integer("max_points").notNull(),
  sortOrder: integer("sort_order").notNull(),
});

export const dietaryQuestion = pgTable("dietary_question", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  sectionId: integer("section_id")
    .notNull()
    .references(() => dietarySection.id, { onDelete: "cascade" }),
  questionLetter: text("question_letter").notNull(), // "A", "B", "C"
  questionText: text("question_text").notNull(),
  points: integer("points").notNull(),
  sortOrder: integer("sort_order").notNull(),
});

// NEW: Dietary Survey (replaces dietarySurveys)
export const dietarySurvey = pgTable("dietary_survey", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  facilityId: integer("facility_id")
    .notNull()
    .references(() => facility.id, { onDelete: "restrict" }),
  templateId: integer("template_id")
    .notNull()
    .references(() => dietaryTemplate.id, { onDelete: "restrict" }),
  surveyorId: text("surveyor_id")
    .notNull()
    .references(() => user.id, { onDelete: "set null" }),
  surveyDate: text("survey_date").notNull(), // Store as ISO string
  isLocked: boolean("is_locked").notNull().default(false),
  totalScore: text("total_score").notNull().default("0"),
  possibleScore: text("possible_score").notNull().default("0"),
  compliancePercentage: text("compliance_percentage").notNull().default("0"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Dietary Survey Responses
export const dietarySurveyResponse = pgTable("dietary_survey_response", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  surveyId: integer("survey_id")
    .notNull()
    .references(() => dietarySurvey.id, { onDelete: "cascade" }),
  questionId: integer("question_id")
    .notNull()
    .references(() => dietaryQuestion.id, { onDelete: "cascade" }),
  status: text("status"), // "met", "unmet", "na"
  comments: text("comments"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relations
export const dietaryTemplateRelations = relations(
  dietaryTemplate,
  ({ many }) => ({
    sections: many(dietarySection),
    surveys: many(dietarySurvey),
  }),
);

export const dietarySectionRelations = relations(
  dietarySection,
  ({ one, many }) => ({
    template: one(dietaryTemplate, {
      fields: [dietarySection.templateId],
      references: [dietaryTemplate.id],
    }),
    questions: many(dietaryQuestion),
  }),
);

export const dietaryQuestionRelations = relations(
  dietaryQuestion,
  ({ one }) => ({
    section: one(dietarySection, {
      fields: [dietaryQuestion.sectionId],
      references: [dietarySection.id],
    }),
  }),
);

export const dietarySurveyRelations = relations(
  dietarySurvey,
  ({ one, many }) => ({
    facility: one(facility, {
      fields: [dietarySurvey.facilityId],
      references: [facility.id],
    }),
    template: one(dietaryTemplate, {
      fields: [dietarySurvey.templateId],
      references: [dietaryTemplate.id],
    }),
    surveyor: one(user, {
      fields: [dietarySurvey.surveyorId],
      references: [user.id],
    }),
    responses: many(dietarySurveyResponse),
  }),
);

export const dietarySurveyResponseRelations = relations(
  dietarySurveyResponse,
  ({ one }) => ({
    survey: one(dietarySurvey, {
      fields: [dietarySurveyResponse.surveyId],
      references: [dietarySurvey.id],
    }),
    question: one(dietaryQuestion, {
      fields: [dietarySurveyResponse.questionId],
      references: [dietaryQuestion.id],
    }),
  }),
);

// Zod schemas
export const dietaryTemplateInsertSchema = createInsertSchema(dietaryTemplate);
export type DietaryTemplateInsertType = z.infer<
  typeof dietaryTemplateInsertSchema
>;
export const dietaryTemplateSelectSchema = createSelectSchema(dietaryTemplate);
export type DietaryTemplateSelectType = z.infer<
  typeof dietaryTemplateSelectSchema
>;

export const dietarySectionInsertSchema = createInsertSchema(dietarySection);
export type DietarySectionInsertType = z.infer<
  typeof dietarySectionInsertSchema
>;
export const dietarySectionSelectSchema = createSelectSchema(dietarySection);
export type DietarySectionSelectType = z.infer<
  typeof dietarySectionSelectSchema
>;

export const dietarySurveyInsertSchema = createInsertSchema(dietarySurvey);
export type DietarySurveyInsertType = z.infer<typeof dietarySurveyInsertSchema>;
export const dietarySurveySelectSchema = createSelectSchema(dietarySurvey);
export type DietarySurveySelectType = z.infer<typeof dietarySurveySelectSchema>;

export const dietaryResponseInsertSchema = createInsertSchema(
  dietarySurveyResponse,
);
export type DietaryResponseInsertType = z.infer<
  typeof dietaryResponseInsertSchema
>;
export const dietaryResponseSelectSchema = createSelectSchema(
  dietarySurveyResponse,
);
export type DietaryResponseSelectType = z.infer<
  typeof dietaryResponseSelectSchema
>;

export const qalPocCommentInsertSchema = createInsertSchema(qalPocComment, {
  commentText: (schema) => schema.min(1, "Comment cannot be empty"),
});
export type QALPocCommentInsertType = z.infer<typeof qalPocCommentInsertSchema>;

export const qalPocCommentSelectSchema = createSelectSchema(qalPocComment);
export type QALPocCommentSelectType = z.infer<typeof qalPocCommentSelectSchema>;

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

export const surveyDOCInsertSchema = createInsertSchema(surveyDOC, {
  complianceDate: (schema) =>
    schema.refine((date) => date !== null, "Compliance date is required"),
});
export type SurveyDOCInsertType = z.infer<typeof surveyDOCInsertSchema>;

export const surveyDOCSelectSchema = createSelectSchema(surveyDOC);
export type SurveyDOCSelectType = z.infer<typeof surveyDOCSelectSchema>;

// QAL Zod
export const qalFacilityInsertSchema = createInsertSchema(qalFacility);
export type QALFacilityInsertType = z.infer<typeof qalFacilityInsertSchema>;
export const qalFacilitySelectSchema = createSelectSchema(qalFacility);
export type QALFacilitySelectType = z.infer<typeof qalFacilitySelectSchema>;

export const qalTemplateInsertSchema = createInsertSchema(qalTemplate);
export type QALTemplateInsertType = z.infer<typeof qalTemplateInsertSchema>;
export const qalTemplateSelectSchema = createSelectSchema(qalTemplate);
export type QALTemplateSelectType = z.infer<typeof qalTemplateSelectSchema>;

export const qalSectionInsertSchema = createInsertSchema(qalSection);
export type QALSectionInsertType = z.infer<typeof qalSectionInsertSchema>;
export const qalSectionSelectSchema = createSelectSchema(qalSection);
export type QALSectionSelectType = z.infer<typeof qalSectionSelectSchema>;

export const qalQuestionInsertSchema = createInsertSchema(qalQuestion);
export type QALQuestionInsertType = z.infer<typeof qalQuestionInsertSchema>;
export const qalQuestionSelectSchema = createSelectSchema(qalQuestion);
export type QALQuestionSelectType = z.infer<typeof qalQuestionSelectSchema>;

export const qalSurveyInsertSchema = createInsertSchema(qalSurvey);
export type QALSurveyInsertType = z.infer<typeof qalSurveyInsertSchema>;
export const qalSurveySelectSchema = createSelectSchema(qalSurvey);
export type QALSurveySelectType = z.infer<typeof qalSurveySelectSchema>;

export const qalSurveySectionInsertSchema =
  createInsertSchema(qalSurveySection);
export type QALSurveySectionInsertType = z.infer<
  typeof qalSurveySectionInsertSchema
>;
export const qalSurveySectionSelectSchema =
  createSelectSchema(qalSurveySection);
export type QALSurveySectionSelectType = z.infer<
  typeof qalSurveySectionSelectSchema
>;

export const qalSurveyQuestionInsertSchema =
  createInsertSchema(qalSurveyQuestion);
export type QALSurveyQuestionInsertType = z.infer<
  typeof qalSurveyQuestionInsertSchema
>;
export const qalSurveyQuestionSelectSchema =
  createSelectSchema(qalSurveyQuestion);
export type QALSurveyQuestionSelectType = z.infer<
  typeof qalSurveyQuestionSelectSchema
>;

export const qalPOCInsertSchema = createInsertSchema(qalPOC, {
  pocText: (schema) => schema.min(1, "POC cannot be empty"),
});
export type QALPOCInsertType = z.infer<typeof qalPOCInsertSchema>;
export const qalPOCSelectSchema = createSelectSchema(qalPOC);
export type QALPOCSelectType = z.infer<typeof qalPOCSelectSchema>;

export function toDbNumeric(
  n: number | string | null | undefined,
): string | null {
  if (n === null || n === undefined) return null;
  if (typeof n === "number") return n.toString();
  return n;
}

// Survey Relations
export const surveyRelations = relations(survey, ({ one, many }) => ({
  template: one(template, {
    fields: [survey.templateId],
    references: [template.id],
  }),
  facility: one(facility, {
    fields: [survey.facilityId],
    references: [facility.id],
  }),
  surveyor: one(user, {
    fields: [survey.surveyorId],
    references: [user.id],
  }),
  residents: many(surveyResident),
  cases: many(surveyCases),
  responses: many(surveyResponse),
  pocs: many(surveyPOC),
  docs: many(surveyDOC),
  comments: many(pocComment),
}));

export const surveyResidentRelations = relations(surveyResident, ({ one }) => ({
  survey: one(survey, {
    fields: [surveyResident.surveyId],
    references: [survey.id],
  }),
  resident: one(resident, {
    fields: [surveyResident.residentId],
    references: [resident.id],
  }),
}));

export const surveyResponseRelations = relations(surveyResponse, ({ one }) => ({
  survey: one(survey, {
    fields: [surveyResponse.surveyId],
    references: [survey.id],
  }),
  question: one(question, {
    fields: [surveyResponse.questionId],
    references: [question.id],
  }),
}));

export const surveyPOCRelations = relations(surveyPOC, ({ one }) => ({
  survey: one(survey, {
    fields: [surveyPOC.surveyId],
    references: [survey.id],
  }),
  question: one(question, {
    fields: [surveyPOC.questionId],
    references: [question.id],
  }),
  template: one(template, {
    fields: [surveyPOC.templateId],
    references: [template.id],
  }),
}));

export const surveyDOCRelations = relations(surveyDOC, ({ one }) => ({
  survey: one(survey, {
    fields: [surveyDOC.surveyId],
    references: [survey.id],
  }),
  question: one(question, {
    fields: [surveyDOC.questionId],
    references: [question.id],
  }),
  template: one(template, {
    fields: [surveyDOC.templateId],
    references: [template.id],
  }),
}));

export const pocCommentRelations = relations(pocComment, ({ one }) => ({
  survey: one(survey, {
    fields: [pocComment.surveyId],
    references: [survey.id],
  }),
  template: one(template, {
    fields: [pocComment.templateId],
    references: [template.id],
  }),
  author: one(user, {
    fields: [pocComment.authorId],
    references: [user.id],
  }),
}));

export const residentRelations = relations(resident, ({ one, many }) => ({
  facility: one(facility, {
    fields: [resident.facilityId],
    references: [facility.id],
  }),
  surveyResidents: many(surveyResident),
}));

export const questionRelations = relations(question, ({ one, many }) => ({
  template: one(template, {
    fields: [question.templateId],
    references: [template.id],
  }),
  responses: many(surveyResponse),
  pocs: many(surveyPOC),
  docs: many(surveyDOC),
}));

export const templateRelations = relations(template, ({ many }) => ({
  questions: many(question),
  surveys: many(survey),
}));
