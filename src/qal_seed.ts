// src/qal_seed.ts
// ESM-safe, hardcoded DB URL, deterministic data (no XLSX).

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { sql, eq } from "drizzle-orm";

// 1) CHANGE THIS to your actual connection string
const HARDCODED_DB_URL =
  "postgresql://postgres:Rahul@2025@db.odjkzowqixaqpesalenl.supabase.co:5432/postgres"; // ← replace

const db = drizzle(
  postgres(HARDCODED_DB_URL, {
    max: 1,
    prepare: false,
  }),
);

// Import schema
import {
  facility,
  qalTemplate,
  qalSection,
  qalQuestion,
} from "@/server/db/schema";

// Facilities (dummy, aligned with earlier examples)
// const FACILITIES: Array<{ name: string; address: string; facilityCode?: string }> = [
//   { name: "West Newton", address: "100 Main St, PA", facilityCode: "WN01" },
//   { name: "East Hills", address: "200 Hill Rd, PA", facilityCode: "EH02" },
//   { name: "Pine Grove", address: "300 Pine Ave, PA", facilityCode: "PG03" },
//   { name: "Maple Ridge", address: "400 Maple St, PA", facilityCode: "MR04" },
// ];

// QAL sections and points (from workbook totals)
const SECTION_DEFS: Array<{ title: string; pts: number; prompts: string[] }> = [
  {
    title: "Admissions",
    pts: 35,
    prompts: [
      "Insurance verification completed prior to admission",
      "72-hour meeting documented",
      "Admissions questionnaire completed",
      "PPA worksheet completed",
      "Admission payer source documented",
      "Care levels and authorizations verified",
    ],
  },
  {
    title: "Census",
    pts: 40,
    prompts: [
      "Profiles posted timely and accurately",
      "Census rates updated for changes",
      "Levels and authorizations current",
      "Discharges and admissions reflected promptly",
    ],
  },
  {
    title: "AR Private",
    pts: 75,
    prompts: [
      "Private AR accurately booked",
      "Statements generated per policy",
      "Collections documented according to policy",
      "Escalation steps followed when delinquent",
      "Payment plans documented when applicable",
      "Write-offs approved and documented",
    ],
  },
  {
    title: "Medicaid Pending",
    pts: 50,
    prompts: [
      "Vetting completed for all pending cases",
      "Partnered with Medicaid Eligibility Specialist",
      "Required documentation submitted timely",
      "Timely escalation documented when blocked",
      "Follow-up cadence maintained until determination",
    ],
  },
  {
    title: "AR Other",
    pts: 20,
    prompts: [
      "Open activities set accurately",
      "Open activities addressed timely",
      "Aging reviewed and actioned",
    ],
  },
  {
    title: "Managed Care/Insurance",
    pts: 30,
    prompts: [
      "Authorizations verified and current",
      "Insurance billing accuracy checks performed",
      "Denials tracked and appealed timely",
      "Remittance advice reconciled",
    ],
  },
  {
    title: "MISC Tab PCC",
    pts: 10,
    prompts: [
      "PCC MISC tab maintained per policy",
      "Required documentation attached",
    ],
  },
  {
    title: "Cash Handling",
    pts: 0,
    prompts: [
      "Cash handling controls in place",
      "Daily reconciliation performed",
      "Deposits made per policy timelines",
    ],
  },
  {
    title: "Accounts Payable Ancillaries",
    pts: 20,
    prompts: [
      "Ancillary invoices matched to services",
      "Units/pricing verified",
      "Approvals documented before payment",
    ],
  },
  {
    title: "Resident Trust Fund Management",
    pts: 110,
    prompts: [
      "RTF ledger reconciled monthly",
      "Resident signatures/receipts on file",
      "Bank reconciliation current",
      "Interest allocation (if applicable) documented",
      "Disbursements approved and documented",
      "Inactive balances reviewed and resolved",
    ],
  },
];

// async function upsertFacilities() {
//   for (const f of FACILITIES) {
//     if (f.facilityCode) {
//       const found = await db.select().from(facility).where(eq(facility.facilityCode, f.facilityCode)).limit(1);
//       if (found.length === 0) {
//         await db.insert(facility).values({
//           name: f.name,
//           address: f.address,
//           facilityCode: f.facilityCode,
//         });
//       } else {
//         await db
//           .update(facility)
//           .set({ name: f.name, address: f.address })
//           .where(eq(facility.id, found[0]!.id));
//       }
//     } else {
//       const found = await db.select().from(facility).where(eq(facility.name, f.name)).limit(1);
//       if (found.length === 0) {
//         await db.insert(facility).values({ name: f.name, address: f.address });
//       } else {
//         await db.update(facility).set({ address: f.address }).where(eq(facility.id, found[0]!.id));
//       }
//     }
//   }
// }

export async function seedQALDeterministic() {
  // 1) Facilities
  // await upsertFacilities();

  // 2) Inactivate prior QAL templates
  await db.execute(sql`UPDATE "qal_template" SET "is_active" = false WHERE "is_active" = true;`);

  // 3) Create active template
  const [tpl] = await db.insert(qalTemplate).values({ name: "RCO QAL Audit", isActive: true }).returning();
  if (!tpl) throw new Error("Failed to create QAL template");

  // 4) Insert sections
  const sections = await db
    .insert(qalSection)
    .values(
      SECTION_DEFS.map((s, i) => ({
        templateId: tpl.id,
        title: s.title,
        description: null,
        possiblePoints: s.pts,
        sortOrder: i + 1,
      })),
    )
    .returning();

  if (sections.length !== SECTION_DEFS.length) {
    throw new Error(`Inserted ${sections.length} sections, expected ${SECTION_DEFS.length}`);
  }

  const idByTitle = new Map<string, number>();
  for (const s of sections) idByTitle.set(s.title, s.id);

  // 5) Insert questions
  for (const def of SECTION_DEFS) {
    const sid = idByTitle.get(def.title);
    if (!sid) continue;
    const values = def.prompts.map((p, i) => ({
      sectionId: sid,
      prompt: p,
      guidance: null,
      weight: 1,
      sortOrder: i + 1,
    }));
    if (values.length) {
      await db.insert(qalQuestion).values(values);
    }
  }

  // 6) Done
  const facCount = (await db.select().from(facility)).length;
  console.log(
    `QAL deterministic seed complete: template=${tpl.id}, sections=${sections.length}, facilities=${facCount}`,
  );
}

// ESM-safe entry
const isDirectRun =
  typeof process !== "undefined" &&
  Array.isArray(process.argv) &&
  (process.argv[1]?.endsWith("qal_seed.ts") || process.argv[1]?.endsWith("qal_seed.js"));

if (isDirectRun) {
  seedQALDeterministic()
    .then(() => {
      console.log("QAL seeding done");
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
