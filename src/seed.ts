import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/server/db/schema";
import { sql } from "drizzle-orm";
import { reset } from "drizzle-seed";
import crypto from "crypto";

async function main() {
  const DATABASE_URL = "postgresql://admin:admin123@localhost:5435/next-step";
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
  const [{ count: memberCount }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.member);

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
  const residents = Array.from({ length: 50 }, (_, i) => ({
    name: `Resident ${i + 1}`,
    facilityId: facilityIds[i % facilityIds.length],
    roomId: `Room ${i}`,
    pcciId: `PCCI ID ${i}`,
  }));
  await db.insert(schema.resident).values(residents).onConflictDoNothing();

  // 7) Templates --------------------------------------------------------------
  const templates = [
    { name: "Basic Safety", type: "resident" as const },
    { name: "Infection Control", type: "resident" as const },
    { name: "Nutrition & Hydration", type: "resident" as const },
  ];
  const insertedTemplates = await db
    .insert(schema.template)
    .values(templates)
    .onConflictDoNothing()
    .returning({ id: schema.template.id });

  let templateIds: number[] = insertedTemplates.map((t) => t.id);
  if (templateIds.length === 0) {
    const existing = await db
      .select({ id: schema.template.id })
      .from(schema.template);
    templateIds = existing.map((t) => t.id);
  }
  if (templateIds.length === 0) {
    throw new Error("No templates available for questions.");
  }
  console.log("Templates available:", templateIds);

  // 8) Questions (each row MUST have a single numeric templateId) -------------
  const qData = [
    {
      text: "Hand-washing supplies accessible?",
      templateId: templateIds[0],
      points: 10,
    },
    {
      text: "Staff perform hand hygiene?",
      templateId: templateIds[0],
      points: 10,
    },
    {
      text: "PPE available and used correctly?",
      templateId: templateIds[0],
      points: 10,
    },
    {
      text: "Isolation protocols followed?",
      templateId: templateIds[1] ?? templateIds[0],
      points: 10,
    },
    {
      text: "Menus meet resident needs?",
      templateId: templateIds[2] ?? templateIds[0],
      points: 10,
    },
  ];

  for (const q of qData) {
    if (typeof q.templateId !== "number" || Number.isNaN(q.templateId)) {
      throw new Error(
        `Invalid templateId for question "${q.text}": ${String(q.templateId)}`,
      );
    }
  }

  const insertedQuestions = await db
    .insert(schema.question)
    .values(qData)
    .onConflictDoNothing()
    .returning({ id: schema.question.id });

  let questionIds: number[] = insertedQuestions.map((q) => q.id);
  if (questionIds.length === 0) {
    const existing = await db
      .select({ id: schema.question.id })
      .from(schema.question);
    questionIds = existing.map((q) => q.id);
  }
  if (questionIds.length === 0) {
    throw new Error("No questions available.");
  }

  // 9) FTags ------------------------------------------------------------------
  const ftags = [
    { code: "F441", description: "Infection control" },
    { code: "F812", description: "Nutrition requirements" },
    { code: "F550", description: "Quality of care" },
  ];
  const insertedFtags = await db
    .insert(schema.ftag)
    .values(ftags)
    .onConflictDoNothing()
    .returning({ id: schema.ftag.id });

  let ftagIds: number[] = insertedFtags.map((f) => f.id);
  if (ftagIds.length === 0) {
    const existing = await db.select({ id: schema.ftag.id }).from(schema.ftag);
    ftagIds = existing.map((f) => f.id);
  }

  // 10) Cases -----------------------------------------------------------------
  const cases = [
    { code: "C441", description: "Infection control" },
    { code: "C812", description: "Nutrition requirements" },
    { code: "C550", description: "Quality of care" },
  ];
  await db.insert(schema.cases).values(cases).onConflictDoNothing();

  // 11) Question-FTAG links ---------------------------------------------------
  const qfValues: { questionId: number; ftagId: number }[] = [];
  if (questionIds[0] && ftagIds[0])
    qfValues.push({ questionId: questionIds[0], ftagId: ftagIds[0] });
  if (questionIds[1] && ftagIds[0])
    qfValues.push({ questionId: questionIds[1], ftagId: ftagIds[0] });
  if (questionIds[2] && ftagIds[0])
    qfValues.push({ questionId: questionIds[2], ftagId: ftagIds[0] });
  if (questionIds[3] && ftagIds[0])
    qfValues.push({ questionId: questionIds[3], ftagId: ftagIds[0] });
  if (questionIds[4] && ftagIds[1])
    qfValues.push({ questionId: questionIds[4], ftagId: ftagIds[1] });

  if (qfValues.length > 0) {
    await db.insert(schema.questionFtag).values(qfValues).onConflictDoNothing();
  }

  console.log("✅ Seed complete");
  await conn.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
