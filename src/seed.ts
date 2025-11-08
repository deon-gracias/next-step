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
    { name: "Dexter House Healthcare", address: "120 Main Street, Malden, MA 02148", facilityCode: "1004" },
    { name: "Fall River Healthcare", address: "1748 Highland Avenue, Fall River, MA 02720", facilityCode: "1022" },
    { name: "Fitchburg Healthcare", address: "1199 John Fitch Highway, Fitchburg, MA 01420", facilityCode: "1005" },
    { name: "Garden Place Healthcare", address: "193 Pleasant Street, Attleboro, MA 02703", facilityCode: "1006" },
    { name: "Lee Healthcare", address: "620 Laurel Street, Lee, MA 01238", facilityCode: "1024" },
    { name: "Melrose Healthcare", address: "40 Martin Street, Melrose, MA 02176", facilityCode: "1009" },
    { name: "Norwood Healthcare", address: "460 Washington Street, Norwood, MA 02062", facilityCode: "1010" },
    { name: "Oakhill Healthcare", address: "76 North Street, Middleboro, MA 02346", facilityCode: "1011" },
    { name: "Plymouth Harborside Healthcare", address: "19 Obery Street, Plymouth, MA 02360", facilityCode: "1012" },
    { name: "The Elmhurst Healthcare", address: "743 Main Street, Melrose, MA 02176", facilityCode: "1013" },
    { name: "The Hermitage Healthcare", address: "383 Mill Street, Worcester, MA 01602", facilityCode: "1014" },
    { name: "The Landing at Laurel Lake", address: "620 Laurel Street, Lee, MA 01238", facilityCode: "1025" },
    { name: "Wedgemere Healthcare", address: "146 Dean Street, Taunton, MA 02780", facilityCode: "1015" },
    { name: "West Newton Healthcare", address: "25 Armory Street, West Newton, MA 02465", facilityCode: "1016" },
    { name: "Westborough Healthcare", address: "8 Colonial Drive, Westborough, MA 01581", facilityCode: "1030" },
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
      { text: "There was a communication system within the facility to alert the Maintenance Department that a repair was needed.", points: 2, ftags: ["F584"] },
      { text: "The clean utility room was clean and orderly with nothing stored under the sink. There were only clean items in the room.", points: 3, ftags: ["F584","F880"] },
      { text: "The ice machine was clean and properly functioning.", points: 3, ftags: ["F584","F880"] },
      { text: "The shower and tub room were clean and odor free. There is nothing stored in the shower or tub room, i.e. equipment, clothing, etc.", points: 3, ftags: ["F584","F880"] },
      { text: "Privacy was provided for residents. Shower curtains were available and wide enough to go around the shower. The curtains were clean and properly hung. Grab bars were near tubs, showers, and toilets.", points: 3, ftags: ["F583","F584"] },
      { text: "Showers and tub rooms were free of improperly stored items, chemicals, and hazardous products.", points: 3, ftags: ["F584"] },
      { text: "All clean linen was covered or stored in a closet or covered linen cart. All soiled linen was storeds in an appropriately covered container.", points: 4, ftags: ["F880"] },
      { text: "The water temperature in resident sinks, baths and showers was no higher than 110. There was a daily log of temperatures.", points: 4, ftags: ["F584","F689"] },
      { text: "There were detailed plans and procedures to meet disasters, fire and weather emergencies and missing residents.", points: 3, ftags: ["F584"] },
      { text: "The halls were uncluttered. All items were on one side of the hall.", points: 3, ftags: ["F584"] },
      { text: "Resident handrails on both sides of the hall were clean, secure and free of sharp or rough edges.", points: 3, ftags: ["F584","F689"] },
      { text: "Floors in common areas and resident rooms were clean, and in good repair.", points: 3, ftags: ["F584"] },
      { text: "Walls and doors in common areas and in resident rooms were clean, free of stains and in good repair.", points: 3, ftags: ["F584"] },
      { text: "The ceiling tiles were intact and stain-free. Ceiling light fixtures were clean, secure, and in good repair.", points: 3, ftags: ["F584"] },
      { text: "Resident rooms, bathrooms and common areas were free of unpleasant odors.", points: 3, ftags: ["F584"] },
      { text: "Cleaning products were not left on top of housekeeping carts when unattended.", points: 4, ftags: ["F689"] },
      { text: "Resident call lights were operable, visible and accessible to the resident, staff and family.", points: 3, ftags: ["F919"] },
      { text: "Dining and resident activity areas were adequately furnished and had sufficient space to accommodate care and activity.", points: 2, ftags: ["F920"] },
      { text: "Each resident room has privacy curtains that are in good repair.", points: 3, ftags: ["F583"] },
      { text: "Each resident room was furnished with functional furniture in good repair.", points: 2, ftags: ["F910"] },
      { text: "There were individual closet space with clothes racks and shelves.", points: 4, ftags: ["F910"] },
      { text: "Bed brakes on resident beds were intact and operable.", points: 3, ftags: ["F908"] },
      { text: "The linen was clean, stain-free, and in good repair.", points: 2, ftags: ["F880"] },
      { text: "Resident rooms contained personal belongings to the extent possible.", points: 3, ftags: ["F584"] },
      { text: "Chemicals in the utility room were stored appropriately, labeled with contents and hazard warnings. No aerosols were present.", points: 3, ftags: ["F689"] },
      { text: 'Items were stored 3" off the floor and 18" from sprinkler heads in all areas.', points: 3, ftags: ["F584"] },
      { text: "Paper goods were stored separately from any chemicals.", points: 2, ftags: ["F689"] },
      { text: "There was a current MSD available for hazardous chemicals used in the facility. It was readily accessible for staff use. Staff were aware of its location.", points: 2, ftags: ["F689"] },
      { text: "Eye wash stations were present and not behind locked doors. Staff were aware of their locations. They were maintained in acordance to manufacturer recommendations and functioning.", points: 2, ftags: ["F584"] },
      { text: "The environment was pest-free. There was no evidence of rodent or insect infestation. There is a pest control log with a description of what was done and where for each visit.", points: 2, ftags: ["F925"] },
      { text: "Wet floor signs were used when indicated. Only 1/2 width of a corridor was wet mopped at one time. Wet floor signs had an arrow that pointed to the wet side.", points: 3, ftags: ["F689"] },
      { text: "Sharps containers (for needles, razors, or any sharp objects) were readily available. Containers were not filled past the 2/3rds mark.", points: 3, ftags: ["F689"] },
      { text: "There was evidence that mechanical lift and resident equipment was maintained and in safe operating condition.", points: 2, ftags: ["F908"] },
    ],
  });

  // Infection Control COVID-19 Outbreak (from Infection-Control-COVID-QISVF0037.docx)
  packs.push({
    template: { name: "Infection Control COVID-19 Outbreak", type: "general" },
    questions: [
      { text: "The facility reported the initial case to DPH HCFRS (Vitural Gateway) and to epidemiology via Casetivity", points: 10, ftags: ["F880"] },
      { text: "Were positive residents immediately placed on isolation precautions.", points: 10, ftags: ["F880"] },
      { text: "Is there evidence of contact tracing completed.", points: 10, ftags: ["F880"] },
      { text: "Is resident/staff testing being completed every 48 hours as required", points: 10, ftags: ["F880"] },
      { text: "Are Respiratory Line Listings completed which include testing of positive ecposed residents", points: 10, ftags: ["F880"] },
      { text: "Precaution rooms have an isolation sign at the doorway and a PPE cart with appropriate supplies. ", points: 10, ftags: ["F880"] },
      { text: "Is there a teash barrel near the doorway of the resident room to allow for doing PPE?", points: 10, ftags: ["F880"] },
      { text: "Handwashing was being conducted as appropriate. ", points: 10, ftags: ["F880"] },
      { text: "Is PPE being donned and doffed as required?", points: 10, ftags: ["F880"] },
      { text: "Is there evidence of Hand Hygiene and PPE audits being conducted by the ICP/designee", points: 10, ftags: ["F880"] },
    ],
  });

  packs.push({
    template: { name: "Investigative Protocol - Infection Control", type: "general" },
    questions: [
        { text: "The facility had a system to prevent, monitor and investigate causes of infection.", points: 5, ftags: ["F880"] },
        { text: "The infection control line listings are maintained monthly. (all data is completed)", points: 15, ftags: ["F880"] },
        { text: "There is evidence of monthly infection surveillance including analysis of infections for trend identification and corrective actions.", points: 15, ftags: ["F880"] },
        { text: "Precaution rooms have a sign on the door for the type of precaution. Staff can verbalize this type of infection.", points: 10, ftags: ["F880"] },
        { text: "Handwashing was being conducted as appropriate.", points: 8, ftags: ["F880"] },
        { text: "Resident care equipment was prperly cleaned, changed and stored. ", points: 5, ftags: ["F880"] },
        { text: "Staff handled linen appropriately to prevent the spread of infection. Clean and soiled linen was stored seperately(Observe laundry area))", points: 5, ftags: ["F880"] },
        { text: "Staff were washing their hands and equipment between residents. Gloves were used properly (Gloves are not worn in the hallway)", points: 5, ftags: ["F880"] },
        { text: "Oxygen tubing was changed and dated weekly and bagged when not in use. O2 filters are clean", points: 7, ftags: ["F880"] },
        { text: "Nebulizer tubing was changed weekly and bagged or in the holder when not in use.", points: 5, ftags: ["F880"] },
        { text: "Feeding tube, piston syringes and Tube Feeding bottles are changed and dated Q 24-hours.", points: 5, ftags: ["F880"] },
        { text: "Linen is not stored in resident rooms. Linen hampers have lids, are not overflowing and are removed from the unit during meals.", points: 5, ftags: ["F880"] },
        { text: "Are glucometers cleaned between resident use?", points: 5, ftags: ["F880"] }
    ],
});


  // Kitchen Observations (from Kitchen-Observations-QISVF0012.docx)
  packs.push({
    template: { name: "Kitchen Observations", type: "general" },
    questions: [
      { text: "Tray line started on time. Indicate scheduled start time and actual start time. ", points: 5, ftags: ["F812"] },
      { text: "Temperature of cold items leaving the tray line was below 40°F.", points: 5, ftags: ["F804","F812"] },
      { text: "Temperature of hot items leaving the steam table was greater than 140°F.", points: 5, ftags: ["F804","F812"] },
      { text: "Standardized recipes were present and followed by cooks.", points: 5, ftags: ["F803"] },
      { text: "Food substitutions were available that provided a similar nutritive value.", points: 5, ftags: ["F806"] },
      { text: "Menus were prepared in advance and posted in the kitchen and on the units.", points: 5, ftags: ["F803"] },
      { text: "Food was prepared and served according to the preplanned menu.", points: 5, ftags: ["F803"] },
      { text: "Trays, dinnerware and utensils were in good condition.", points: 2, ftags: ["F812"] },
      { text: "Tray covers or appropriate trays were used.", points: 2, ftags: ["F550"] },
      { text: "The time span between the evening meal and the following day's breakfast was 14 hours or less. Indicate P.M. meal time and breakfast time.", points: 4, ftags: ["F809"] },
      { text: "Meal times were acceptable to the majority of the residents in the facility. This was supported through Resident Council minutes.", points: 4, ftags: ["F809"] },
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
      { text: "Dry foods were stored off the floor and stock rotated. Dry foods were stored at least 18'' from ceiling.", points: 2, ftags: ["F812"] },
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
      { text: "The nurse washed hands prior to the start of the medication pass and after each resident contact. The nurse may use an approved hand-cleaning product.", points: 10, ftags: ["F880"] },
      { text: "The MAR was reviewed prior to preparing the resident's medication.", points: 5, ftags: ["F758"] },
      { text: "All medication orders contained the name, strength, frequency, route of administration and reason for PRN usage.", points: 5, ftags: ["F758"] },
      { text: "The resident was identified prior to the administration of medication.", points: 5, ftags: ["F758"] },
      { text: "Appropriate vital signs were taken and documented prior to preparing and administering the medication as warranted.", points: 5, ftags: ["F758"] },
      { text: "Any special directions for preparation and administration of the medications were followed, such as liquids shaken, given with food, etc.", points: 5, ftags: ["F758"] },
      { text: "Only those medications identified as crushable were crushed.", points: 5, ftags: ["F758"] },
      { text: "The six R's were followed: Right resident received the right medication in the right dosage, via the right route, at the right time, documented.", points: 15, ftags: ["F758"] },
      { text: "The same nurse who prepared the medication administered the medication and stayed with the resident until taken.", points: 5, ftags: ["F758"] },
      { text: "All medications were documented per facility policy and procedure.", points: 5, ftags: ["F758"] },
      { text: "Any injection sites were documented on the MAR.", points: 5, ftags: ["F758"] },
      { text: "Used needles and syringes were not recapped or broken by hand and were disposed of in a suitable puncture-resistant container.", points: 5, ftags: ["F758"] },
      { text: "Any medications that were refused or omitted were documented on the MAR along with the reason for the refusal and/or omission.", points: 5, ftags: ["F758"] },
      { text: "Reason and result of PRN medications were documented on the MAR.", points: 5, ftags: ["F758"] },
      { text: "The medication pass was completed within one (1) hour before or after the designated time of administration.", points: 10, ftags: ["F758"] },
      { text: "Self Administration: Was order present? Was assessment present? Was care plan present?", points: 5, ftags: ["F554"] },
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
      { text: "The medication room refrigerator was clean. No food items were stored in this refrigerator. There is a thermometer in the refrigerator at 36° to 46°F. If the fridge temperature was out of range, there is documentation of action taken", points: 5, ftags: ["F761","F880"] },
      { text: "The medication room and medication cart were free of any pre-poured medications.", points: 5, ftags: ["F758"] },
      { text: "All oral medications, nasal inhalers, injections, externals, eye drops, and nasal drops were stored separately.", points: 5, ftags: ["F761"] },
      { text: "Expired medications were not found in the medication room or medication carts.", points: 10, ftags: ["F761"] },
      { text: "Quality checks were being done daily and documented, for any glucometer in use on the nursing units.", points: 5, ftags: ["F758"] },
      { text: "The narcotic count was correct and is completed by two (2) licensed nurses every shift and recorded.", points: 5, ftags: ["F755","R1250"] },
      { text: "All Schedule II drugs were double-locked.", points: 5, ftags: ["F761"] },
      { text: "There is documentation of regularly occurring narcotic destruction at least monthly.", points: 5, ftags: ["F755"] },
      { text: "Multi-dose vials which have been opened or accessed (e.g., needle-punctured) should be dated and discarded within 28 days unless the manufacturer specifies a different (shorter or longer) date for that opened vial.", points: 15, ftags: ["F761"] },
      { text: "Kits were not open or if open have been reordered per pharmacy protocol.", points: 5, ftags: ["F761"] },
      { text: "All discontinued medications were disposed of properly, following state requirements. Discontinued medications were not stored in the medication cart.", points: 5, ftags: ["F761"] },
    ],
  });


  // Nursing Unit Observation
  packs.push({
    template: { name: "Nursing Unit Observation", type: "general" },
    questions: [
      { text: "There was no confidential resident information lying out in view on visitors, such as open charts, MARs, treatment sheets, labs, progress notes, etc.).", points: 8, ftags: ["F583"] },
      { text: "Each CNA received pertinent information regarding the residents they were assigned to for the day.", points: 7, ftags: ["F656"] },
      { text: "There was an emergency cart and suction machine available, checked daily, and documented.", points: 7, ftags: ["F658"] },
      { text: "Emergency oxygen is available and ready for use with a gauge and is applicable. There was a wrench with the tank.", points: 7, ftags: ["F658"] },
      { text: "Oxygen was stored appropriately. 'Oxygen – No Smoking' signs were posted where oxygen was stored or in use.", points: 8, ftags: ["F921"] },
      { text: "Infectious waste was handled appropriately, covered and marked as biohazard waste, and stored in a locked area.", points: 10, ftags: ["F921"] },
      { text: "Hazardous products were stored in a locked area when not in use and were under constant direct supervision when being used.", points: 8, ftags: ["F689","F921"] },
      { text: "Open pour bottles of sterile solution, such as normal saline and sterile water, were dated and initialed when opened, and discarded no more than 24 hours after opening. Treatment creams were appropriately labeled for individual use and all treatment packaging was intact.", points: 12, ftags: ["F880"] },
      { text: "Facility staff were observed knocking on resident's doors and announcing themselves prior to  entering the resident's room.", points: 7, ftags: ["F583"] },
      { text: "Call lights were answered in a timely manner.", points: 8, ftags: ["F550","F689"] },
      { text: "Bedpans, urinals, and graduates for measuring output were clean and stored appropriately.", points: 4, ftags: ["F880"] },
      { text: "No personal items left in the shower room.", points: 7, ftags: ["F880"] },
      { text: "All food items in the resident's rooms were stored properly in sealed containers.", points: 7, ftags: ["F812"] },
    ],
  });

  // Quality Assessment and Assurance Review (from Quality-Assessment-and-Assurance-Review-Rev.-1-9-24.docx)
  packs.push({
    template: { name: "Quality Assessment and Assurance Review", type: "general" },
    questions: [
      { text: "The facility has a QAPI committee that consists of at least the DON, the Medical Director (or his/her designee), the Infection Preventionist, and two members of the facility staff.", points: 10, ftags: ["F868"] },
      { text: "The committee held facility quarterly meetings and had a quarterly meeting with pharmacy, lab, and x-ray representatives. Minutes were kept.", points: 15, ftags: ["F868"] },
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
      { text: "Is the Activities Director a qualified therapeutic recreation specialist or an activities professional: Eligible for certification as a therapeutic recreation specialist or as an activity professional by a recognized accrediting body on or after October 1, 1990; or, has 2 years of experience in a social or recreational program wihtin the last 5 years, one of which was full-time in a theraputic activites program; or is a qualified occupational therapist or occupational therapy assisstant; or has completed a training course approved by the state", points: 7, ftags: ["F680"] },
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
      { text: "Notification of condition change: MD/NP Noted change? Family/HCP/Legal Representatice notified of fall? Clincal documentation substantiaties Notification? MD orders received amd transcribed appropriate if applicable?", points: 10, ftags: ["F580"] },
      { text: "documentation of transfer/Discharge if warranted: Did fall/injury require hospital transfer? (If yes, Continue) Did the facility obtain MD order for transfer?", points: 3, ftags: ["F623","F625"] },
      { text: "Was a Discharge/transfer evaluation completed and a bed hold notice completed/sent .", points: 5, ftags: ["F623","F625"] },
      { text: "Is there a comprehensive nurses note regarding the fall?", points: 5, ftags: ["F689"] },
      { text: "Did the nurse complete an Accident/Incident report?", points: 6, ftags: ["F689"] },
      { text: "Is there an investigation file with staff statements for each fall?", points: 8, ftags: ["F689"] },
      { text: "Was the resident identified as 'at risk' via accurate fall risk assessment.", points: 5, ftags: ["F689"] },
      { text: "Was a fall prevention plan of care developed based on risk assessment?", points: 10, ftags: ["F656"] },
      { text: "Was an immediate/appropriate post-fall intervention on Care Plan and CNA Karde? Status post fall", points: 10, ftags: ["F656","F689"] },
      { text: "Was the intervention placed on the Care Plan implemented?  Does the staff know about the intervention? (Interview staff on the unit).", points: 10, ftags: ["F656","F689"] },
      { text: "Is thev MDS assessment coded correctly for any falls?", points: 5, ftags: ["F641"] },
      { text: "Were neuro signs conducted per protocol (unwitnessed fall/head strike).", points: 5, ftags: ["F689"] },
      { text: "Was a pain assessment completed after the fall?", points: 6, ftags: ["F689"] },
      { text: "Was thr resident reviewed during weekly Risk Meeting for 4 weeks s/p fall.", points: 6, ftags: ["F689"] },
      { text: "Is falls included in monthly QI reporting?", points: 6, ftags: ["F867"] },
    ],
  });

  // Continue with all remaining resident templates... (I'll complete the rest)
  // Foley Catheter Use
  packs.push({
    template: { name: "Foley Catheter Use", type: "resident" },
    questions: [
      { text: "An assessment was completed for the use of the Foley Catheter, no less often than quarterly..", points: 15, ftags: ["F315"] },
      { text: "There was valid medical justification supporting the use of the Foley Catheter..", points: 10, ftags: ["F315"] },
      { text: "There is a physician’s order for the F/C with size stated and when to change the catheter.  Irrigation orders were specific along with F/C care QS.", points: 10, ftags: ["F315"] },
      { text: "A care plan was developed for Foley Catheter use.", points: 5, ftags: ["F315"] },
      { text: "Foley Catheters and tubing were positioned correctly to facilitate straight drainage.", points: 10, ftags: ["F315"] },
      { text: "The bags were hung below the level of the bladder.", points: 10, ftags: ["F315"] },
      { text: "The tubing and bag were not touching the floor.", points: 10, ftags: ["F315"] },
      { text: "The catheter was secured to the body with a leg strap.", points: 10, ftags: ["F315"] },
      { text: "The bag was clean and odor free.", points: 10, ftags: ["F315"] },
      { text: "The catheter bag was covered with a 'dignity cover'", points: 5, ftags: ["F315"] },
      { text: "The MDS was coded correctly for the use of the Foley Catheter.", points: 5, ftags: ["F315","F656"] },
    ],
  });

  // Hospice
  packs.push({
    template: { name: "Hospice", type: "resident" },
    questions: [
      { text: "Orders for hospice evaluation", points: 15, ftags: ["F849"] },
      { text: "If appropriate for Hospice, order to admit with name of hospice company", points: 20, ftags: ["F849"] },
      { text: "Care plan for hospice with services integrated", points: 20, ftags: ["F849","F656"] },
      { text: "MDS completed within 14 days of admission to hospice", points: 20, ftags: ["F849","F641"] },
      { text: "Hospice contract", points: 10, ftags: ["F698"] },
      { text: "Printed schedule with frequency of discipline visit weekly", points: 15, ftags: ["F849"] },
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
      { text: "Residents/Resident Representative were provided the consent for Flu, Pneumovax and COVID vaccinations on admission. The consent is complete indicating consent or declination of vaccines.", points: 15, ftags: ["F883","F887"] },
      { text: "Vaccines administered as indicated.", points: 15, ftags: ["F887"] },
      { text: "Education was available and had been provided/documented for residents about Flu, Pneumovax and COVID immunizations, whether they received the vaccine or not.", points: 15, ftags: ["F883","F887"] },
      { text: "Resident’s Immunization record is complete with the flu, pneumovax, COVID vaccinations they received/declined, and PPD testing.", points: 15, ftags: ["F883","F887"] },
      { text: "The MDS was coded correctly for resident's immunizations.", points: 10, ftags: ["F641"] },
      { text: "There is a mechanism during the respiratory season of a log of employee who received or declined the flu vaccine", points: 10, ftags: ["F883"] },
      { text: "There was a physician’s order for Flu, Pneumovax and COVID vaccine.", points: 10, ftags: ["F883","F887"] },
    ],
  });

  // MDS / Care Planning (OBRA)
  packs.push({
    template: { name: "MDS / Care Planning (OBRA)", type: "resident" },
    questions: [
      { text: "MDS assessment was completed by the 14th day after admission.", points: 7, ftags: ["F636"] },
      { text: "MDS Assessment had an RN signature at Z0500 and signed and dated in section VO200B.", points: 7, ftags: ["F636"] },
      { text: "Dates in section 20500 after ARD. Evidence of interviews being completed on or 6 days before ARD.", points: 7, ftags: ["F641"] },
      { text: "CAA summaries were present for each trigger and were signed and dated. The CAA had location of information.", points: 6, ftags: ["F641"] },
      { text: "MDS were submitted in the appropriate time frame", points: 6, ftags: ["F640"] },
      { text: "Care plans were present for each CAA, if the decision was to proceed", points: 5, ftags: ["F641"] },
      { text: "Comprehensive Care Plans were developed by the 21st day.", points: 6, ftags: ["F636"] },
      { text: "Quarterly MDS Assessments were conducted within 92 days after the last ARD date?", points: 7, ftags: ["F638"] },
      { text: "Annual/Comprehensive MDS Assessments were completed within 366 days of the last Comprehensive ARD date?", points: 8, ftags: ["F636"] },
      { text: "Significant Change in Status Assessments were conducted as warranted.", points: 6, ftags: ["F637"] },
      { text: "Evaluations were conducted in the 7-day assessment period.", points: 7, ftags: ["F641"] }, 
      { text: "MDS Assessments were transmitted within 14 days of completion.", points: 6, ftags: ["F640"] }, 
      { text: "Initial Care Plans were developed?", points: 6, ftags: ["F655"] },
      { text: "Care plans are review and revised at least quarterly on SCSA?", points: 10, ftags: ["F657"] }, 
      { text: "Evidence of care plan meeting being held quarterly.", points: 6, ftags: ["F656"] }, 
    ],
  });

  // Mobility/Splints/ADL Care
  packs.push({
    template: { name: "Mobility/Splints/ADL Care", type: "resident" },
    questions: [
      { text: "If the resident triggered for a decline in ADLs or mobility decline, a rehab screen was requested and conducted", points: 10, ftags: ["F826"] },
      { text: "If rehab services needed, was there an order obtained?", points: 12, ftags: ["F825"] },
      { text: "Rehab screens were available for review.", points: 10, ftags: ["F842"] },
      { text: "If there is an order for the splints, the splint schedule was care planned that includes donning and doffing schedule.", points:15 , ftags: ["F658"] },
      { text: "The splints were applied per the care plan/ physician order", points: 15, ftags: ["F658"] },
      { text: "Resident has a care plan for ADL and is completed with the assistance needed.", points: 15, ftags: ["F676"] },
      { text: "Interview staff to determine if staff is aware of resident care needs per care plan/ Kardex", points: 12, ftags: ["F656"] },
      { text: "The care plan/ Kardex reflects the resident’s current status.", points: 11, ftags: ["F656"] },
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
      { text: "Was resident admitted with this pressure ulcer? Was the PU identified on the Nursing Admission Assessment? If identified, was it documented and measured on the same day?", points: 10, ftags: ["F658","F686"] },
      { text: "Is there a corresponding treatment order for the PU on the day PU was identified?", points: 10, ftags: ["F686"] },
      { text: "Has the resident been seen by wound provider and were recommendations and treatment addressed and documented ", points: 5, ftags: ["F658"] },
      { text: "Was the MD/NP and responsible party notified of a newly developed or worsening PU?", points: 5, ftags: ["F580"] },
      { text: "Is the order transcribed correctly on the TAR?", points: 5, ftags: ["F686"] },
      { text: "Are weekly skin assessments completed? Do they accurately reflect the resident’s skin condition?", points: 10, ftags: ["F686","F842"] },
      { text: "If the resident was identified at high risk for the development of pressure sores, was this addressed on the Resident’s plan of care?", points: 5, ftags: ["F656","F686"] },
      { text: "Is there a comprehensive care plan in place to prevent pressure ulcers or assist with healing of pressure ulcers", points: 5, ftags: ["F656","F686"] },
      { text: "Is the Pressure Ulcer Evaluation accurately completed on a weekly basis?.", points: 10, ftags: ["F686"] },
      { text: "Has the Dietician documented the area and  recommendations carried out? .", points: 5, ftags: ["F692"] },
      { text: "If the resident has an order for a specialty mattress and set per MD order?", points: 5, ftags: ["F686"] },
      { text: "Is the MDS coded correctly for the PU?", points: 5, ftags: ["F641"] },
      { text: "Is the resident followed in weekly at-risk meetings until the PU is resolved?", points: 5, ftags: ["F686"] },
      { text: "Has the MD/NP visited since the development of the PU?  If so, does the progress note address the PU?", points: 5, ftags: ["F711"] },
      { text: "Wound treatment was performed per physician order and infection control practices followed?", points: 10, ftags: ["F880"] },
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
      { text: "Staff were responding to residents appropriately, specifically those with behavioral symptoms such as crying out, disrobing, agitation.", points: 8, ftags: ["F557","F741"] },
      { text: "Assistive devices applied appropriately, were clean and in good repair.", points: 6, ftags: ["F676","F677"] },
      { text: "Resident's mouth and lips were moist, clean, and free of offensive odors.", points: 8, ftags: ["F676","F677"] },
      { text: "Resident was free of facial hair (unless male and perfers a beard or mustache, or female and this is her preference as documented on care plan.", points: 8, ftags: ["F557"] },
      { text: "Resident's fingernails and toenails were clean and trimmed.", points: 6, ftags: ["F557","F676","F677"] },
      { text: "Residents appropriately positioned and in good by alignment; appropriate footwear.", points: 8, ftags: ["F676","F677"] },
      { text: "Preventative mattresses, inflated air mattresses, handrolls, heel and elbow protectors, wheelchair cushions, etc. were clean and in good working order.", points: 8, ftags: ["F908"] },
      { text: "The facility had adequate and comfortable lighting in resident rooms and other resident areas.", points: 5, ftags: ["F584"] },
      { text: "The resident's room was individualized with their own personal belongings as desired.", points: 5, ftags: ["F558"] },
      { text: "The facility maintained comfortable sound levels.", points: 8, ftags: ["F584"] },
      { text: "The resident was provided privacy, i.e., curtain closed during care. Staff knocked on door prior to entry, and only authorized staff were present during care and treatments.", points:8 , ftags: ["F557"] },
    ],
  });

  // Smoking
  packs.push({
    template: { name: "Smoking", type: "resident" },
    questions: [
      { text: "Does the resident have a smoking evaluation?", points: 12, ftags: ["F689","F636"] },
      { text: "Is there an individual care plan?", points: 12, ftags: ["F656"] },
      { text: "Are there burn areas noted on the resident clothing?", points: 12, ftags: ["F689"] },
      { text: "Does the resident have a smoking apron per care plan and evaluation and is it being used.", points: 10, ftags: ["F656","F636"] },
      { text: "Does the resident use oxygen, if yes, is it properly stored prior to smoking", points: 10, ftags: ["F689","F926"] },
      { text: "Interviewed resident, do they keep their cigarette and lighters with them", points: 10, ftags: ["F689","F926"] },
      { text: "What is the facility process for storing cigarette and lighters", points: 12, ftags: ["F689"] },
      { text: "Is staff present outside while residents are smoking. Are staff noted to be smoking with residents", points: 12, ftags: ["F689"] },
      { text: "Do resident know where the designated smoking area is located", points: 10, ftags: ["F689"] },
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
      { text: "Staff description of resident's behaviors are consistent with documented behaviors in the Social Service notes.", points: 10, ftags: ["F842"] },
      { text: "Resident episodic events are documented in the Social Service notes.", points: 10, ftags: ["F745"] },
      { text: "72 hour discharge meeting held and documented in PCC.", points: 10, ftags: ["F655"] },
      { text: "Care plans in place for psychosocial wellness.", points: 5, ftags: ["656"] },
      { text: "Discharge transfer and bed hold form sent if resident was transfer to the hospital", points: 10, ftags: ["F625","623"] },
      { text: "Discharge planning is present in the initial Social Service note.", points: 5, ftags: ["F660"] },
      { text: "Medicare cut letters are sent by Social Services as warranted and signed appropriately.", points: 10, ftags: ["F582"] },
    ],
  });

  // Unintended Weight Changes
  packs.push({
    template: { name: "Unintended Weight Changes", type: "resident" },
    questions: [
      { text: "For residents admitted in the past year, the resident’s weight was obtained with 24 hours of admission or readmission.", points: 7, ftags: ["F692"] },
      { text: "For residents admitted in the past year, the residents weight was obtained weekly for 4 weeks after admission.", points: 7, ftags: ["F692"] },
      { text: "The resident was initially assessed for conditions that may have put them at risk for unintended weight changes", points: 4, ftags: ["F692"] },
      { text: "A care plan was developed based on the assessed risk factors.", points: 4, ftags: ["F656"] },
      { text: "Resident’s monthly weights were completed on or before the 10th of the month", points: 7, ftags: ["F692"] },
      { text: "Re-weighs are completed as warranted within 48 hours. ", points: 7, ftags: ["F692"] },
      { text: "The RD was notified of changes in weight, reviewed and assessed in a timely manner.", points: 7, ftags: ["F692"] },
      { text: "The frequency of weights was appropriate to accurately monitor, assess, manage and prevent further weight changes.", points: 7, ftags: ["F692"] },
      { text: "Weights were completed as ordered.", points: 7, ftags: ["F692"] },
      { text: "The care plan was evaluated and revised based on the response, outcomes and needs of the resident as warranted.", points: 4, ftags: ["F657"] },
      { text: "The Registered Dietitian documented on evaluation and revisions of the plan of care at least monthly. ", points: 5, ftags: ["F692"] },
      { text: "The MD/NP were notified of changes in weight and revisions of the plan of care if warranted. ", points: 5, ftags: ["692"] },
      { text: "The MD/NP documented on the weight changes", points: 4, ftags: ["F692"] },
      { text: "The MDS is coded correctly for weight loss", points: 5, ftags: ["F692"] },
      { text: "Meal intake is accurately documented with no more than 3 meal percentage omissions per month.", points: 5, ftags: ["692"] },
      { text: "The responsible party was notified of change in weight and reasons of the care plan if warranted. ", points: 5, ftags: ["F692"] },
      { text: "Recommendations from the RD were implemented and addressed in a timely manner. ", points: 5, ftags: ["F692"] },
      { text: "Interventions are provided as ordered.", points: 5, ftags: ["F692"] },
    ],
  });

  // Unnecessary Medications
  packs.push({
    template: { name: "Unnecessary Medications", type: "resident" },
    questions: [
      { text: "Medications had appropriate indications for or diagnosis", points: 10, ftags: ["F757"] },
      { text: "The physician documented the rationale of duplicate medication therapy.", points: 9, ftags: ["F758","F757"] },
      { text: "Is there written, informed consent for any psychotropic medication", points: 5, ftags: ["F551","F9000"] },
      { text: "Is there annual consent for this medication?", points: 5, ftags: ["F551","9000"] },
      { text: "If the resident had a Rogers Guardianship in place, it was current and reflected the dose of antipsychotic medication the resident was currently receiving.", points: 5, ftags: ["F551","9000"] },
      { text: "An AIMS test was conducted every 6 months while the resident was on an antipsychotic medication.", points: 9, ftags: ["F758"] },
      { text: "Behavior monitoring for which any psychotropic medication was prescribed.", points: 9, ftags: ["F758"] },
      { text: "The resident’s drug regimen was reviewed by the pharmacist at least monthly.", points: 4, ftags: ["F756"] },
      { text: "Pharmacy recommendations were reported and addressed in a timely manner? ", points: 4, ftags: ["F756"] },
      { text: "A medication off-site review was conducted if the resident was expected to be short term <30 days, or with any change in status.", points: 7, ftags: ["F756"] },
      { text: "The CAA for psychotropic drug use was accurately documented and the MDS was coded correctly for psychotropic medications.", points: 7, ftags: ["F641"] },
      { text: "A care plan was developed for any psychotropic medication and followed.", points: 8, ftags: ["F656"] },
      { text: "A sedative/ hypnotic medication used routinely and beyond manufacturer’s recommendations for duration of use was tapered quarterly, unless clinically contraindicated.", points: 8, ftags: ["F758"] },
      { text: "PRN psychotropic medication have a stop date of 14days and renew with a rationale for continued use with a stop date", points: 10, ftags: ["F758"] },
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
