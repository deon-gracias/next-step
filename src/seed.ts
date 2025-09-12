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
    name: "Dexter House Healthcare",
    address: "120 Main Street, Malden, MA 02148",
  },
  {
    name: "The Elmhurst Healthcare",
    address: "743 Main Street, Melrose, MA 02176",
  },
  {
    name: "Melrose Healthcare",
    address: "40 Martin Street, Melrose, MA 02176",
  },
  {
    name: "West Newton Healthcare",
    address: "25 Armory Street, West Newton, MA 02465",
  },
  {
    name: "Fall River Healthcare",
    address: "1748 Highland Avenue, Fall River, MA 02720",
  },
  {
    name: "Garden Place Healthcare",
    address: "193 Pleasant Street, Attleboro, MA 02703",
  },
  {
    name: "Norwood Healthcare",
    address: "460 Washington Street, Norwood, MA 02062",
  },
  {
    name: "Oakhill Healthcare",
    address: "76 North Street, Middleboro, MA 02346",
  },
  {
    name: "Plymouth Harborside Healthcare",
    address: "19 Obery Street, Plymouth, MA 02360",
  },
  {
    name: "Walpole Healthcare",
    address: "160 Main Street, Walpole, MA 02081",
  },
  {
    name: "Wedgemere Healthcare",
    address: "146 Dean Street, Taunton, MA 02780",
  },
  {
    name: "Fitchburg Healthcare",
    address: "1199 John Fitch Highway, Fitchburg, MA 01420",
  },
  {
    name: "The Hermitage Healthcare",
    address: "383 Mill Street, Worcester, MA 01602",
  },
  {
    name: "The Landing at Laurel Lake",
    address: "600 Laurel Street, Lee, MA 01238",
  },
  {
    name: "Lee Healthcare",
    address: "620 Laurel Street, Lee, MA 01238",
  },
  {
    name: "Westborough Healthcare",
    address: "8 Colonial Drive, Westborough, MA 01581",
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
      { text: "Activities were consistent with residents' interests and identified needs.", points: 5, ftags: ["F679"] },
      { text: "Quarterly assessments were conducted, and quarterly notes were documented.", points: 10, ftags: ["F679"] },
      { text: "Activities were posted and conducted as scheduled for both higher and lower functioning residents.", points: 10, ftags: ["F679"] },
      { text: "Programs were scheduled 7 days a week and for both days and evenings.", points: 10, ftags: ["F679"] },
      { text: "Participation log was maintained and reflected that the resident's care plan was followed.", points: 10, ftags: ["F679"] },
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
      { text: "Physician's orders present for Flu, Pneumovax, and COVID vaccines.", points: 10, ftags: ["F883","F887"] },
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
      { text: "Six R's followed (right resident, med, dose, route, time, documented).", points: 15, ftags: ["F758"] },
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
      { text: "Resident's hair is clean and combed.", points: 5, ftags: ["F557"] },
      { text: "Resident's eyes clean, free of irritation/redness.", points: 2, ftags: ["F676"] },
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

  // ==================== FIRST BATCH OF NEW TEMPLATES ====================
  
  // Abuse Prohibition (from Abuse-QISVF001.docx)
  packs.push({
    template: { name: "Abuse Prohibition", type: "resident" },
    questions: [
      { text: "There was written evidence of how the facility handled alleged violations, per review of the investigation file and handled internally.", points: 10, ftags: ["F600","F609"] },
      { text: "The file included supporting documentation per investigation list.", points: 15, ftags: ["F600","F609"] },
      { text: "The facility had implemented adequate procedures: For protection of the resident during the investigation, For the provision of corrective action.", points: 10, ftags: ["F600","F609"] },
      { text: "The written report included both the alleged violation and summary/results of the investigation.", points: 15, ftags: ["F600","F610"] },
      { text: "The allegation and subsequent investigation was reported to the State as warranted within the reported timeframe.", points: 15, ftags: ["F600","F602","F610"] },
      { text: "Staff were aware of what to report, to whom, and when to report.", points: 15, ftags: ["F609"] },
      { text: "The staff received education on the facility's Abuse Prevention Program at least annually.", points: 20, ftags: ["F607","F609"] },
    ],
  });

  // Elopement (from Elopement-QISVF0033.docx)
  packs.push({
    template: { name: "Elopement", type: "resident" },
    questions: [
      { text: "Has an elopement evaluation been completed quarterly", points: 15, ftags: ["F689"] },
      { text: "If the resident is noted to be at risk, if the resident is on a secure unit or order for wanderguard device", points: 10, ftags: ["F689"] },
      { text: "Does the order for wanerguard include: location expiration date, check placement q shift and function weekly", points: 10, ftags: ["F689"] },
      { text: "Does the resident have an individual care plan for elopement", points: 10, ftags: ["F689","F656"] },
      { text: "If order for a wandergaurd is the device on per observation", points: 20, ftags: ["F689"] },
      { text: "Are elopement binder noted on each unit and in reception area", points: 15, ftags: ["F689"] },
      { text: "Is there evidence of maintenance checking the wandergaurd system monthly", points: 20, ftags: ["F689"] },
    ],
  });

  // Dialysis (from Dialysis-QISVF0035.docx)
  packs.push({
    template: { name: "Dialysis", type: "resident" },
    questions: [
      { text: "Physician's orders for dialysis access care, dialysis center, times and days of treatment", points: 15, ftags: ["F698"] },
      { text: "Orders for no for blood pressure on the same side as the shunt", points: 10, ftags: ["F698"] },
      { text: "Order to not administer MOM to the resident", points: 10, ftags: ["F698"] },
      { text: "Are the resident medication appropriately schedule around dialysis times", points: 10, ftags: ["F698"] },
      { text: "Care plan for dialysis", points: 10, ftags: ["F655"] },
      { text: "Dialysis book with communication to and from the facility and dialysis treatment center", points: 20, ftags: ["F698"] },
      { text: "Emergency care order", points: 10, ftags: ["F698"] },
      { text: "If Tessio cath is there a emergency kit at bedside", points: 15, ftags: ["F698"] },
    ],
  });

  // Dining and Food Service (from Dining-and-Food-Service-QISVF004.docx)
  packs.push({
    template: { name: "Dining and Food Service", type: "resident" },
    questions: [
      { text: "A homelike environment was provided during the dining services that enhanced the resident's quality of life.", points: 2, ftags: ["F584"] },
      { text: "The tables had tables clothes and placemats.", points: 2, ftags: ["F584"] },
      { text: "The TV was turned off and appropriate music was playing.", points: 1, ftags: ["F584"] },
      { text: "Medications were not passed in the dining room unless medications were required to be served with food.", points: 3, ftags: ["F584","F550"] },
      { text: "There was sufficient space which allowed ease of movement in and out of dining area safely.", points: 4, ftags: ["F920"] },
      { text: "Residents were properly seated for meals and the seating arrangement was adhered to.", points: 6, ftags: ["F550"] },
      { text: "Seating arrangement promoted sociability, environment was non-rushed, friendly, and calm.", points: 3, ftags: ["F584"] },
      { text: "The food delivery truck arrived on the unit on time.", points: 4, ftags: ["F550"] },
      { text: "Trays were passed table by table, all residents at a table were served at the same time.", points: 6, ftags: ["F550"] },
      { text: "All items were removed from the trays.", points: 4, ftags: ["F550"] },
      { text: "The All Hands on Deck procedure was followed.", points: 2, ftags: ["F550"] },
      { text: "An announcement was made on the unit when the food delivery truck arrived.", points: 1, ftags: ["F550"] },
      { text: "Meal trays were assessed by a licensed nurse before being passed to the resident.", points: 6, ftags: ["F805"] },
      { text: "Staff knocked on Resident door before entering their rooms with meal trays", points: 6, ftags: ["F557"] },
      { text: "Residents were provided hand hygiene before being served a meal.", points: 6, ftags: ["F812"] },
      { text: "Residents were served nourishing, palatable, and attractive meals. Perform test tray after last tray is passed.", points: 3, ftags: ["F804"] },
      { text: "Meals met the resident's daily nutritional and special dietary needs.", points: 4, ftags: ["F805","F806","F808"] },
      { text: "The meal matched the meal ticket, and the meal ticket matched the physician's order.", points: 4, ftags: ["F805","F806","F808"] },
      { text: "Residents requiring fluid restrictions or modified liquid consistencies had appropriate procedures followed.", points: 4, ftags: ["F807","F692"] },
      { text: "Adaptive equipment was available as listed on the meal ticket and care plan.", points: 4, ftags: ["F810"] },
      { text: "Clothing protectors were used only as warranted, or per resident's choice.", points: 4, ftags: ["F550"] },
      { text: "The resident was provided adequate supervision and assistance to maintain or improve eating skills. There should be no more than 1:8 ratio if feeding assistance was needed.", points: 8, ftags: ["F676"] },
      { text: "Staff were seated when assisting a resident to eat. Staff members were engaged with the residents they were feeding.", points: 4, ftags: ["F550"] },
      { text: "Staff did not refer to residents as 'feeders'", points: 4, ftags: ["F550"] },
      { text: "Residents were offered an alternate meal if they are not eating or do not like the meal provided.", points: 5, ftags: ["F806"] },
    ],
  });

  // ==================== SECOND BATCH OF NEW TEMPLATES ====================
  
  // Hospice (from Hospice-QISVF0034.docx)
  packs.push({
    template: { name: "Hospice", type: "resident" },
    questions: [
      { text: "Hospice orders were timely, current and being followed", points: 20, ftags: ["F694"] },
      { text: "Hospice plan of care was being followed", points: 15, ftags: ["F694"] },
      { text: "Hospice services were provided per the service plan", points: 15, ftags: ["F694"] },
      { text: "Communication between facility and hospice was documented", points: 20, ftags: ["F694"] },
      { text: "Family/HCP was aware of hospice services", points: 15, ftags: ["F694"] },
      { text: "If applicable, DNR order was current and appropriate", points: 15, ftags: ["F694"] },
    ],
  });

  // Hydration and Enteral Nutrition (from Hydration-QISVF008.docx)
  packs.push({
    template: { name: "Hydration and Enteral Nutrition", type: "resident" },
    questions: [
      { text: "Fluid intake was documented and adequate.", points: 8, ftags: ["F692"] },
      { text: "Daily weights were documented for residents with a feeding tube.", points: 8, ftags: ["F692"] },
      { text: "Resident received the ordered amount and type of tube feeding formula and/or flush.", points: 8, ftags: ["F692"] },
      { text: "Resident was appropriately positioned during feeding.", points: 8, ftags: ["F692"] },
      { text: "Resident's tube feeding was administered at the proper rate and schedule.", points: 8, ftags: ["F692"] },
      { text: "Feeding tube was checked for placement per facility policy and as appropriate.", points: 8, ftags: ["F692"] },
      { text: "Feeding tube site was clean and free from irritation or signs of infection.", points: 8, ftags: ["F692"] },
      { text: "Feeding formula was at room temperature when administered.", points: 4, ftags: ["F692"] },
      { text: "Unused feeding formula was discarded per policy.", points: 4, ftags: ["F692"] },
      { text: "Feeding bags/tubing were changed per facility policy and as appropriate.", points: 4, ftags: ["F692"] },
      { text: "MD order was present for TF rate, type, and amount.", points: 8, ftags: ["F692"] },
      { text: "TF was started per MD order.", points: 8, ftags: ["F692"] },
      { text: "If TF was held, reason was documented and MD notified as appropriate.", points: 4, ftags: ["F692"] },
      { text: "Resident was assessed for complications related to tube feeding.", points: 4, ftags: ["F692"] },
      { text: "Dietitian assessed resident and made recommendations as appropriate.", points: 4, ftags: ["F692"] },
      { text: "Lab work was ordered and reviewed as appropriate.", points: 4, ftags: ["F692"] },
      { text: "Resident/family received education regarding tube feeding as appropriate.", points: 4, ftags: ["F692"] },
      { text: "Care plan addressed tube feeding and related care.", points: 4, ftags: ["F656","F692"] },
      { text: "MDS was coded correctly for tube feeding.", points: 4, ftags: ["F641"] },
      { text: "If PEG/G-tube: insertion site was clean and free from signs of infection.", points: 4, ftags: ["F692"] },
      { text: "If PEG/G-tube: appropriate tube securement was maintained.", points: 4, ftags: ["F692"] },
      { text: "If NG tube: placement was verified per policy before each feeding/med administration.", points: 4, ftags: ["F692"] },
      { text: "If NG tube: tube was secured appropriately to prevent migration.", points: 4, ftags: ["F692"] },
      { text: "Resident was monitored for signs of aspiration.", points: 4, ftags: ["F692"] },
      { text: "Mouth care was provided as appropriate for resident with feeding tube.", points: 4, ftags: ["F677"] },
    ],
  });

  // Foley Catheter Use (from Foley-Cath-Rev.-1-3-24.docx)
  packs.push({
    template: { name: "Foley Catheter Use", type: "resident" },
    questions: [
      { text: "Physician order was present for catheter insertion and continued use.", points: 15, ftags: ["F315"] },
      { text: "Catheter was inserted using sterile technique.", points: 10, ftags: ["F315"] },
      { text: "Catheter care was provided per facility policy.", points: 10, ftags: ["F315"] },
      { text: "Catheter was secured appropriately to leg/abdomen.", points: 5, ftags: ["F315"] },
      { text: "Drainage bag was positioned below the level of the bladder.", points: 10, ftags: ["F315"] },
      { text: "Closed drainage system was maintained.", points: 10, ftags: ["F315"] },
      { text: "Drainage bag was emptied regularly and output documented.", points: 10, ftags: ["F315"] },
      { text: "Signs of infection were monitored and reported.", points: 10, ftags: ["F315"] },
      { text: "Catheter removal was considered regularly and documented.", points: 10, ftags: ["F315"] },
      { text: "Resident/family received education regarding catheter care.", points: 5, ftags: ["F315"] },
      { text: "Care plan addressed catheter care and monitoring.", points: 5, ftags: ["F315","F656"] },
    ],
  });

  // Infection Control COVID-19 Outbreak (from Infection-Control-COVID-QISVF0037.docx)
  packs.push({
    template: { name: "Infection Control COVID-19 Outbreak", type: "resident" },
    questions: [
      { text: "Facility has an infection prevention and control program that covers COVID-19.", points: 10, ftags: ["F880"] },
      { text: "Staff are trained on COVID-19 infection prevention and control measures.", points: 10, ftags: ["F880"] },
      { text: "PPE is available and used appropriately for COVID-19 precautions.", points: 10, ftags: ["F880"] },
      { text: "Residents are screened for COVID-19 symptoms daily.", points: 10, ftags: ["F880"] },
      { text: "Residents with suspected/confirmed COVID-19 are isolated appropriately.", points: 10, ftags: ["F880"] },
      { text: "COVID-19 testing is conducted per CDC guidelines.", points: 10, ftags: ["F880"] },
      { text: "Contact tracing is conducted for COVID-19 exposures.", points: 10, ftags: ["F880"] },
      { text: "Environmental cleaning and disinfection protocols are followed.", points: 10, ftags: ["F880"] },
      { text: "Visitor restrictions and screening are implemented as appropriate.", points: 10, ftags: ["F880"] },
      { text: "COVID-19 cases are reported to health authorities as required.", points: 10, ftags: ["F880"] },
    ],
  });

  // ==================== THIRD BATCH OF NEW TEMPLATES ====================
  
  // Kitchen Observations (from Kitchen-Observations-QISVF0012.docx)
  packs.push({
    template: { name: "Kitchen Observations", type: "general" },
    questions: [
      { text: "Tray line started on time.", points: 5, ftags: ["F812"] },
      { text: "Temperature of cold items leaving the tray line was below 40°F.", points: 5, ftags: ["F804","F812"] },
      { text: "Temperature of hot items leaving the steam table was greater than 140°F.", points: 5, ftags: ["F804","F812"] },
      { text: "Standardized recipes were present and followed by cooks.", points: 5, ftags: ["F803"] },
      { text: "Food substitutions were available that provided a similar nutritive value.", points: 5, ftags: ["F806"] },
      { text: "Menus were prepared in advance and posted in the kitchen and on the units.", points: 5, ftags: ["F803"] },
      { text: "Food was prepared and served according to the preplanned menu.", points: 5, ftags: ["F803"] },
      { text: "Trays, dinnerware and utensils were in good condition.", points: 2, ftags: ["F812"] },
      { text: "Tray covers or appropriate trays were used.", points: 2, ftags: ["F550"] },
      { text: "The time span between the evening meal and the following day's breakfast was 14 hours or less.", points: 4, ftags: ["F809"] },
      { text: "Meal times were acceptable to the majority of the residents in the facility.", points: 4, ftags: ["F809"] },
      { text: "Fire extinguisher was available and up to date.", points: 4, ftags: ["F908"] },
      { text: "Garbage and refuse was disposed of properly, including in the Dumpster area.", points: 5, ftags: ["F814"] },
      { text: "Disaster meal plan was current and posted.", points: 2, ftags: ["F812"] },
      { text: "Staff knew where to find the food and food was readily available to meet needs.", points: 2, ftags: ["F803"] },
      { text: "There was a blood spill kit in the Dietary Department and Kitchen.", points: 4, ftags: ["F812"] },
      { text: "There was a vomitus and diarrheal clean up plan available in the Dietary Department.", points: 4, ftags: ["F812"] },
      { text: "Ice Machine cleaning schedule is up to date.", points: 4, ftags: ["F812"] },
      { text: "Grease trap log is up to date.", points: 4, ftags: ["F812"] },
      { text: "Hood certificate was current and in place. All filters were cleaned according to schedule.", points: 4, ftags: ["F812"] },
      { text: "All chemicals were properly labeled and stored away from food items.", points: 3, ftags: ["F812"] },
      { text: "SDS sheets were readily available.", points: 3, ftags: ["F812"] },
      { text: "Sufficient staff to carry out needs of the department.", points: 4, ftags: ["F802"] },
      { text: "There was no evidence of pests throughout the kitchen.", points: 10, ftags: ["F925"] },
    ],
  });

  // Medication Storage and Labeling (from Med-Storage-and-Labeling-rev-1-8-24.docx)
  packs.push({
    template: { name: "Medication Storage and Labeling", type: "general" },
    questions: [
      { text: "Medication carts were clean, neat and orderly.", points: 5, ftags: ["F761","F880"] },
      { text: "The medication room was locked at all times and only accessible to authorized personnel.", points: 5, ftags: ["F761"] },
      { text: "The medication room was neat, clean, and orderly. There were no staff personal belongings in the medication room.", points: 5, ftags: ["F761"] },
      { text: "The medication carts were locked when not in use, unattended, or not in the nurse's direct view.", points: 5, ftags: ["F689","F761"] },
      { text: "The keys to the medication room and the medication cart were in the possession of authorized personnel only.", points: 5, ftags: ["F761"] },
      { text: "The refrigerator temp was conducted twice daily if vaccines are present.", points: 5, ftags: ["F761","F880"] },
      { text: "The medication room refrigerator was clean. No food items were stored in this refrigerator. There is a thermometer in the refrigerator at 36° to 46°F.", points: 5, ftags: ["F761","F880"] },
      { text: "The medication room and medication cart were free of any pre-poured medications.", points: 5, ftags: ["F758"] },
      { text: "All oral medications, nasal inhalers, injections, externals, eye drops, and nasal drops were stored separately.", points: 5, ftags: ["F761"] },
      { text: "Expired medications were not found in the medication room or medication carts.", points: 10, ftags: ["F761"] },
      { text: "Quality checks were being done daily and documented, for any glucometer in use on the nursing units.", points: 5, ftags: ["F758"] },
      { text: "The narcotic count was correct and is completed by two (2) licensed nurses every shift and recorded.", points: 5, ftags: ["F755","R1250"] },
      { text: "All Schedule II drugs were double-locked.", points: 5, ftags: ["F761"] },
      { text: "There is documentation of regularly occurring narcotic destruction at least monthly.", points: 5, ftags: ["F755"] },
      { text: "Multi-dose vials which have been opened or accessed should be dated and discarded within 28 days unless the manufacturer specifies a different date.", points: 15, ftags: ["F761"] },
      { text: "Kits were not open or if open have been reordered per pharmacy protocol.", points: 5, ftags: ["F761"] },
      { text: "All discontinued medications were disposed of properly, following state requirements. Discontinued medications were not stored in the medication cart.", points: 5, ftags: ["F761"] },
    ],
  });

  // Infection Control (from Infection-Control-QISVF0010.docx) - This is the simpler version
  packs.push({
    template: { name: "Infection Control", type: "general" },
    questions: [
      { text: "The facility had a system to prevent, monitor and investigate causes of infection.", points: 5, ftags: ["F880"] },
      { text: "The infection control line listings are maintained monthly. (all data is completed)", points: 15, ftags: ["F880"] },
      { text: "There is evidence of monthly infection surveillance including analysis of infections for trend identification and corrective actions.", points: 15, ftags: ["F880"] },
      { text: "Precaution rooms have a sign on the door for the type of precaution. Staff can verbalize the type of infection.", points: 10, ftags: ["F880"] },
      { text: "Handwashing was being conducted as appropriate.", points: 8, ftags: ["F880"] },
      { text: "Resident care equipment was properly cleaned, changed and stored.", points: 5, ftags: ["F880"] },
      { text: "Linens were handled appropriately, clean and soiled linen were stored separately (observe laundry).", points: 5, ftags: ["F880"] },
      { text: "Hands and equipment were washed between residents, gloves were used properly (not worn in hallway).", points: 10, ftags: ["F880"] },
      { text: "Oxygen tubing was changed and dated weekly, bagged when not in use, O2 filters were clean.", points: 7, ftags: ["F880"] },
      { text: "Nebulizer tubing was changed weekly and bagged or in holder when not in use.", points: 5, ftags: ["F880"] },
      { text: "Feeding tube syringes and TF bottles were changed and dated every 24 hours.", points: 5, ftags: ["F880"] },
      { text: "Linen was not stored in rooms, hampers were lidded, not overflowing, and removed during meals.", points: 5, ftags: ["F880"] },
      { text: "Glucometers were cleaned between resident use.", points: 5, ftags: ["F880"] },
    ],
  });

  // MDS Assessment Care Planning (from MDS-Assessment-Care-Planning-QISVF0014.docx)
  packs.push({
    template: { name: "MDS Assessment Care Planning", type: "resident" },
    questions: [
      { text: "Admission MDS was completed within 14 days of admission.", points: 10, ftags: ["F641"] },
      { text: "Quarterly MDS was completed within the required timeframe.", points: 10, ftags: ["F641"] },
      { text: "Annual MDS was completed within the required timeframe.", points: 10, ftags: ["F641"] },
      { text: "Significant change MDS was completed when warranted.", points: 10, ftags: ["F641"] },
      { text: "MDS was coded accurately based on resident condition and documentation.", points: 15, ftags: ["F641"] },
      { text: "CAAs were triggered and completed appropriately.", points: 10, ftags: ["F655"] },
      { text: "Care plan was developed based on MDS and CAA findings.", points: 15, ftags: ["F655","F656"] },
      { text: "Care plan was updated when resident condition changed.", points: 10, ftags: ["F656"] },
      { text: "Resident and family participated in care planning process.", points: 5, ftags: ["F656"] },
      { text: "Care plan interventions were implemented and followed by staff.", points: 5, ftags: ["F656"] },
    ],
  });

  // Kitchen Sanitation (from Kitchen-Sanitation-QISVF0011.docx)
  packs.push({
    template: { name: "Kitchen Sanitation", type: "general" },
    questions: [
      { text: "All potentially hazardous foods (PHF) were maintained at proper temperatures.", points: 3, ftags: ["F812"] },
      { text: "Food preparation surfaces were clean and sanitized.", points: 3, ftags: ["F812"] },
      { text: "Hand washing facilities were available and properly stocked.", points: 2, ftags: ["F812"] },
      { text: "Food service employees washed hands properly and frequently.", points: 3, ftags: ["F812"] },
      { text: "Hair restraints were worn by all food service employees.", points: 2, ftags: ["F812"] },
      { text: "Clean aprons were worn and changed when soiled.", points: 2, ftags: ["F812"] },
      { text: "No smoking, eating, or drinking in food preparation areas.", points: 2, ftags: ["F812"] },
      { text: "Food was protected from contamination during storage, preparation, and service.", points: 3, ftags: ["F812"] },
      { text: "Leftovers were properly labeled, dated, and stored.", points: 2, ftags: ["F812"] },
      { text: "Refrigerator and freezer temperatures were monitored and recorded daily.", points: 3, ftags: ["F812"] },
      { text: "Food was thawed using approved methods only.", points: 2, ftags: ["F812"] },
      { text: "Raw and cooked foods were stored separately.", points: 2, ftags: ["F812"] },
      { text: "FIFO (First In, First Out) method was used for food rotation.", points: 2, ftags: ["F812"] },
      { text: "Dishwashing machine achieved proper wash and rinse temperatures.", points: 3, ftags: ["F812"] },
      { text: "Dishes and utensils were air dried properly.", points: 2, ftags: ["F812"] },
      { text: "Three-compartment sink was properly set up and maintained.", points: 2, ftags: ["F812"] },
      { text: "Sanitizer solution was at proper concentration and tested regularly.", points: 3, ftags: ["F812"] },
      { text: "Food contact surfaces were washed, rinsed, and sanitized after each use.", points: 2, ftags: ["F812"] },
      { text: "Non-food contact surfaces were cleaned regularly.", points: 2, ftags: ["F812"] },
      { text: "Equipment was maintained in good working order and clean.", points: 2, ftags: ["F812"] },
      { text: "Cutting boards were non-absorbent and in good condition.", points: 2, ftags: ["F812"] },
      { text: "Wiping cloths were stored in sanitizer solution when not in use.", points: 2, ftags: ["F812"] },
      { text: "Single-use items were not reused.", points: 2, ftags: ["F812"] },
      { text: "Food employees were free from signs of illness.", points: 3, ftags: ["F812"] },
      { text: "Wounds on hands were properly covered with waterproof bandages and gloves.", points: 2, ftags: ["F812"] },
      { text: "Clean utensils were handled properly to avoid contamination.", points: 2, ftags: ["F812"] },
      { text: "Ice was handled with proper utensils, not hands.", points: 2, ftags: ["F812"] },
      { text: "Potentially hazardous foods were cooled properly.", points: 3, ftags: ["F812"] },
      { text: "Foods were reheated to proper temperatures.", points: 2, ftags: ["F812"] },
      { text: "Time and temperature logs were maintained for hot holding.", points: 2, ftags: ["F812"] },
      { text: "Time and temperature logs were maintained for cold holding.", points: 2, ftags: ["F812"] },
      { text: "Food thermometers were available and calibrated.", points: 2, ftags: ["F812"] },
      { text: "Toxic materials were properly labeled and stored away from food.", points: 2, ftags: ["F812"] },
      { text: "Garbage was handled properly and containers were covered.", points: 2, ftags: ["F812"] },
      { text: "Pest control measures were in place and effective.", points: 3, ftags: ["F925"] },
      { text: "Water supply was safe and adequate.", points: 2, ftags: ["F812"] },
      { text: "Sewage and wastewater were disposed of properly.", points: 2, ftags: ["F812"] },
      { text: "Restrooms were clean and properly stocked.", points: 2, ftags: ["F812"] },
      { text: "Adequate lighting was provided in all areas.", points: 2, ftags: ["F812"] },
      { text: "Ventilation systems were working properly.", points: 2, ftags: ["F812"] },
      { text: "Floors, walls, and ceilings were clean and in good repair.", points: 2, ftags: ["F812"] },
      { text: "Food establishment had required permits and licenses.", points: 2, ftags: ["F812"] },
      { text: "Food safety management system was in place.", points: 3, ftags: ["F812"] },
      { text: "HACCP plan was implemented where required.", points: 3, ftags: ["F812"] },
      { text: "Staff training records for food safety were maintained.", points: 2, ftags: ["F812"] },
      { text: "Temperature monitoring devices were working properly.", points: 2, ftags: ["F812"] },
      { text: "Food recalls were handled appropriately.", points: 2, ftags: ["F812"] },
      { text: "Supplier verification programs were in place.", points: 2, ftags: ["F812"] },
      { text: "Corrective actions were taken for identified problems.", points: 2, ftags: ["F812"] },
      { text: "Documentation and record keeping was adequate.", points: 2, ftags: ["F812"] },
      { text: "Consumer advisories were posted where required.", points: 1, ftags: ["F812"] },
      { text: "Variance and HACCP plans were approved where required.", points: 2, ftags: ["F812"] },
      { text: "Specialized processes were properly controlled.", points: 2, ftags: ["F812"] },
      { text: "Mobile food units met all requirements.", points: 1, ftags: ["F812"] },
      { text: "Temporary food establishments met all requirements.", points: 1, ftags: ["F812"] },
      { text: "Compliance with local health department requirements.", points: 2, ftags: ["F812"] },
    ],
  });

  // ==================== FOURTH BATCH OF NEW TEMPLATES ====================

  // Pain Management (from Pain-Management-Rev.-1-3-24.docx)
  packs.push({
    template: { name: "Pain Management", type: "resident" },
    questions: [
      { text: "Pain assessment was completed on admission and documented.", points: 10, ftags: ["F697"] },
      { text: "Pain assessment was ongoing and systematic.", points: 10, ftags: ["F697"] },
      { text: "Pain assessment included intensity, quality, and location.", points: 8, ftags: ["F697"] },
      { text: "Pain management plan was developed and implemented.", points: 12, ftags: ["F697"] },
      { text: "Effectiveness of pain management interventions was monitored.", points: 10, ftags: ["F697"] },
      { text: "Pain medication was administered as ordered.", points: 10, ftags: ["F697"] },
      { text: "Non-pharmacological interventions were used when appropriate.", points: 8, ftags: ["F697"] },
      { text: "Resident and family were educated about pain management.", points: 7, ftags: ["F697"] },
      { text: "Pain assessment tools were appropriate for the resident.", points: 8, ftags: ["F697"] },
    ],
  });

  // Mobility/Splints/ADL Care (from Mobility-splints-ADL-QISVF0024.docx)
  packs.push({
    template: { name: "Mobility/Splints/ADL Care", type: "resident" },
    questions: [
      { text: "Range of motion exercises were provided per care plan.", points: 12, ftags: ["F676"] },
      { text: "Positioning and turning schedule was followed.", points: 12, ftags: ["F676"] },
      { text: "Assistive devices were used properly and maintained.", points: 12, ftags: ["F677"] },
      { text: "Splints and braces were applied and maintained correctly.", points: 15, ftags: ["F677"] },
      { text: "ADL care was provided to maintain or improve function.", points: 12, ftags: ["F676"] },
      { text: "Mobility status was assessed and documented.", points: 12, ftags: ["F676"] },
      { text: "Care plan addressed mobility and functional needs.", points: 12, ftags: ["F656","F676"] },
      { text: "Staff were trained on proper body mechanics and transfer techniques.", points: 13, ftags: ["F676"] },
    ],
  });

  // Quality Assessment and Assurance Review (from Quality-Assessment-and-Assurance-Review-Rev.-1-9-24.docx)
  packs.push({
    template: { name: "Quality Assessment and Assurance Review", type: "general" },
    questions: [
      { text: "QAA committee met at least quarterly.", points: 10, ftags: ["F867"] },
      { text: "QAA committee included required disciplines.", points: 10, ftags: ["F867"] },
      { text: "QAA committee reviewed incident trends and patterns.", points: 15, ftags: ["F867"] },
      { text: "Corrective action plans were developed and implemented.", points: 15, ftags: ["F867"] },
      { text: "QAA activities were documented appropriately.", points: 10, ftags: ["F867"] },
      { text: "Performance indicators were monitored regularly.", points: 10, ftags: ["F867"] },
      { text: "QAA program addressed resident outcomes.", points: 15, ftags: ["F867"] },
      { text: "QAA findings were communicated to staff.", points: 10, ftags: ["F867"] },
      { text: "External reporting requirements were met.", points: 5, ftags: ["F867"] },
      { text: "QAA program was comprehensive and systematic.", points: 10, ftags: ["F867"] },
    ],
  });

  // Quality of Life Group Interview (from Quality-of-Life-Group-Interview-QISVF0021.docx)
  packs.push({
    template: { name: "Quality of Life Group Interview", type: "resident" },
    questions: [
      { text: "Residents expressed satisfaction with care received.", points: 3, ftags: ["F550"] },
      { text: "Residents felt their preferences were respected.", points: 3, ftags: ["F550"] },
      { text: "Residents felt comfortable approaching staff with concerns.", points: 3, ftags: ["F550"] },
      { text: "Residents felt they had choices in their daily routine.", points: 3, ftags: ["F550"] },
      { text: "Residents felt their privacy was respected.", points: 3, ftags: ["F583"] },
      { text: "Residents felt they could participate in activities they enjoyed.", points: 3, ftags: ["F679"] },
      { text: "Residents expressed satisfaction with food quality and choices.", points: 3, ftags: ["F806"] },
      { text: "Residents felt they received adequate information about their care.", points: 3, ftags: ["F550"] },
      { text: "Residents felt they were treated with dignity and respect.", points: 3, ftags: ["F550"] },
      { text: "Residents felt safe and secure in the facility.", points: 3, ftags: ["F550"] },
      { text: "Residents felt their family was welcomed and involved appropriately.", points: 3, ftags: ["F554"] },
      { text: "Residents felt they could voice complaints without fear of retaliation.", points: 3, ftags: ["F551"] },
      { text: "Residents felt their room was comfortable and homelike.", points: 2, ftags: ["F584"] },
      { text: "Residents felt they had adequate personal belongings.", points: 2, ftags: ["F584"] },
      { text: "Residents felt they received timely responses to call lights.", points: 3, ftags: ["F689"] },
      { text: "Residents felt staff were knowledgeable about their needs.", points: 3, ftags: ["F656"] },
      { text: "Residents felt they received adequate assistance with personal care.", points: 3, ftags: ["F676"] },
      { text: "Residents felt they had opportunities for social interaction.", points: 2, ftags: ["F679"] },
      { text: "Residents felt they could maintain relationships with family and friends.", points: 2, ftags: ["F561"] },
      { text: "Residents felt they had access to spiritual care if desired.", points: 2, ftags: ["F569"] },
      { text: "Residents felt they could participate in resident council activities.", points: 2, ftags: ["F565"] },
      { text: "Residents felt their financial affairs were handled appropriately.", points: 2, ftags: ["F565"] },
      { text: "Residents felt they received adequate medical care.", points: 3, ftags: ["F658"] },
      { text: "Residents felt they were involved in care planning decisions.", points: 3, ftags: ["F656"] },
      { text: "Residents felt they received adequate therapy services.", points: 2, ftags: ["F676"] },
      { text: "Residents felt the facility environment was clean and well-maintained.", points: 2, ftags: ["F584"] },
      { text: "Residents felt they had adequate access to outdoor areas.", points: 1, ftags: ["F584"] },
      { text: "Residents felt they could maintain their cultural and religious practices.", points: 2, ftags: ["F550"] },
      { text: "Residents felt they received adequate information about facility policies.", points: 2, ftags: ["F576"] },
      { text: "Residents felt they could refuse treatments or services.", points: 2, ftags: ["F578"] },
      { text: "Residents felt they had adequate access to medical specialists.", points: 2, ftags: ["F658"] },
      { text: "Residents felt their pain was adequately managed.", points: 3, ftags: ["F697"] },
      { text: "Residents felt they received adequate assistance with mobility.", points: 2, ftags: ["F676"] },
      { text: "Residents felt they had meaningful activities available.", points: 2, ftags: ["F679"] },
      { text: "Residents felt they could maintain their personal routines.", points: 2, ftags: ["F550"] },
      { text: "Residents felt they received adequate emotional support.", points: 2, ftags: ["F550"] },
      { text: "Residents felt their advanced directives were honored.", points: 2, ftags: ["F578"] },
      { text: "Residents felt they had input into facility policies affecting them.", points: 2, ftags: ["F565"] },
      { text: "Overall resident satisfaction with quality of life in the facility.", points: 5, ftags: ["F550"] },
    ],
  });

  // ==================== FINAL BATCH OF NEW TEMPLATES ====================
  
  // Unintended Weight Changes (from Unintended-Weight-Changes-QISVF0026doc.docx)
  packs.push({
    template: { name: "Unintended Weight Changes", type: "resident" },
    questions: [
      { text: "Weight was obtained on admission and weekly thereafter.", points: 6, ftags: ["F692"] },
      { text: "Significant weight loss was identified and addressed.", points: 8, ftags: ["F692"] },
      { text: "Significant weight gain was identified and addressed.", points: 6, ftags: ["F692"] },
      { text: "Nutritional assessment was completed for weight changes.", points: 8, ftags: ["F692"] },
      { text: "Dietary interventions were implemented for weight changes.", points: 8, ftags: ["F692"] },
      { text: "Medical evaluation was obtained for unintended weight changes.", points: 8, ftags: ["F692"] },
      { text: "Care plan addressed weight management and interventions.", points: 8, ftags: ["F656","F692"] },
      { text: "Monitoring of nutritional status was ongoing.", points: 6, ftags: ["F692"] },
      { text: "Family was notified of significant weight changes.", points: 6, ftags: ["F580"] },
      { text: "Supplements were provided when appropriate and ordered.", points: 6, ftags: ["F692"] },
      { text: "Feeding assistance was provided when needed.", points: 6, ftags: ["F676"] },
      { text: "Alternative feeding methods were considered when appropriate.", points: 6, ftags: ["F692"] },
      { text: "Documentation supported interventions for weight changes.", points: 6, ftags: ["F692"] },
      { text: "Lab work was obtained to evaluate weight changes when appropriate.", points: 6, ftags: ["F692"] },
      { text: "Medication review was conducted for weight changes.", points: 6, ftags: ["F692"] },
      { text: "Environmental factors affecting eating were addressed.", points: 6, ftags: ["F692"] },
      { text: "MDS was coded correctly for weight changes.", points: 6, ftags: ["F641"] },
    ],
  });

  // Social Service (from social-service-QISVF0025.docx)
  packs.push({
    template: { name: "Social Service", type: "resident" },
    questions: [
      { text: "Social service assessment was completed within 14 days of admission.", points: 10, ftags: ["F745"] },
      { text: "Social service care plan was developed based on assessment.", points: 10, ftags: ["F745"] },
      { text: "Psychosocial needs were identified and addressed.", points: 8, ftags: ["F745"] },
      { text: "Discharge planning was initiated and ongoing.", points: 8, ftags: ["F745"] },
      { text: "Family involvement was facilitated when appropriate.", points: 8, ftags: ["F745"] },
      { text: "Community resources were identified and utilized.", points: 8, ftags: ["F745"] },
      { text: "Social service interventions were documented.", points: 8, ftags: ["F745"] },
      { text: "Resident council participation was encouraged.", points: 6, ftags: ["F565"] },
      { text: "Grievance procedures were explained to residents.", points: 6, ftags: ["F609"] },
      { text: "Advanced directives were discussed and documented.", points: 8, ftags: ["F578"] },
      { text: "Financial concerns were addressed when identified.", points: 6, ftags: ["F554"] },
      { text: "Social service qualified staff provided services.", points: 10, ftags: ["F745"] },
    ],
  });

  // Smoking (from Smoking-QISVF0036.docx)
  packs.push({
    template: { name: "Smoking", type: "resident" },
    questions: [
      { text: "Smoking policy was clearly posted and communicated.", points: 10, ftags: ["F689"] },
      { text: "Designated smoking areas were safe and supervised.", points: 15, ftags: ["F689"] },
      { text: "Fire safety measures were in place in smoking areas.", points: 15, ftags: ["F921"] },
      { text: "Staff supervision was provided for residents who smoke.", points: 15, ftags: ["F689"] },
      { text: "Smoking materials were stored safely.", points: 10, ftags: ["F689"] },
      { text: "Smoking cessation programs were offered when appropriate.", points: 10, ftags: ["F689"] },
      { text: "Documentation of smoking status and interventions was maintained.", points: 10, ftags: ["F689"] },
      { text: "Emergency procedures for smoking-related incidents were in place.", points: 10, ftags: ["F689"] },
      { text: "Ventilation in smoking areas was adequate.", points: 5, ftags: ["F584"] },
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
