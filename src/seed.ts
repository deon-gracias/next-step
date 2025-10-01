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
  console.log("Seeding DB...");

  const conn = postgres(DATABASE_URL, { max: 1 });
  const db = drizzle(conn, { schema });

  // DANGER: Resets all tables (intended for local/dev only)
  await reset(db, schema);

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

  const facilityData = [
    { name: "Dexter House HealthCare", address: "120 Main Street, Malden, MA 02148", facilityCode: "1004" },
    { name: "Fall River HealthCare", address: "1748 Highland Avenue, Fall River, MA 02720", facilityCode: "1022" },
    { name: "Fitchburg HealthCare", address: "1199 John Fitch Highway, Fitchburg, MA 01420", facilityCode: "1005" },
    { name: "Garden Place HealthCare", address: "193 Pleasant Street, Attleboro, MA 02703", facilityCode: "1006" },
    { name: "Lee HealthCare", address: "620 Laurel Street, Lee, MA 01238", facilityCode: "1024" },
    { name: "Melrose HealthCare", address: "40 Martin Street, Melrose, MA 02176", facilityCode: "1009" },
    { name: "Norwood HealthCare", address: "460 Washington Street, Norwood, MA 02062", facilityCode: "1010" },
    { name: "Oakhill HealthCare", address: "76 North Street, Middleboro, MA 02346", facilityCode: "1011" },
    { name: "Plymouth Harborside HealthCare", address: "19 Obery Street, Plymouth, MA 02360", facilityCode: "1012" },
    { name: "The Elmhurst HealthCare", address: "743 Main Street, Melrose, MA 02176", facilityCode: "1013" },
    { name: "The Hermitage HealthCare", address: "383 Mill Street, Worcester, MA 01602", facilityCode: "1014" },
    { name: "The Landing at Laurel Lake", address: "620 Laurel Street, Lee, MA 01238", facilityCode: "1025" },
    { name: "Wedgemere HealthCare", address: "146 Dean Street, Taunton, MA 02780", facilityCode: "1015" },
    { name: "West Newton HealthCare", address: "25 Armory Street, West Newton, MA 02465", facilityCode: "1016" },
    { name: "Westborough HealthCare", address: "8 Colonial Drive, Westborough, MA 01581", facilityCode: "1030" },
  ];

  const facilities = await db
    .insert(schema.facility)
    .values(facilityData)
    .returning({ id: schema.facility.id, name: schema.facility.name });

  // 5) Residents --------------------------------------------------------------
    // 5) Residents --------------------------------------------------------------
  const residents = [];
  for (let i = 0; i < facilities.length; i++) {
    const facility = facilities[i];
    for (let j = 1; j <= 10; j++) {
      residents.push({
        name: `Resident ${j}`,
        facilityId: facility!.id,
        roomId: `${100 + j}A`, // Generate room numbers like 101A, 102A, etc.
        pcciId: `PCCI-${facility!.id}-${String(j).padStart(3, '0')}`, // Generate unique PCCI IDs
        dateOfBirth: new Date(1930 + Math.floor(Math.random() * 40), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
        admissionDate: new Date(2020 + Math.floor(Math.random() * 4), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
      });
    }
  }

  await db.insert(schema.resident).values(residents);


  // 6) Surveyors --------------------------------------------------------------
  // const surveyData = [
  //   { name: "Dr. Sarah Johnson", email: "sarah.johnson@qisv.com" },
  //   { name: "Mike Rodriguez", email: "mike.rodriguez@qisv.com" },
  //   { name: "Emily Chen", email: "emily.chen@qisv.com" },
  //   { name: "David Thompson", email: "david.thompson@qisv.com" },
  //   { name: "Lisa Park", email: "lisa.park@qisv.com" },
  // ];

  // await db.insert(schema.survey).values(surveyData);

  // ==================== TEMPLATE PACKS FROM DOCX ====================
  // Helpers (idempotent upserts)
  async function ensureFtag(code: string) {
    const norm = code.trim();
    if (!norm) return null;
    const [ins] = await db
      .insert(schema.ftag)
      .values({ code: norm, description: `F-Tag: ${norm}` })
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

  // ✅ CASE TYPE TEMPLATES
  // Abuse Prohibition (from Abuse-QISVF001.docx)
  packs.push({
    template: { name: "Abuse Prohibition", type: "case" },
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

  // ✅ GENERAL TYPE TEMPLATES
  // Dining and Food Service (from Dining-and-Food-Service-QISVF004.docx)
  packs.push({
    template: { name: "Dining and Food Service", type: "general" },
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

  // Environment
  packs.push({
    template: { name: "Environment", type: "general" },
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

  // Infection Control COVID-19 Outbreak (from Infection-Control-COVID-QISVF0037.docx)
  packs.push({
    template: { name: "Infection Control COVID-19 Outbreak", type: "general" },
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

  // ✅ Kitchen Sanitation (FIXED - Total exactly 100 points)
  packs.push({
    template: { name: "Kitchen Sanitation", type: "general" },
    questions: [
      { text: "Dietary employee apparel conformed to the department policy.", points: 2, ftags: ["F812"] },
      { text: "Hair restraints and beard guards (if applicable) covered hair completely.", points: 2, ftags: ["F812"] },
      { text: "There were no employee personal belongings in the kitchen area.", points: 2, ftags: ["F812"] },
      { text: "Designated hand washing facilities were available and in working order. There was an adequate supply of liquid hand soap and paper towels.", points: 2, ftags: ["F812"] },
      { text: "Dietary employees washed their hands prior to starting a shift, starting a new task, preparing food, serving and distributing food.", points: 3, ftags: ["F812"] },
      { text: "Dietary employees washed hands after using the restroom, touching hair or face, coughing/sneezing, eating/drinking, taking out the garbage, picking things up off the floor, handling chemicals, handling dirty dishes, handling raw or soiled items, handling money, handling electronics, or anything else that may contaminate hands.", points: 4, ftags: ["F812"] },
      { text: "Gloves were changed before changing tasks, when ripped or soiled, any of the incidents requiring hand washing, or after 4 hours of continuous use.", points: 4, ftags: ["F812"] },
      { text: "Cleaning schedule was posted and signed off as completed after each shift.", points: 2, ftags: ["F812"] },
      { text: "Floors and walls were clean and in good repair.", points: 2, ftags: ["F812"] },
      { text: "Screens were free of rips and tears.", points: 1, ftags: ["F812"] },
      { text: "All doors to the outside closed and latched properly.", points: 1, ftags: ["F812"] },
      { text: "Contact surfaces were clean and sanitized.", points: 1, ftags: ["F812"] },
      { text: "Sanitizer solution was labeled and dated. PPM logs are up to date. PPM strips are not expired.", points: 2, ftags: ["F812"] },
      { text: "Staff is able to demonstrate how to use sanitizer strips.", points: 1, ftags: ["F812"] },
      { text: "All food trucks were clean.", points: 2, ftags: ["F812"] },
      { text: "The beverage stations in the kitchen were clean and orderly.", points: 1, ftags: ["F812"] },
      { text: "Coffee urns and hot water spouts worked, with no leaks, drips or pooled water on the counters or floor.", points: 1, ftags: ["F812"] },
      { text: "All equipment was clean, air dried and in good repair, including can opener, slicer, and mixer.", points: 3, ftags: ["F812"] },
      { text: "The kitchen utensils were clean and air-dried.", points: 2, ftags: ["F812"] },
      { text: "Utensil drawers, bins and/or containers were clean, neat and well organized.", points: 4, ftags: ["F812"] },
      { text: "Pots and pans were stored clean, free from grease, and dry.", points: 2, ftags: ["F812"] },
      { text: "Sinks were clean with no standing water.", points: 3, ftags: ["F812"] },
      { text: "Three-compartment sink contained 1) detergent and water, 2) clear rinse water, and 3) sanitizer that were tested when the sink was filled.", points: 1, ftags: ["F812"] },
      { text: "Sanitizer log was available and filled out.", points: 1, ftags: ["F812"] },
      { text: "The dish machine was clean both inside and out, free of lime build up.", points: 2, ftags: ["F812"] },
      { text: "Dishwasher wash and rinse cycle temps met or exceeded Department of Health recommendations.", points: 1, ftags: ["F812"] },
      { text: "Temperatures were recorded three times a day.", points: 1, ftags: ["F812"] },
      { text: "The interior and exterior of the ice machine was clean and operable, free of rust.", points: 1, ftags: ["F812"] },
      { text: "Ice scoop was covered when not in use and was stored in upright position.", points: 1, ftags: ["F812"] },
      { text: "Walk-in refrigerators and freezers were clean and in good repair. There are no leaks, drips, ice build-up, rusty or pitted shelves.", points: 2, ftags: ["F812"] },
      { text: "Refrigerator temperatures read 32° to 39°F. Freezer temperatures read 0°F or below.", points: 1, ftags: ["F812"] },
      { text: "Readings were documented twice daily.", points: 2, ftags: ["F812"] },
      { text: "All meats, poultry, seafood, fresh shelled eggs and frozen raw egg products were defrosted and stored on the bottom shelf in separate pans or cartons.", points: 2, ftags: ["F812"] },
      { text: "Open packages were labeled and dated.", points: 3, ftags: ["F812"] },
      { text: "Only approved containers or food quality plastic bags were used to store unused portions in the refrigerators.", points: 1, ftags: ["F812"] },
      { text: "Dietary storage area was clean and orderly.", points: 1, ftags: ["F812"] },
      { text: "Storage shelves were free of dust, food residue and rust.", points: 1, ftags: ["F812"] },
      { text: "No dented cans were found.", points: 1, ftags: ["F812"] },
      { text: "Dry foods were stored off the floor and stock rotated. Dry foods were stored at least 18\" from ceiling.", points: 2, ftags: ["F812"] },
      { text: "All open items were labeled and dated.", points: 2, ftags: ["F812"] },
      { text: "No expired food was present in the kitchen.", points: 4, ftags: ["F812"] },
      { text: "The mop closet was clean and neat, with mops/brooms stored off the floor. Mops are not stored in water in the mop closet.", points: 2, ftags: ["F812"] },
      { text: "There was no evidence of pest infestation throughout the Kitchenettes.", points: 5, ftags: ["F925"] },
      { text: "Kitchenettes were clean and orderly. Toaster, microwave and trash can are clean, free of spills/splatters/crumbs. Trash is not overflowing.", points: 4, ftags: ["F812"] },
      { text: "Kitchenettes, refrigerator and freezer are clean and free of spills.", points: 2, ftags: ["F812"] },
      { text: "Refrigerator and freezer temperatures were recorded twice daily.", points: 2, ftags: ["F812"] },
      { text: "All items in the kitchenette refrigerator and freezer were labeled and dated. No expired foods present.", points: 4, ftags: ["F812"] },
      { text: "No staff items present in the kitchenettes.", points: 4, ftags: ["F812"] },
    ],
  });

  // Continue with remaining templates...
  // Medication Pass Administration and Documentation
  packs.push({
    template: { name: "Medication Pass Administration and Documentation", type: "general" },
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

  // Medication, Storage and Labeling (from Med-Storage-and-Labeling-rev-1-8-24.docx)
  packs.push({
    template: { name: "Medication, Storage and Labeling", type: "general" },
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

  // Nursing Unit Observation
  packs.push({
    template: { name: "Nursing Unit Observation", type: "general" },
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

  // Quality Assessment and Assurance Review (from Quality-Assessment-and-Assurance-Review-Rev.-1-9-24.docx)
  packs.push({
    template: { name: "Quality Assessment and Assurance Review", type: "general" },
    questions: [
      { text: "The facility has a QAPI committee that consists of at least the DON, the Medical Director (or his/her designee), the Infection Preventionist, and two members of the facility staff.", points: 10, ftags: ["F868"] },
      { text: "The committee held facility monthly meetings and had a quarterly meeting with pharmacy, lab, and x-ray representatives. Minutes were kept.", points: 15, ftags: ["F868"] },
      { text: "The facility has a safety committee, and the committee meets monthly.", points: 10, ftags: ["F868"] },
      { text: "Safety committee addresses the following areas: A/I employees, Property Damage, Security, OSHA Log, Resident Incident Log, Hazardous Waste, Medical Equipment, Utility Equipment, Environmental Rounds, Fire/Disaster Drills, Life Safety, Information Technology.", points: 10, ftags: ["F867"] },
      { text: "There were examples of identified quality issues and action plans developed as a direct result of committee activities.", points: 8, ftags: ["F867"] },
      { text: "Plans of Correction for annual survey or complaint survey were developed, implemented, and monitored through the facility's QAPI process.", points: 8, ftags: ["F865"] },
      { text: "Committee discussion (Standards of Care): Infection Control, Restraints, Falls, Safety, Wounds, Weight Loss, Antipsychotic Drugs.", points: 10, ftags: ["F867"] },
      { text: "Is there documentation of Annual Policy Review?", points: 10, ftags: ["F867"] },
      { text: "Quality Measures and Facility Assessment are part of QAPI.", points: 10, ftags: ["F867"] },
      { text: "Survey Readiness Binder, beginning 6 months after last survey.", points: 9, ftags: ["F865"] },
    ],
  });

  // Quality of Life, Group Interview (from Quality-of-Life-Group-Interview-QISVF0021.docx)
  packs.push({
    template: { name: "Quality of Life, Group Interview", type: "general" },
    questions: [
      { text: "Are you able to have visitors at the time of your choosing?", points: 2, ftags: ["F563"] },
      { text: "Can you make telephone calls without other people overhearing your conversation?", points: 2, ftags: ["F550"] },
      { text: "Do staff members knock or announce themselves before entering your room or the bathroom inside your room?", points: 3, ftags: ["F550"] },
      { text: "Do the activities programs meet your interests and needs?", points: 2, ftags: ["F679"] },
      { text: "Does the group have input into selecting activities?", points: 2, ftags: ["F679"] },
      { text: "Are there places you can go to be with other residents when you are not participating in formal activities?", points: 2, ftags: ["F679"] },
      { text: "Can you have personal belongings here if you choose to?", points: 2, ftags: ["F557"] },
      { text: "Have you ever had concerns about personal items missing?", points: 4, ftags: ["F557"] },
      { text: "Do you have or have you been offered a lock box or drawer in your room?", points: 3, ftags: ["F557"] },
      { text: "How do you find out about your rights?", points: 2, ftags: ["F573","F574","F576","F577"] },
      { text: "Are you invited to attend meetings with the staff when they discuss your care?", points: 2, ftags: ["F573","F574","F576","F577"] },
      { text: "Do you know that you can read the facility's last survey report? Do you know where the survey report is located?", points: 2, ftags: ["F573","F574","F576","F577"] },
      { text: "Do you know how to contact the ombudsman's office?", points: 3, ftags: ["F573","F574","F576","F577"] },
      { text: "Have you ever asked to look at your record? What happened?", points: 2, ftags: ["F573","F574","F576","F577"] },
      { text: "Do you get your mail promptly and unopened?", points: 2, ftags: ["F573","F574","F576","F577"] },
      { text: "Do you know how to access your money/personal funds?", points: 3, ftags: ["F573","F574","F576","F577"] },
      { text: "Can you access your money or personal funds on the weekends?", points: 2, ftags: ["F573","F574","F576","F577"] },
      { text: "Do you feel that the staff treats all residents with respect and dignity?", points: 3, ftags: ["F600"] },
      { text: "Do staff wear name badges in the facility?", points: 3, ftags: ["F600"] },
      { text: "Have you ever had a concern about the care you are provided?", points: 3, ftags: ["F600","F725"] },
      { text: "Has any resident had their belongings taken by a staff member without permission?", points: 3, ftags: ["F600","F725"] },
      { text: "Do you feel there is enough staff to take care of all of the residents?", points: 2, ftags: ["F600","F725"] },
      { text: "What would you do if a staff member spoke to you in an inappropriate way?", points: 4, ftags: ["F600","F725"] },
      { text: "Are you aware of what Medicare and Medicaid will pay for?", points: 2, ftags: ["F550","F620"] },
      { text: "Is the temperature in the facility and in your rooms comfortable?", points: 2, ftags: ["F584"] },
      { text: "How is the noise level in the facility?", points: 2, ftags: ["F584"] },
      { text: "Do you have enough light in your rooms for reading or other activities?", points: 2, ftags: ["F584"] },
      { text: "Have you seen insects or rodents in the building?", points: 3, ftags: ["F584"] },
      { text: "Do you generally get your meals on time?", points: 4, ftags: ["F809"] },
      { text: "What kind of snack are you offered at bedtime?", points: 2, ftags: ["F809"] },
      { text: "If you refuse food on the menu, are you offered or given an alternate meal?", points: 2, ftags: ["F809"] },
      { text: "Does the resident council meet regularly? How often?", points: 2, ftags: ["F565","F585"] },
      { text: "Can you have meetings without any staff present if you choose to?", points: 2, ftags: ["F565","F585"] },
      { text: "How does the facility staff respond to the council's concerns or individual grievances?", points: 4, ftags: ["F565","F585"] },
      { text: "Does the Grievance Official respond to your grievance or family concerns?", points: 4, ftags: ["F585"] },
      { text: "Do you know how to file a grievance?", points: 3, ftags: ["F585"] },
      { text: "Conduct a review of the grievance binder to ensure timely follow up to resident grievance and any concerns related to abuse/misappropriation was reported.", points: 8, ftags: ["F585"] },
    ],
  });

  // ✅ RESIDENT SPECIFIC TYPE TEMPLATES
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

  // Continue with all remaining resident templates... (I'll complete the rest)
  // Foley Catheter Use
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

  // Hospice
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

  // Hydration and Enteral Nutrition
  packs.push({
    template: { name: "Hydration and Enteral Nutrition", type: "resident" },
    questions: [
      { text: "The Registered Dietitian assessed the resident's fluid needs and assessed conditions that may put them at risk for dehydration or fluid imbalance.", points: 3, ftags: ["F692"] },
      { text: "A care plan was developed to ensure the resident had adequate fluid intake if warranted.", points: 3, ftags: ["F692","F656"] },
      { text: "The resident's fluid intake was monitored as warranted. Documentation was complete with no more than 3 shifts missing per month.", points: 5, ftags: ["F692"] },
      { text: "An I&O was initiated per facility policy if warranted.", points: 1, ftags: ["F692"] },
      { text: "The care plan was evaluated and revised based on the response, outcomes and needs of the resident.", points: 3, ftags: ["F692"] },
      { text: "The physician was notified of any changes in fluid intake.", points: 2, ftags: ["F657"] },
      { text: "Fluids provided at meal times.", points: 1, ftags: ["F692"] },
      { text: "Residents are provided assistance with fluids as warranted.", points: 1, ftags: ["F807"] },
      { text: "Adaptive equipment for fluids provided as ordered.", points: 2, ftags: ["F807"] },
      { text: "Hot drinks were served hot and cold drinks were served cold, according to resident preference.", points: 3, ftags: ["F804"] },
      { text: "The Registered Dietitian or designee conducted a fluid breakdown, by shift, for any resident on a fluid restriction. The breakdown identified the amount of fluids to be provided by the kitchen, and the amount of fluids to be provided by nursing staff.", points: 7, ftags: ["F692"] },
      { text: "Fluid restrictions were maintained. If not, there was documentation in the nursing notes regarding the fluid intake not being followed.", points: 5, ftags: ["F692"] },
      { text: "There were no fluids at the bedside of a resident on a fluid restriction.", points: 3, ftags: ["F692"] },
      { text: "There was documentation in the nursing notes regarding the fluid intake if the intake was insufficient.", points: 3, ftags: ["F692"] },
      { text: "The Registered Dietitian assessed the resident's nutrient needs and conditions that impact the need for enteral nutrition.", points: 3, ftags: ["F693"] },
      { text: "A care plan was developed to ensure the resident's enteral nutrition was managed appropriately.", points: 5, ftags: ["F693","F656"] },
      { text: "The enteral orders are complete and include: formula, rate, total volume, water flushes and hang times if applicable.", points: 7, ftags: ["F693"] },
      { text: "Enteral nutrition is running as ordered.", points: 15, ftags: ["F693"] },
      { text: "Pump and/or equipment is clean and in good working order.", points: 5, ftags: ["F693"] },
      { text: "There was documentation in the nursing notes regarding enteral intake if the intake was insufficient.", points: 4, ftags: ["F693"] },
      { text: "The Registered Dietitian reviews and documents on the resident's enteral plan of care at least monthly and adjusts as warranted.", points: 7, ftags: ["F693"] },
      { text: "MD was notified of any changes in the enteral care plan of care.", points: 4, ftags: ["F693"] },
      { text: "The care plan was evaluated and revised based on the response, outcomes and needs of the resident.", points: 5, ftags: ["F693"] },
      { text: "Gradual weight changes are addressed.", points: 3, ftags: ["F692","F693"] },
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

  // MDS / Care Planning (OBRA)
  packs.push({
    template: { name: "MDS / Care Planning (OBRA)", type: "resident" },
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

  // Mobility/Splints/ADL Care
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

  // Pain Management
  packs.push({
    template: { name: "Pain Management", type: "resident" },
    questions: [
      { text: "Was the resident assessed for pain on admission and no less often than quarterly?", points: 11, ftags: ["F697"] },
      { text: "Was pain coded on the MDS accurately?", points: 11, ftags: ["F641"] },
      { text: "Are there medications to manage pain ordered? Does the medication order delineate when to use them (mild, moderate to severe pain)?", points: 11, ftags: ["F697"] },
      { text: "Are the reasons and results of PRN pain medications documented?", points: 11, ftags: ["F697"] },
      { text: "Has a care plan been developed to address pain issues?", points: 11, ftags: ["F656"] },
      { text: "Are the interventions to alleviate pain implemented?", points: 11, ftags: ["F641"] },
      { text: "Is a new pain assessment conducted with any changes in pain?", points: 11, ftags: ["F697"] },
      { text: "Has the resident's pain been managed appropriately?", points: 12, ftags: ["F697"] },
      { text: "Is the pain medication regime revised if not effective?", points: 11, ftags: ["F697"] },
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

  // Smoking
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

  // Social Service
  packs.push({
    template: { name: "Social Service", type: "resident" },
    questions: [
      { text: "Assessment of Social Service history and needs within two weeks of admission.", points: 10, ftags: ["F658"] },
      { text: "Quarterly notes are written, comprehensive, and completed by the ARD date of the MDS assessment.", points: 10, ftags: ["F658"] },
      { text: "Referrals to outside agencies are made as warranted by Social Services.", points: 7, ftags: ["F745"] },
      { text: "Interactions with residents, families, and legal representatives are documented.", points: 7, ftags: ["F745"] },
      { text: "Social Services documentation provides direction to staff to meet unique Social Service needs for the resident.", points: 6, ftags: ["F842"] },
      { text: "Staff description of resident's behaviors are consistent with documented behaviors in the Social Service notes.", points: 5, ftags: ["F842"] },
      { text: "Social Services participates in the care planning process.", points: 8, ftags: ["F656"] },
      { text: "Social Services works with facility interdisciplinary team in addressing unique needs of residents.", points: 8, ftags: ["F656"] },
      { text: "Social Services has participated with family and resident concerning room transfers or rooming assignments.", points: 6, ftags: ["F563"] },
      { text: "Social Services assists residents with arranging for medical services (podiatrist, physician, dentist, etc.).", points: 8, ftags: ["F657"] },
      { text: "Social Services assists residents in maintaining ties to the community (church, community activities, voting, etc.).", points: 5, ftags: ["F563"] },
      { text: "Social Services assists residents with financial issues (Social Security, insurance issues, Medicaid, etc.).", points: 5, ftags: ["F622"] },
      { text: "Social Services ensures safe discharge planning for residents being discharged from the facility.", points: 10, ftags: ["F660"] },
      { text: "Social Services mediated between resident and family, when warranted.", points: 5, ftags: ["F745"] },
    ],
  });

  // Unintended Weight Changes
  packs.push({
    template: { name: "Unintended Weight Changes", type: "resident" },
    questions: [
      { text: "Residents were weighed monthly and weights were recorded in the medical record.", points: 5, ftags: ["F805"] },
      { text: "Significant weight changes (5% in 30 days or 10% in 180 days) were identified in a timely manner.", points: 10, ftags: ["F805"] },
      { text: "Physician was notified of significant weight changes.", points: 10, ftags: ["F657"] },
      { text: "Dietitian assessed weight loss and developed interventions.", points: 10, ftags: ["F805"] },
      { text: "Interventions to prevent or treat weight loss were implemented.", points: 15, ftags: ["F805"] },
      { text: "Weights were accurately calculated and recorded.", points: 5, ftags: ["F805"] },
      { text: "Care plan addressed weight loss risk factors and interventions.", points: 10, ftags: ["F656","F805"] },
      { text: "Weight loss was coded correctly on the MDS.", points: 5, ftags: ["F641"] },
      { text: "Family/responsible party was notified of significant weight changes.", points: 5, ftags: ["F580"] },
      { text: "Calorie counts were conducted when warranted.", points: 10, ftags: ["F805"] },
      { text: "Alternative feeding methods were considered when appropriate.", points: 5, ftags: ["F693"] },
      { text: "Resident was followed in weekly risk meetings until weight stabilized.", points: 5, ftags: ["F805"] },
      { text: "Weight loss was addressed in monthly QI activities.", points: 5, ftags: ["F867"] },
    ],
  });

  // Unnecessary Medications
  packs.push({
    template: { name: "Unnecessary Medications", type: "resident" },
    questions: [
      { text: "Medications were prescribed for appropriate indications.", points: 15, ftags: ["F758"] },
      { text: "Antipsychotic medications had appropriate indications or were being tapered.", points: 15, ftags: ["F758"] },
      { text: "Duplicate therapy was avoided unless clinically indicated.", points: 10, ftags: ["F758"] },
      { text: "Drug interactions were identified and addressed.", points: 10, ftags: ["F758"] },
      { text: "Medications were discontinued when no longer needed.", points: 10, ftags: ["F758"] },
      { text: "Regular medication review was conducted by pharmacy consultant.", points: 10, ftags: ["F755"] },
      { text: "Physician addressed pharmacy recommendations.", points: 10, ftags: ["F755"] },
      { text: "PRN medications were used appropriately and not routinely.", points: 5, ftags: ["F758"] },
      { text: "Alternative interventions were tried before adding new medications.", points: 5, ftags: ["F758"] },
      { text: "Gradual dose reduction was attempted for psychotropic medications.", points: 10, ftags: ["F758"] },
    ],
  });

  // ✅ PROCESS ALL TEMPLATE PACKS
  console.log("Processing template packs...");
  
  for (const pack of packs) {
    console.log(`Processing template: ${pack.template.name}`);

    // 1. Create template using the ensure function
    const templateId = await ensureTemplate(pack.template.name, pack.template.type);
    if (!templateId) {
      console.error(`Failed to create template: ${pack.template.name}`);
      continue;
    }

    // 2. Create questions for this template
    for (const q of pack.questions) {
      const questionId = await ensureQuestion(templateId, q.text, q.points);
      if (!questionId) {
        console.error(`Failed to create question: ${q.text}`);
        continue;
      }

      // 3. Link F-tags to this question (if any)
      if (q.ftags?.length) {
        for (const ftagCode of q.ftags) {
          const ftagId = await ensureFtag(ftagCode);
          if (ftagId) {
            await db
              .insert(schema.questionFtag)
              .values({ questionId, ftagId })
              .onConflictDoNothing();
          }
        }
      }
    }
  }

  await conn.end();
  console.log("✅ Seeding completed successfully!");
}

main().catch((err) => {
  console.error("❌ Seeding failed:", err);
  process.exit(1);
});
