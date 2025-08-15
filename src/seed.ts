// src/db/seed.ts
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/server/db/schema";
import { sql } from "drizzle-orm";
import { reset, seed } from "drizzle-seed";

const DATABASE_URL = "postgresql://admin:admin123@localhost:5435/next-step";
const conn = postgres(DATABASE_URL, { max: 1 });
const db = drizzle(conn, { schema });

async function main() {
  await reset(db, schema);

  // 1. Admin user & account ---------------------------------------------------
  await db
    .insert(schema.user)
    .values({
      id: "IS3vjXfQjv3s8pcHTlUp2gJv91i9JIAX",
      name: "Admin",
      email: "admin@mail.com",
      emailVerified: false,
    })
    .onConflictDoNothing();

  await db
    .insert(schema.user)
    .values({
      id: "jWAs08rV8ZXSD6q8drXDrLXPNHlRQ5RB",
      name: "Deon",
      email: "deon@mail.com",
      emailVerified: false,
    })
    .onConflictDoNothing();

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

  // 2. Organisations ----------------------------------------------------------
  const orgs = [
    {
      id: "zI0djKRJb4HHgsPvm9J7PqVMtH9LGI2b",
      name: "QISV",
      slug: "qisv",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "V0Pt1WuCS7PC4xIXezjQIeFsr8NAcsXc",
      name: "QAL",
      slug: "qal",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "QnhkP7TAfPMm4ZG8B0IOXWZPUbuy41Co",
      name: "Dietary",
      slug: "dietary",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];
  await db.insert(schema.organization).values(orgs).onConflictDoNothing();

  // 3. Memberships ------------------------------------------------------------
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
      updatedAt: new Date(),
    }));
    await db.insert(schema.member).values(memberships);
  }

  // 4. Facilities -------------------------------------------------------------
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
  await db
    .insert(schema.facility)
    .values(facilities)
    .onConflictDoNothing()
    .returning();

  const residents = Array.from({ length: 50 }, (_, i) => ({
    name: `Resident ${i + 1}`,
    facilityId: (i % facilities.length) + 1,
    roomId: `Room ${i}`,
    pcciId: `PCCI ID ${i}`,
  }));
  await db.insert(schema.resident).values(residents).onConflictDoNothing();

  // 5. Templates --------------------------------------------------------------
  const templates = [
    { name: "Basic Safety", type: "resident" },
    { name: "Infection Control", type: "resident" },
    { name: "Nutrition & Hydration", type: "resident" },
  ];
  await db.insert(schema.template).values(templates).onConflictDoNothing();

  // 6. Questions --------------------------------------------------------------
  const questions = [
    { text: "Hand-washing supplies accessible?", templateId: 1, points: 10 },
    { text: "Staff perform hand hygiene?", templateId: 1, points: 10 },
    { text: "PPE available and used correctly?", templateId: 1, points: 10 },
    { text: "Isolation protocols followed?", templateId: 2, points: 10 },
    { text: "Menus meet resident needs?", templateId: 3, points: 10 },
  ];
  await db.insert(schema.question).values(questions).onConflictDoNothing();

  // 7. FTags ------------------------------------------------------------------
  const ftags = [
    { code: "F441", description: "Infection control" },
    { code: "F812", description: "Nutrition requirements" },
    { code: "F550", description: "Quality of care" },
  ];
  await db.insert(schema.ftag).values(ftags).onConflictDoNothing();

  // 7.1 Cases ------------------------------------------------------------------
  const cases = [
    { code: "C441", description: "Infection control" },
    { code: "C812", description: "Nutrition requirements" },
    { code: "C550", description: "Quality of care" },
  ];
  await db.insert(schema.cases).values(cases).onConflictDoNothing();

  // 8. Question-FTag links ----------------------------------------------------
  await db
    .insert(schema.questionFtag)
    .values([
      { questionId: 1, ftagId: 1 },
      { questionId: 2, ftagId: 1 },
      { questionId: 3, ftagId: 1 },
      { questionId: 4, ftagId: 1 },
      { questionId: 5, ftagId: 2 },
    ])
    .onConflictDoNothing();

  console.log("✅ Seed complete");
  await conn.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
