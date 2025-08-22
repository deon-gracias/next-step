// import { drizzle } from "drizzle-orm/postgres-js";
// import postgres from "postgres";
// import * as schema from "@/server/db/schema";
// import { sql } from "drizzle-orm";
// import { reset } from "drizzle-seed";
// import crypto from "crypto";

// async function main() {
//   const DATABASE_URL = "postgresql://admin:admin123@localhost:5435/next-step";
//   if (!DATABASE_URL) {
//     throw new Error("DATABASE_URL is not set. Put it in your .env/.env.local");
//   }
//   console.log("Seeding DB:", DATABASE_URL);

//   const conn = postgres(DATABASE_URL, { max: 1 });
//   const db = drizzle(conn, { schema });

//   // DANGER: Resets all tables (intended for local/dev only)
//   await reset(db, schema);

//   // 1) Users ------------------------------------------------------------------
//   await db
//     .insert(schema.user)
//     .values({
//       id: "IS3vjXfQjv3s8pcHTlUp2gJv91i9JIAX",
//       name: "Admin",
//       email: "admin@mail.com",
//       emailVerified: false,
//       createdAt: new Date(),
//       updatedAt: new Date(),
//     })
//     .onConflictDoNothing();

//   await db
//     .insert(schema.user)
//     .values({
//       id: "jWAs08rV8ZXSD6q8drXDrLXPNHlRQ5RB",
//       name: "Deon",
//       email: "deon@mail.com",
//       emailVerified: false,
//       createdAt: new Date(),
//       updatedAt: new Date(),
//     })
//     .onConflictDoNothing();

//   // 2) Accounts ---------------------------------------------------------------
//   await db
//     .insert(schema.account)
//     .values({
//       id: "yLgUSy4VdrBlBI1qdF8Gh6SVi1Je6bVA",
//       accountId: "IS3vjXfQjv3s8pcHTlUp2gJv91i9JIAX",
//       providerId: "credential",
//       userId: "IS3vjXfQjv3s8pcHTlUp2gJv91i9JIAX",
//       password:
//         "a5b756302ef75ca1f019e431e7c639d2:454748964aede42ee1b3fe2d16de22484e49b6c1ea54c8f61460718123c58a12a674efc8c1168c9fe11dc84df491cc31391c7115c9ce365f50e0f6daeb2cbe14",
//       createdAt: new Date(),
//       updatedAt: new Date(),
//     })
//     .onConflictDoNothing();

//   await db
//     .insert(schema.account)
//     .values({
//       id: "3G3vEK3DdeIR4C8wjPVL2MJ98rogK17H",
//       accountId: "jWAs08rV8ZXSD6q8drXDrLXPNHlRQ5RB",
//       providerId: "credential",
//       userId: "jWAs08rV8ZXSD6q8drXDrLXPNHlRQ5RB",
//       password:
//         "53b8986dc41b55f5d9ed6ce00300945a:017efd2b0a097863ad1219d1c9472069dfefc20369dd1a50a05ba1ac99bf5a866e017b9130da2e3061fce8141a69b2aaba6bb824460a7d21aa0fa890ff6e1c3a",
//       createdAt: new Date(),
//       updatedAt: new Date(),
//     })
//     .onConflictDoNothing();

//   // 3) Organizations ----------------------------------------------------------
//   const orgs = [
//     {
//       id: "zI0djKRJb4HHgsPvm9J7PqVMtH9LGI2b",
//       name: "QISV",
//       slug: "qisv",
//       createdAt: new Date(),
//       metadata: null,
//     },
//     {
//       id: "V0Pt1WuCS7PC4xIXezjQIeFsr8NAcsXc",
//       name: "QAL",
//       slug: "qal",
//       createdAt: new Date(),
//       metadata: null,
//     },
//     {
//       id: "QnhkP7TAfPMm4ZG8B0IOXWZPUbuy41Co",
//       name: "Dietary",
//       slug: "dietary",
//       createdAt: new Date(),
//       metadata: null,
//     },
//   ];
//   await db.insert(schema.organization).values(orgs).onConflictDoNothing();

//   // 4) Memberships ------------------------------------------------------------
//   const [{ count: memberCount }] = await db
//     .select({ count: sql<number>`count(*)` })
//     .from(schema.member);

//   if (Number(memberCount) === 0) {
//     const memberships = orgs.map((o) => ({
//       id: crypto.randomUUID(),
//       userId: "IS3vjXfQjv3s8pcHTlUp2gJv91i9JIAX",
//       organizationId: o.id,
//       role: "admin",
//       createdAt: new Date(),
//     }));
//     await db.insert(schema.member).values(memberships);
//   }

//   // 5) Facilities (insert first) ----------------------------------------------
//   const facilities = [
//     {
//       name: "Riverside Care Center",
//       address: "123 Main St, Riverside, CA 92501",
//     },
//     { name: "Sunset Manor", address: "456 Oak Ave, Sunset, CA 90210" },
//     {
//       name: "Pine Valley Healthcare",
//       address: "789 Pine St, Pine Valley, CA 91962",
//     },
//     { name: "Golden Years Manor", address: "321 Golden Rd, Golden, CA 80403" },
//     {
//       name: "Meadowbrook Care",
//       address: "654 Meadow Ln, Meadowbrook, CA 90210",
//     },
//     {
//       name: "Hillside Nursing Home",
//       address: "987 Hill St, Hillside, CA 90210",
//     },
//   ];

//   const insertedFacilities = await db
//     .insert(schema.facility)
//     .values(facilities)
//     .onConflictDoNothing()
//     .returning({ id: schema.facility.id });

//   let facilityIds: number[] = insertedFacilities.map((f) => f.id);
//   if (facilityIds.length === 0) {
//     const existing = await db
//       .select({ id: schema.facility.id })
//       .from(schema.facility);
//     facilityIds = existing.map((f) => f.id);
//   }
//   if (facilityIds.length === 0) {
//     throw new Error("No facilities available to reference for residents.");
//   }
//   console.log("Facilities available:", facilityIds);

//   // 6) Residents (reference valid facility ids) -------------------------------
//   const residents = Array.from({ length: 50 }, (_, i) => ({
//     name: `Resident ${i + 1}`,
//     facilityId: facilityIds[i % facilityIds.length],
//     roomId: `Room ${i}`,
//     pcciId: `PCCI ID ${i}`,
//   }));
//   await db.insert(schema.resident).values(residents).onConflictDoNothing();

//   // 7) Templates --------------------------------------------------------------
//   const templates = [
//     { name: "Basic Safety", type: "resident" as const },
//     { name: "Infection Control", type: "resident" as const },
//     { name: "Nutrition & Hydration", type: "resident" as const },
//   ];
//   const insertedTemplates = await db
//     .insert(schema.template)
//     .values(templates)
//     .onConflictDoNothing()
//     .returning({ id: schema.template.id });

//   let templateIds: number[] = insertedTemplates.map((t) => t.id);
//   if (templateIds.length === 0) {
//     const existing = await db
//       .select({ id: schema.template.id })
//       .from(schema.template);
//     templateIds = existing.map((t) => t.id);
//   }
//   if (templateIds.length === 0) {
//     throw new Error("No templates available for questions.");
//   }
//   console.log("Templates available:", templateIds);

//   // 8) Questions (each row MUST have a single numeric templateId) -------------
//   const qData = [
//     {
//       text: "Hand-washing supplies accessible?",
//       templateId: templateIds[0],
//       points: 10,
//     },
//     {
//       text: "Staff perform hand hygiene?",
//       templateId: templateIds[0],
//       points: 10,
//     },
//     {
//       text: "PPE available and used correctly?",
//       templateId: templateIds[0],
//       points: 10,
//     },
//     {
//       text: "Isolation protocols followed?",
//       templateId: templateIds[1] ?? templateIds[0],
//       points: 10,
//     },
//     {
//       text: "Menus meet resident needs?",
//       templateId: templateIds[2] ?? templateIds[0],
//       points: 10,
//     },
//   ];

//   for (const q of qData) {
//     if (typeof q.templateId !== "number" || Number.isNaN(q.templateId)) {
//       throw new Error(
//         `Invalid templateId for question "${q.text}": ${String(q.templateId)}`,
//       );
//     }
//   }

//   const insertedQuestions = await db
//     .insert(schema.question)
//     .values(qData)
//     .onConflictDoNothing()
//     .returning({ id: schema.question.id });

//   let questionIds: number[] = insertedQuestions.map((q) => q.id);
//   if (questionIds.length === 0) {
//     const existing = await db
//       .select({ id: schema.question.id })
//       .from(schema.question);
//     questionIds = existing.map((q) => q.id);
//   }
//   if (questionIds.length === 0) {
//     throw new Error("No questions available.");
//   }

//   // 9) FTags ------------------------------------------------------------------
//   const ftags = [
//     { code: "F441", description: "Infection control" },
//     { code: "F812", description: "Nutrition requirements" },
//     { code: "F550", description: "Quality of care" },
//   ];
//   const insertedFtags = await db
//     .insert(schema.ftag)
//     .values(ftags)
//     .onConflictDoNothing()
//     .returning({ id: schema.ftag.id });

//   let ftagIds: number[] = insertedFtags.map((f) => f.id);
//   if (ftagIds.length === 0) {
//     const existing = await db.select({ id: schema.ftag.id }).from(schema.ftag);
//     ftagIds = existing.map((f) => f.id);
//   }

//   // 10) Cases -----------------------------------------------------------------
//   const cases = [
//     { code: "C441", description: "Infection control" },
//     { code: "C812", description: "Nutrition requirements" },
//     { code: "C550", description: "Quality of care" },
//   ];
//   await db.insert(schema.cases).values(cases).onConflictDoNothing();

//   // 11) Question-FTAG links ---------------------------------------------------
//   const qfValues: { questionId: number; ftagId: number }[] = [];
//   if (questionIds[0] && ftagIds[0])
//     qfValues.push({ questionId: questionIds[0], ftagId: ftagIds[0] });
//   if (questionIds[1] && ftagIds[0])
//     qfValues.push({ questionId: questionIds[1], ftagId: ftagIds[0] });
//   if (questionIds[2] && ftagIds[0])
//     qfValues.push({ questionId: questionIds[2], ftagId: ftagIds[0] });
//   if (questionIds[3] && ftagIds[0])
//     qfValues.push({ questionId: questionIds[3], ftagId: ftagIds[0] });
//   if (questionIds[4] && ftagIds[1])
//     qfValues.push({ questionId: questionIds[4], ftagId: ftagIds[1] });

//   if (qfValues.length > 0) {
//     await db.insert(schema.questionFtag).values(qfValues).onConflictDoNothing();
//   }

//   console.log("✅ Seed complete");
//   await conn.end();
// }

// main().catch((e) => {
//   console.error(e);
//   process.exit(1);
// });


// scripts/seed.ts
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/server/db/schema";
import { sql } from "drizzle-orm";
import { reset } from "drizzle-seed";
import crypto from "crypto";

async function main() {
  const DATABASE_URL = "postgresql://postgres:Rahul@2025@db.odjkzowqixaqpesalenl.supabase.co:5432/postgres";
  if (!DATABASE_URL) {
    throw new Error("DATABASE_URL is not set. Put it in your .env/.env.local");
  }
  console.log("Seeding DB:", DATABASE_URL);

  const conn = postgres(DATABASE_URL, { max: 1 });
  const db = drizzle(conn, { schema });

  // DANGER: Resets all tables (intended for local/dev only)
  await reset(db, schema);

  // 1) Users ------------------------------------------------------------------
  await db
    .insert(schema.user)
    .values({
      id: "IS3vjXfQjv3s8pcHTlUp2gJv91i9JIAX",
      name: "Admin",
      email: "admin@mail.com",
      emailVerified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .onConflictDoNothing();

  await db
    .insert(schema.user)
    .values({
      id: "jWAs08rV8ZXSD6q8drXDrLXPNHlRQ5RB",
      name: "Deon",
      email: "deon@mail.com",
      emailVerified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .onConflictDoNothing();

  // 2) Accounts ---------------------------------------------------------------
  await db
    .insert(schema.account)
    .values({
      id: "yLgUSy4VdrBlBI1qdF8Gh6SVi1Je6bVA",
      accountId: "IS3vjXfQjv3s8pcHTlUp2gJv91i9JIAX",
      providerId: "credential",
      userId: "IS3vjXfQjv3s8pcHTlUp2gJv91i9JIAX",
      password:
        "a5b756302ef75ca1f019e431e7c639d2:454748964aede42ee1b3fe2d16de22484e49b6c1ea54c8f61460718123c58a12a674efc8c1168c9fe11dc84df491cc31391c7115c9ce365f50e0f6daeb2cbe14",
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .onConflictDoNothing();

  await db
    .insert(schema.account)
    .values({
      id: "3G3vEK3DdeIR4C8wjPVL2MJ98rogK17H",
      accountId: "jWAs08rV8ZXSD6q8drXDrLXPNHlRQ5RB",
      providerId: "credential",
      userId: "jWAs08rV8ZXSD6q8drXDrLXPNHlRQ5RB",
      password:
        "53b8986dc41b55f5d9ed6ce00300945a:017efd2b0a097863ad1219d1c9472069dfefc20369dd1a50a05ba1ac99bf5a866e017b9130da2e3061fce8141a69b2aaba6bb824460a7d21aa0fa890ff6e1c3a",
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .onConflictDoNothing();

  // 3) Organizations ----------------------------------------------------------
  const orgs = [
    {
      id: "zI0djKRJb4HHgsPvm9J7PqVMtH9LGI2b",
      name: "QISV",
      slug: "qisv",
      createdAt: new Date(),
      metadata: null,
    },
    {
      id: "V0Pt1WuCS7PC4xIXezjQIeFsr8NAcsXc",
      name: "QAL",
      slug: "qal",
      createdAt: new Date(),
      metadata: null,
    },
    {
      id: "QnhkP7TAfPMm4ZG8B0IOXWZPUbuy41Co",
      name: "Dietary",
      slug: "dietary",
      createdAt: new Date(),
      metadata: null,
    },
  ];
  await db.insert(schema.organization).values(orgs).onConflictDoNothing();

  // 4) Memberships ------------------------------------------------------------
  const memberCountResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.member);

  const memberCount = memberCountResult[0]?.count ?? 0;

  if (Number(memberCount) === 0) {
    const memberships = orgs.map((o) => ({
      id: crypto.randomUUID(),
      userId: "IS3vjXfQjv3s8pcHTlUp2gJv91i9JIAX",
      organizationId: o.id,
      role: "admin",
      createdAt: new Date(),
    }));
    await db.insert(schema.member).values(memberships);
  }

  // 5) Facilities (insert first) ----------------------------------------------
  const facilities = [
    {
      name: "Riverside Care Center",
      address: "123 Main St, Riverside, CA 92501",
    },
    { name: "Sunset Manor", address: "456 Oak Ave, Sunset, CA 90210" },
    {
      name: "Pine Valley Healthcare",
      address: "789 Pine St, Pine Valley, CA 91962",
    },
    { name: "Golden Years Manor", address: "321 Golden Rd, Golden, CA 80403" },
    {
      name: "Meadowbrook Care",
      address: "654 Meadow Ln, Meadowbrook, CA 90210",
    },
    {
      name: "Hillside Nursing Home",
      address: "987 Hill St, Hillside, CA 90210",
    },
  ];

  const insertedFacilities = await db
    .insert(schema.facility)
    .values(facilities)
    .onConflictDoNothing()
    .returning({ id: schema.facility.id });

  let facilityIds: number[] = insertedFacilities.map((f) => f.id);
  if (facilityIds.length === 0) {
    const existing = await db
      .select({ id: schema.facility.id })
      .from(schema.facility);
    facilityIds = existing.map((f) => f.id);
  }
  if (facilityIds.length === 0) {
    throw new Error("No facilities available to reference for residents.");
  }
  console.log("Facilities available:", facilityIds);

  // 6) Residents (reference valid facility ids) -------------------------------
  const residents = Array.from({ length: 50 }, (_, i) => {
    const facilityId = facilityIds[i % facilityIds.length];
    if (facilityId === undefined) {
      throw new Error(`No facilityId found for resident index ${i}`);
    }
    return {
      name: `Resident ${i + 1}`,
      facilityId,
      roomId: `Room ${i}`,
      pcciId: `PCCI ID ${i}`,
    };
  });
  await db.insert(schema.resident).values(residents).onConflictDoNothing();

  // 7) Templates — REMOVED base examples (Basic Safety, Infection Control, Nutrition & Hydration)
  //    We intentionally skip inserting those three base templates.

  // 8) Questions — REMOVED base example questions as well.

  // 9) FTags — keep your three example FTags, plus more will be created on the fly below
  const baseFtags = [
    { code: "F441", description: "Infection control" },
    { code: "F812", description: "Nutrition requirements" },
    { code: "F550", description: "Quality of care" },
  ];
  await db.insert(schema.ftag).values(baseFtags).onConflictDoNothing();

  // 10) Cases (unchanged) -----------------------------------------------------
  const cases = [
    { code: "C441", description: "Infection control" },
    { code: "C812", description: "Nutrition requirements" },
    { code: "C550", description: "Quality of care" },
  ];
  await db.insert(schema.cases).values(cases).onConflictDoNothing();

  // 11) Question-FTAG links — none for removed base examples

  // ==================== TEMPLATE PACKS FROM DOCX ====================
  // Helpers (idempotent upserts)
  async function ensureFtag(code: string) {
    const norm = code.trim();
    if (!norm) return null;
    const [ins] = await db
      .insert(schema.ftag)
      .values({ code: norm })
      .onConflictDoNothing()
      .returning({ id: schema.ftag.id });
    if (ins?.id) return ins.id;

    const found = await db
      .select({ id: schema.ftag.id })
      .from(schema.ftag)
      .where(sql`lower(${schema.ftag.code}) = ${norm.toLowerCase()}`)
      .limit(1);
    return found[0]?.id ?? null;
  }

  async function ensureTemplate(
    name: string,
    type: "resident" | "general" | "case",
  ) {
    const [ins] = await db
      .insert(schema.template)
      .values({ name, type })
      .onConflictDoNothing()
      .returning({ id: schema.template.id });
    if (ins?.id) return ins.id;

    const found = await db
      .select({ id: schema.template.id })
      .from(schema.template)
      .where(sql`${schema.template.name} = ${name} AND ${schema.template.type} = ${type}`)
      .limit(1);
    return found[0]?.id ?? null;
  }

  async function ensureQuestion(templateId: number, text: string, points: number) {
    const [ins] = await db
      .insert(schema.question)
      .values({ templateId, text, points })
      .onConflictDoNothing()
      .returning({ id: schema.question.id });
    if (ins?.id) return ins.id;

    const found = await db
      .select({ id: schema.question.id })
      .from(schema.question)
      .where(
        sql`${schema.question.templateId} = ${templateId} AND ${schema.question.text} = ${text}`,
      )
      .limit(1);
    return found[0]?.id ?? null;
  }

  type TemplatePack = {
    template: { name: string; type: "resident" | "general" | "case" };
    questions: Array<{ text: string; points: number; ftags?: string[] }>;
  };

  const packs: TemplatePack[] = [];

  // Activities
  packs.push({
    template: { name: "Activities", type: "resident" },
    questions: [
      { text: "An initial activity assessment was completed.", points: 10, ftags: ["F679"] },
      { text: "Activity care plan was developed", points: 10, ftags: ["F679","F656"] },
      { text: "Activities were consistent with residents’ interests and identified needs.", points: 5, ftags: ["F679"] },
      { text: "Quarterly assessments were conducted, and quarterly notes were documented.", points: 10, ftags: ["F679"] },
      { text: "Activities were posted and conducted as scheduled for both higher and lower functioning residents.", points: 10, ftags: ["F679"] },
      { text: "Programs were scheduled 7 days a week and for both days and evenings.", points: 10, ftags: ["F679"] },
      { text: "Participation log was maintained and reflected that the resident’s care plan was followed.", points: 10, ftags: ["F679"] },
      { text: "Residents received the necessary assistance to ensure that they were able to attend activities as planned.", points: 5, ftags: ["F679"] },
      { text: "CNAs were involved in activity programming when activity staff were unavailable.", points: 5, ftags: ["F679"] },
      { text: "Residents who refused activities were provided with possible alternatives.", points: 8, ftags: ["F679"] },
      { text: "Activities Director is qualified or has approved training/experience.", points: 7, ftags: ["F680"] },
      { text: "Resident council notes were available and follow-up documentation was present for any issue brought up.", points: 10, ftags: ["F565"] },
    ],
  });

  // Environment
  packs.push({
    template: { name: "Environment", type: "resident" },
    questions: [
      { text: "Sound levels were comfortable on nursing units and in common areas.", points: 2, ftags: ["F584"] },
      { text: "Room air temperatures were comfortable. Temperatures were between 71° and 81°F.", points: 2, ftags: ["F584"] },
      { text: "Lighting levels were adequate and comfortable for individual resident and staff needs.", points: 2, ftags: ["F584"] },
      { text: "Communication system exists to alert Maintenance Department for needed repairs.", points: 2, ftags: ["F584"] },
      { text: "Clean utility room clean/orderly; nothing stored under sink; only clean items.", points: 3, ftags: ["F584","F880"] },
      { text: "Ice machine was clean and properly functioning.", points: 3, ftags: ["F584","F880"] },
      { text: "Shower and tub rooms clean and odor free; nothing stored inappropriately.", points: 3, ftags: ["F584","F880"] },
      { text: "Privacy provided; shower curtains clean/proper; grab bars near tubs/showers/toilets.", points: 3, ftags: ["F583","F584"] },
      { text: "Showers and tub rooms free of improperly stored items, chemicals, and hazardous products.", points: 3, ftags: ["F584"] },
      { text: "Clean linen covered/stored; soiled linen appropriately covered.", points: 4, ftags: ["F880"] },
      { text: "Water temperature ≤110° in sinks/baths/showers; daily log maintained.", points: 4, ftags: ["F584","F689"] },
      { text: "Detailed plans/procedures for disasters, fire, weather emergencies, missing residents.", points: 3, ftags: ["F584"] },
      { text: "Halls uncluttered; items on one side of hall.", points: 3, ftags: ["F584"] },
      { text: "Handrails on both sides of hall clean, secure, free of sharp/rough edges.", points: 3, ftags: ["F584","F689"] },
      { text: "Floors in common areas and resident rooms clean and in good repair.", points: 3, ftags: ["F584"] },
      { text: "Walls and doors in common areas and resident rooms clean, stain-free, in good repair.", points: 3, ftags: ["F584"] },
      { text: "Ceiling tiles intact and stain-free; fixtures clean, secure, in good repair.", points: 3, ftags: ["F584"] },
      { text: "Resident rooms, bathrooms and common areas free of unpleasant odors.", points: 3, ftags: ["F584"] },
      { text: "Cleaning products not left on top of unattended housekeeping carts.", points: 4, ftags: ["F689"] },
      { text: "Resident call lights operable, visible, accessible.", points: 3, ftags: ["F919"] },
      { text: "Dining and activity areas adequately furnished with sufficient space.", points: 2, ftags: ["F920"] },
      { text: "Each resident room has privacy curtains in good repair.", points: 3, ftags: ["F583"] },
      { text: "Each resident room furnished with functional furniture in good repair.", points: 2, ftags: ["F910"] },
      { text: "Individual closet space with clothes racks and shelves.", points: 4, ftags: ["F910"] },
      { text: "Bed brakes on resident beds intact and operable.", points: 3, ftags: ["F908"] },
      { text: "Linen clean, stain-free, and in good repair.", points: 2, ftags: ["F880"] },
      { text: "Resident rooms contain personal belongings to extent possible.", points: 3, ftags: ["F584"] },
      { text: "Chemicals stored appropriately, labeled; no aerosols in utility room.", points: 3, ftags: ["F689"] },
      { text: 'Items stored 3" off the floor and 18" from sprinkler heads in all areas.', points: 3, ftags: ["F584"] },
      { text: "Paper goods stored separately from any chemicals.", points: 2, ftags: ["F689"] },
      { text: "MSDS available for hazardous chemicals; accessible; staff aware of location.", points: 2, ftags: ["F689"] },
      { text: "Eye wash stations present, accessible, maintained per manufacturer, functioning.", points: 2, ftags: ["F584"] },
      { text: "Environment pest-free; pest control log describes actions/locations for each visit.", points: 2, ftags: ["F925"] },
      { text: "Wet floor signs used correctly; only 1/2 corridor mopped at a time; arrow points to wet side.", points: 3, ftags: ["F689"] },
      { text: "Sharps containers available; not filled past 2/3rds mark.", points: 3, ftags: ["F689"] },
      { text: "Mechanical lift and resident equipment maintained; safe operating condition.", points: 2, ftags: ["F908"] },
    ],
  });

  // Falls / Falls Prevention
  packs.push({
    template: { name: "Falls / Falls Prevention", type: "resident" },
    questions: [
      { text: "Notification of condition change (MD/NP, family/HCP, documentation, orders).", points: 10, ftags: ["F580"] },
      { text: "If fall/injury required hospital transfer, MD order for transfer obtained.", points: 3, ftags: ["F623","F625"] },
      { text: "Discharge/Transfer Evaluation and Bed Hold Notice completed/sent when warranted.", points: 5, ftags: ["F623","F625"] },
      { text: "Comprehensive nurses note regarding the fall present.", points: 5, ftags: ["F689"] },
      { text: "Accident/Incident report completed.", points: 6, ftags: ["F689"] },
      { text: "Investigation file includes staff statements for each fall.", points: 8, ftags: ["F689"] },
      { text: "Resident identified as 'at risk' via accurate fall risk assessment.", points: 5, ftags: ["F689"] },
      { text: "Fall prevention plan of care developed based on risk assessment.", points: 10, ftags: ["F656"] },
      { text: "Immediate/appropriate post-fall intervention on Care Plan and CNA Kardex.", points: 10, ftags: ["F656","F689"] },
      { text: "Intervention implemented and known by staff.", points: 10, ftags: ["F656","F689"] },
      { text: "MDS assessment coded correctly for any falls.", points: 5, ftags: ["F641"] },
      { text: "Neuro signs conducted per protocol (unwitnessed fall/head strike).", points: 5, ftags: ["F689"] },
      { text: "Pain assessment completed after the fall.", points: 6, ftags: ["F689"] },
      { text: "Resident reviewed during weekly Risk Meeting for 4 weeks post-fall.", points: 6, ftags: ["F689"] },
      { text: "Falls included in monthly QI reporting.", points: 6, ftags: ["F867"] },
    ],
  });

  // Immunizations
  packs.push({
    template: { name: "Immunizations", type: "resident" },
    questions: [
      { text: "Residents received a two-step PPD if admitted since the last QISV.", points: 10, ftags: ["F880"] },
      { text: "Consent for Flu, Pneumovax, COVID on admission; consent/declination documented.", points: 15, ftags: ["F883","F887"] },
      { text: "Vaccines administered as indicated.", points: 15, ftags: ["F887"] },
      { text: "Education provided/documented for Flu, Pneumovax, COVID (regardless of receipt).", points: 15, ftags: ["F883","F887"] },
      { text: "Immunization record complete (flu, pneumovax, COVID, PPD).", points: 15, ftags: ["F883","F887"] },
      { text: "MDS coded correctly for resident's immunizations.", points: 10, ftags: ["F641"] },
      { text: "During respiratory season, a log of employees who received/declined flu vaccine exists.", points: 10, ftags: ["F883"] },
      { text: "Physician’s orders present for Flu, Pneumovax, and COVID vaccines.", points: 10, ftags: ["F883","F887"] },
    ],
  });

  // Infection Control (new detailed pack)
  packs.push({
    template: { name: "Infection Control (Detailed)", type: "resident" },
    questions: [
      { text: "Facility has a system to prevent, monitor and investigate causes of infection.", points: 5, ftags: ["F880"] },
      { text: "Infection control line listings are maintained monthly (all data completed).", points: 15, ftags: ["F880"] },
      { text: "Evidence of monthly infection surveillance with trend analysis and corrective actions.", points: 15, ftags: ["F880"] },
      { text: "Precaution rooms posted with correct signage; staff can verbalize type of infection.", points: 10, ftags: ["F880"] },
      { text: "Handwashing conducted appropriately.", points: 8, ftags: ["F880"] },
      { text: "Resident care equipment properly cleaned, changed and stored.", points: 5, ftags: ["F880"] },
      { text: "Linens handled appropriately; clean/soiled stored separately (observe laundry).", points: 5, ftags: ["F880"] },
      { text: "Hands/equipment washed between residents; gloves used properly (not worn in hallway).", points: 10, ftags: ["F880"] },
      { text: "Oxygen tubing changed/dated weekly; bagged when not in use; O2 filters clean.", points: 7, ftags: ["F880"] },
      { text: "Nebulizer tubing changed weekly and bagged or in holder when not in use.", points: 5, ftags: ["F880"] },
      { text: "Feeding tube syringes and TF bottles changed and dated every 24 hours.", points: 5, ftags: ["F880"] },
      { text: "Linen not stored in rooms; hampers lidded, not overflowing; removed during meals.", points: 5, ftags: ["F880"] },
      { text: "Glucometers cleaned between resident use.", points: 5, ftags: ["F880"] },
    ],
  });

  // Medication Pass Administration and Documentation
  packs.push({
    template: { name: "Medication Pass Administration and Documentation", type: "resident" },
    questions: [
      { text: "Nurse washed hands prior to pass and after each contact (approved hand-cleaning allowed).", points: 10, ftags: ["F880"] },
      { text: "MAR reviewed prior to preparing medications.", points: 5, ftags: ["F758"] },
      { text: "All medication orders had name, strength, frequency, route, PRN reason.", points: 5, ftags: ["F758"] },
      { text: "Resident identified prior to administration.", points: 5, ftags: ["F758"] },
      { text: "Appropriate vitals taken/documented when warranted.", points: 5, ftags: ["F758"] },
      { text: "Special preparation/administration directions followed (e.g., liquids shaken).", points: 5, ftags: ["F758"] },
      { text: "Only medications identified as crushable were crushed.", points: 5, ftags: ["F758"] },
      { text: "Six R’s followed (right resident, med, dose, route, time, documented).", points: 15, ftags: ["F758"] },
      { text: "Same nurse prepared and administered; stayed until taken.", points: 5, ftags: ["F758"] },
      { text: "All medications documented per policy.", points: 5, ftags: ["F758"] },
      { text: "Injection sites documented on MAR.", points: 5, ftags: ["F758"] },
      { text: "Used needles/syringes not recapped/broken; disposed in puncture-resistant container.", points: 5, ftags: ["F758"] },
      { text: "Refused/omitted meds documented with reason on MAR.", points: 5, ftags: ["F758"] },
      { text: "PRN meds: reason and result documented on MAR.", points: 5, ftags: ["F758"] },
      { text: "Pass completed within 1 hour before/after designated time.", points: 10, ftags: ["F758"] },
      { text: "Self-administration: order, assessment, and care plan present.", points: 5, ftags: ["F554"] },
    ],
  });

  // Nursing Unit Observation
  packs.push({
    template: { name: "Nursing Unit Observation", type: "resident" },
    questions: [
      { text: "No confidential resident info left in view (charts, MARs, labs, notes, etc.).", points: 8, ftags: ["F583"] },
      { text: "Each CNA received pertinent info for assigned residents.", points: 7, ftags: ["F656"] },
      { text: "Emergency cart and suction available, checked daily, documented.", points: 7, ftags: ["F658"] },
      { text: "Emergency oxygen available/ready with gauge; wrench with tank.", points: 7, ftags: ["F658"] },
      { text: "Oxygen stored appropriately; 'Oxygen – No Smoking' signs posted where stored/in use.", points: 8, ftags: ["F921"] },
      { text: "Infectious waste handled appropriately, covered, biohazard-labeled, stored locked.", points: 10, ftags: ["F921"] },
      { text: "Hazardous products stored locked when not in use or under direct supervision in use.", points: 8, ftags: ["F689","F921"] },
      { text: "Open sterile pour bottles dated/initialed; discarded ≤24h; treatment creams labeled/intact.", points: 12, ftags: ["F880"] },
      { text: "Staff knock and announce before entering resident rooms.", points: 7, ftags: ["F583"] },
      { text: "Call lights answered timely.", points: 8, ftags: ["F550","F689"] },
      { text: "Bedpans/urinals/graduates clean and stored appropriately.", points: 4, ftags: ["F880"] },
      { text: "No personal items left in shower room.", points: 7, ftags: ["F880"] },
      { text: "Food items in rooms stored properly in sealed containers.", points: 7, ftags: ["F812"] },
    ],
  });

  // Pressure Sore / Ulcer
  packs.push({
    template: { name: "Pressure Sore / Ulcer", type: "resident" },
    questions: [
      { text: "PU on admission identified on Nursing Admission Assessment; documented/measured same day.", points: 10, ftags: ["F658","F686"] },
      { text: "Corresponding treatment order present on the day PU identified.", points: 10, ftags: ["F686"] },
      { text: "Resident seen by wound provider; recommendations/treatment addressed and documented.", points: 5, ftags: ["F658"] },
      { text: "MD/NP and responsible party notified of new/worsening PU.", points: 5, ftags: ["F580"] },
      { text: "Order transcribed correctly on TAR.", points: 5, ftags: ["F686"] },
      { text: "Weekly skin assessments completed; accurately reflect skin condition.", points: 10, ftags: ["F686","F842"] },
      { text: "High risk for PU addressed on plan of care.", points: 5, ftags: ["F656","F686"] },
      { text: "Comprehensive care plan in place to prevent/heal PUs.", points: 5, ftags: ["F656","F686"] },
      { text: "Pressure Ulcer Evaluation accurately completed weekly.", points: 10, ftags: ["F686"] },
      { text: "Dietician documented area; recommendations carried out.", points: 5, ftags: ["F692"] },
      { text: "Specialty mattress ordered and set per MD order where applicable.", points: 5, ftags: ["F686"] },
      { text: "MDS coded correctly for PU.", points: 5, ftags: ["F641"] },
      { text: "Resident followed in weekly at-risk meetings until PU resolved.", points: 5, ftags: ["F686"] },
      { text: "MD/NP visited since PU development; progress note addresses PU.", points: 5, ftags: ["F711"] },
      { text: "Wound treatment performed per order; infection control practices followed.", points: 10, ftags: ["F880"] },
    ],
  });

  // Resident Care Review
  packs.push({
    template: { name: "Resident Care Review", type: "resident" },
    questions: [
      { text: "ID bracelet or facility identification system in place (photo in PCC).", points: 4, ftags: [] },
      { text: "Resident’s hair is clean and combed.", points: 5, ftags: ["F557"] },
      { text: "Resident’s eyes clean, free of irritation/redness.", points: 2, ftags: ["F676"] },
      { text: "Eyeglasses clean and in good repair.", points: 2, ftags: ["F677"] },
      { text: "Staff respond appropriately to behavioral symptoms (crying out, disrobing, agitation).", points: 10, ftags: ["F557","F741"] },
      { text: "Assistive devices applied appropriately, clean, in good repair.", points: 8, ftags: ["F676","F677"] },
      { text: "Mouth and lips moist, clean, free of offensive odors.", points: 8, ftags: ["F676","F677"] },
      { text: "Resident free of undesired facial hair or per documented preference.", points: 10, ftags: ["F557"] },
      { text: "Finger/toe nails clean and trimmed.", points: 7, ftags: ["F557","F676","F677"] },
      { text: "Residents appropriately positioned and aligned; appropriate footwear.", points: 8, ftags: ["F676","F677"] },
      { text: "Preventative mattresses, air mattresses, handrolls, heel/elbow protectors, cushions clean and working.", points: 8, ftags: ["F908"] },
      { text: "Adequate and comfortable lighting in rooms and other areas.", points: 5, ftags: ["F584"] },
      { text: "Room individualized with personal belongings as desired.", points: 5, ftags: ["F558"] },
      { text: "Comfortable sound levels maintained.", points: 8, ftags: ["F584"] },
      { text: "Privacy provided (curtain closed, knock before entry, authorized staff only).", points: 10, ftags: ["F557"] },
    ],
  });

  // Unnecessary Medications
  packs.push({
    template: { name: "Unnecessary Medications", type: "resident" },
    questions: [
      { text: "Medications have appropriate indications/diagnoses.", points: 10, ftags: ["F757"] },
      { text: "Physician documents rationale for duplicate medication therapy.", points: 9, ftags: ["F757","F758"] },
      { text: "Written, informed consent present for any psychotropic medication.", points: 5, ftags: ["F551","R9000"] },
      { text: "Annual consent present for psychotropic medication.", points: 5, ftags: ["F551","R9000"] },
      { text: "Rogers Guardianship current and reflects antipsychotic dose, if applicable.", points: 5, ftags: ["F551","R9000"] },
      { text: "AIMS test conducted every 6 months while on antipsychotic.", points: 9, ftags: ["F758"] },
      { text: "Behavior monitoring for which psychotropic medication was prescribed.", points: 9, ftags: ["F758"] },
      { text: "Monthly pharmacist drug regimen review.", points: 4, ftags: ["F756"] },
      { text: "Pharmacy recommendations reported and addressed timely.", points: 4, ftags: ["F756"] },
      { text: "Off-site review conducted for short-term (<30 days) or change in status.", points: 7, ftags: ["F756"] },
      { text: "CAA for psychotropic drug use documented; MDS coded correctly.", points: 7, ftags: ["F641"] },
      { text: "Care plan developed and followed for any psychotropic medication.", points: 8, ftags: ["F656"] },
      { text: "Sedative/hypnotic used routinely beyond duration tapered quarterly unless contraindicated.", points: 8, ftags: ["F758"] },
      { text: "PRN psychotropic meds have 14-day stop; renew with rationale and new stop date.", points: 10, ftags: ["F758"] },
    ],
  });

  // Upsert all packs
  for (const pack of packs) {
    const tId = await ensureTemplate(pack.template.name, pack.template.type);
    if (!tId) throw new Error(`Failed to upsert template ${pack.template.name}`);

    for (const q of pack.questions) {
      if (typeof q.points !== "number" || Number.isNaN(q.points)) {
        throw new Error(
          `Invalid "points" for question "${q.text}" in "${pack.template.name}"`,
        );
      }
      const qId = await ensureQuestion(tId, q.text, q.points);
      if (!qId) {
        throw new Error(
          `Failed to upsert question "${q.text}" for template "${pack.template.name}"`,
        );
      }

      if (q.ftags && q.ftags.length > 0) {
        for (const code of q.ftags) {
          const fId = await ensureFtag(code);
          if (!fId) {
            console.warn(
              `Skipping link: F-tag "${code}" not created/found for question "${q.text}"`,
            );
            continue;
          }
          await db
            .insert(schema.questionFtag)
            .values({ questionId: qId, ftagId: fId })
            .onConflictDoNothing();
        }
      }
    }
  }
  // ==================== END PACKS ====================

  console.log("✅ Seed complete");
  await conn.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
