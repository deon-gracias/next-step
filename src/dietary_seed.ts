import { drizzle } from "drizzle-orm/postgres-js";
import { sql } from "drizzle-orm";
import postgres from "postgres";
import * as schema from "@/server/db/schema";

async function main() {
  const DATABASE_URL = "postgresql://postgres:Rahul@2025@db.odjkzowqixaqpesalenl.supabase.co:5432/postgres"
  if (!DATABASE_URL) {
    throw new Error("DATABASE_URL is not set. Put it in your .env");
  }
  console.log("🌱 Seeding Dietary Templates...");

  const conn = postgres(DATABASE_URL, { max: 1 });
  const db = drizzle(conn, { schema });

  // Get or use default organization (use one from your existing seed)
  const orgId = "QnhkP7TAfPMm4ZG8B0IOXWZPUbuy41Co"; // "Dietary" org from your existing seed

  // ==================== HIGH TEMP MACHINE TEMPLATE ====================
  const [highTempTemplate] = await db
    .insert(schema.dietaryTemplate)
    .values({
      name: "High Temp Machine",
      machineType: "high_temp",
      description: "Dietary audit template for facilities using high temperature dishwashing machines",
      organizationId: orgId,
      isActive: true,
    })
    .onConflictDoNothing()
    .returning();

  if (!highTempTemplate) {
    console.log("High Temp template already exists");
    await conn.end();
    return;
  }

  console.log(`✅ Created template: ${highTempTemplate.name}`);

  // Section #1: STOREROOMS (6 questions)
  const [section1] = await db
    .insert(schema.dietarySection)
    .values({
      templateId: highTempTemplate.id,
      sectionNumber: 1,
      title: "STOREROOMS",
      maxPoints: 6,
      sortOrder: 1,
    })
    .returning();

  await db.insert(schema.dietaryQuestion).values([
    {
      sectionId: section1!.id,
      questionLetter: "A",
      questionText: "All items covered, labeled & dated - check all open packages. Food & chemicals stored separately.",
      points: 1,
      sortOrder: 1,
    },
    {
      sectionId: section1!.id,
      questionLetter: "B",
      questionText: "No expired food present.",
      points: 1,
      sortOrder: 2,
    },
    {
      sectionId: section1!.id,
      questionLetter: "C",
      questionText: 'All items stored on racks 6" off the floor & 18" from sprinkler heads.',
      points: 1,
      sortOrder: 3,
    },
    {
      sectionId: section1!.id,
      questionLetter: "D",
      questionText: "Cans with dents on seams/edges, leaking, or bulging removed from general storage.",
      points: 1,
      sortOrder: 4,
    },
    {
      sectionId: section1!.id,
      questionLetter: "E",
      questionText: "Scoops are not stored in food storage bins.",
      points: 1,
      sortOrder: 5,
    },
    {
      sectionId: section1!.id,
      questionLetter: "F",
      questionText: "No evidence of insects/pests.",
      points: 1,
      sortOrder: 6,
    },
  ]);

  // Section #2: KITCHEN REFRIGERATORS (6 questions)
  const [section2] = await db
    .insert(schema.dietarySection)
    .values({
      templateId: highTempTemplate.id,
      sectionNumber: 2,
      title: "KITCHEN REFRIGERATORS",
      maxPoints: 6,
      sortOrder: 2,
    })
    .returning();

  await db.insert(schema.dietaryQuestion).values([
    {
      sectionId: section2!.id,
      questionLetter: "A",
      questionText: "All foods covered, labeled & dated and stored off floor. No expired product present.",
      points: 1,
      sortOrder: 1,
    },
    {
      sectionId: section2!.id,
      questionLetter: "B",
      questionText: "Thermometer visible (INSIDE UNIT). Refrigerator temperature 34-39 degrees F.",
      points: 1,
      sortOrder: 2,
    },
    {
      sectionId: section2!.id,
      questionLetter: "C",
      questionText: "Temperatures logged 2x daily and within acceptable ranges. CHECK Temperature Log.",
      points: 1,
      sortOrder: 3,
    },
    {
      sectionId: section2!.id,
      questionLetter: "D",
      questionText: "Raw food items stored below cooked food items (i.e., raw meats & eggs on bottom shelf) in tray sufficient to contain juices.",
      points: 1,
      sortOrder: 4,
    },
    {
      sectionId: section2!.id,
      questionLetter: "E",
      questionText: "Meats and other frozen items thawed in refrigerator and dated with date pulled from freezer.",
      points: 1,
      sortOrder: 5,
    },
    {
      sectionId: section2!.id,
      questionLetter: "F",
      questionText: "Cooling logs being used. Staff can explain cooling procedure.",
      points: 1,
      sortOrder: 6,
    },
  ]);

  // Section #3: KITCHEN FREEZERS (4 questions)
  const [section3] = await db
    .insert(schema.dietarySection)
    .values({
      templateId: highTempTemplate.id,
      sectionNumber: 3,
      title: "KITCHEN FREEZERS",
      maxPoints: 4,
      sortOrder: 3,
    })
    .returning();

  await db.insert(schema.dietaryQuestion).values([
    {
      sectionId: section3!.id,
      questionLetter: "A",
      questionText: "All foods covered, labeled & dated and stored on racks & off floor.",
      points: 1,
      sortOrder: 1,
    },
    {
      sectionId: section3!.id,
      questionLetter: "B",
      questionText: "Thermometer visible (INSIDE UNIT). Temperature 0 degrees F or below.",
      points: 1,
      sortOrder: 2,
    },
    {
      sectionId: section3!.id,
      questionLetter: "C",
      questionText: "All items labeled and dated.",
      points: 1,
      sortOrder: 3,
    },
    {
      sectionId: section3!.id,
      questionLetter: "D",
      questionText: "Temperatures logged daily and within acceptable ranges. CHECK Temperature Log.",
      points: 1,
      sortOrder: 4,
    },
  ]);

  // Section #4: KITCHENETTES (5 questions)
  const [section4] = await db
    .insert(schema.dietarySection)
    .values({
      templateId: highTempTemplate.id,
      sectionNumber: 4,
      title: "KITCHENETTES",
      maxPoints: 5,
      sortOrder: 4,
    })
    .returning();

  await db.insert(schema.dietaryQuestion).values([
    {
      sectionId: section4!.id,
      questionLetter: "A",
      questionText: "Thermometer visible (INSIDE UNIT). Refrigerator 34°- 39° Freezer temperatures 0° or lower. Temperatures logged 2x daily and within acceptable ranges. CHECK Temperature Log.",
      points: 1,
      sortOrder: 1,
    },
    {
      sectionId: section4!.id,
      questionLetter: "B",
      questionText: "All food is labeled and dated.",
      points: 1,
      sortOrder: 2,
    },
    {
      sectionId: section4!.id,
      questionLetter: "C",
      questionText: "No expired food found.",
      points: 1,
      sortOrder: 3,
    },
    {
      sectionId: section4!.id,
      questionLetter: "D",
      questionText: "No staff belongings found in the refrigerator, freezers, cupboards, or cabinets.",
      points: 1,
      sortOrder: 4,
    },
    {
      sectionId: section4!.id,
      questionLetter: "E",
      questionText: "Food from home and microwave policies posted.",
      points: 1,
      sortOrder: 5,
    },
  ]);

  // Section #5: POT WASHING AREA (3 questions)
  const [section5] = await db
    .insert(schema.dietarySection)
    .values({
      templateId: highTempTemplate.id,
      sectionNumber: 5,
      title: "POT WASHING AREA",
      maxPoints: 3,
      sortOrder: 5,
    })
    .returning();

  await db.insert(schema.dietaryQuestion).values([
    {
      sectionId: section5!.id,
      questionLetter: "A",
      questionText: "Pot-washing procedure posted and followed.",
      points: 1,
      sortOrder: 1,
    },
    {
      sectionId: section5!.id,
      questionLetter: "B",
      questionText: "Sanitizer is checked when water is changed or added to sink and is within range. CHECK that test strips are available for the type of sanitizer being used.",
      points: 1,
      sortOrder: 2,
    },
    {
      sectionId: section5!.id,
      questionLetter: "C",
      questionText: "All items clean (i.e., grease free, no carbon build-up) and completely air-dried (i.e., no moisture on any surface). CHECK pot and pan storage area – lift several pots and pans to check; check to see that pot storage rack is clean and free of dust & build up.",
      points: 1,
      sortOrder: 3,
    },
  ]);

  // Section #6: DISHWASHING AREA - High Temp (2 questions)
  const [section6] = await db
    .insert(schema.dietarySection)
    .values({
      templateId: highTempTemplate.id,
      sectionNumber: 6,
      title: "DISHWASHING AREA",
      maxPoints: 2,
      sortOrder: 6,
    })
    .returning();

  await db.insert(schema.dietaryQuestion).values([
    {
      sectionId: section6!.id,
      questionLetter: "A",
      questionText: "Dishwasher temperatures reach proper temperature for wash & rinse cycle per Manufacturers Recommendation (see face plate on machine). Temperatures taken and logged each meal.",
      points: 1,
      sortOrder: 1,
    },
    {
      sectionId: section6!.id,
      questionLetter: "C",
      questionText: "All items air dried and clean when stored. Storage units are clean. CHECK dish storage area – lift several cups, bowls, plates, etc. to check.",
      points: 1,
      sortOrder: 2,
    },
  ]);

  // Section #7: GENERAL SANITATION (5 questions)
  const [section7] = await db
    .insert(schema.dietarySection)
    .values({
      templateId: highTempTemplate.id,
      sectionNumber: 7,
      title: "GENERAL SANITATION",
      maxPoints: 5,
      sortOrder: 7,
    })
    .returning();

  await db.insert(schema.dietaryQuestion).values([
    {
      sectionId: section7!.id,
      questionLetter: "A",
      questionText: "All equipment cleaned & sanitized after use. CHECK slicer/mixer bowl/can opener/carts/food prep tables/ovens, etc.",
      points: 1,
      sortOrder: 1,
    },
    {
      sectionId: section7!.id,
      questionLetter: "B",
      questionText: "In general, kitchen is clean & free of dust/dirt accumulation, i.e. ceiling, shelving, floors, walls, hood.",
      points: 1,
      sortOrder: 2,
    },
    {
      sectionId: section7!.id,
      questionLetter: "C",
      questionText: "Cleaning schedules posted and assignments checked off as completed.",
      points: 1,
      sortOrder: 3,
    },
    {
      sectionId: section7!.id,
      questionLetter: "D",
      questionText: "Cloths & buckets with sanitizers available/used to sanitize food contact surfaces. PPM appropriate.",
      points: 1,
      sortOrder: 4,
    },
    {
      sectionId: section7!.id,
      questionLetter: "E",
      questionText: "Garbage cans are clean and covered; dumpsters are closed and area is free of clutter/trash.",
      points: 1,
      sortOrder: 5,
    },
  ]);

  // Section #8: MAINTENANCE (2 questions)
  const [section8] = await db
    .insert(schema.dietarySection)
    .values({
      templateId: highTempTemplate.id,
      sectionNumber: 8,
      title: "MAINTENANCE",
      maxPoints: 2,
      sortOrder: 8,
    })
    .returning();

  await db.insert(schema.dietaryQuestion).values([
    {
      sectionId: section8!.id,
      questionLetter: "A",
      questionText: "Floors, ceilings, walls in good repair (i.e., no cracks, holes or loose molding observed).",
      points: 1,
      sortOrder: 1,
    },
    {
      sectionId: section8!.id,
      questionLetter: "B",
      questionText: "All equipment in good working order.",
      points: 1,
      sortOrder: 2,
    },
  ]);

  // Section #9: DISASTER PREPAREDNESS (3 questions)
  const [section9] = await db
    .insert(schema.dietarySection)
    .values({
      templateId: highTempTemplate.id,
      sectionNumber: 9,
      title: "DISASTER PREPAREDNESS",
      maxPoints: 3,
      sortOrder: 9,
    })
    .returning();

  await db.insert(schema.dietaryQuestion).values([
    {
      sectionId: section9!.id,
      questionLetter: "A",
      questionText: "Staff aware of procedure if fire occurs under hood of stove.",
      points: 1,
      sortOrder: 1,
    },
    {
      sectionId: section9!.id,
      questionLetter: "B",
      questionText: "Staff aware of location of alarm boxes & fire extinguishers.",
      points: 1,
      sortOrder: 2,
    },
    {
      sectionId: section9!.id,
      questionLetter: "C",
      questionText: "Emergency stock of supplies/food/water available per emergency preparedness protocols.",
      points: 1,
      sortOrder: 3,
    },
  ]);

  // Section #10: PERSONNEL STANDARDS (5 questions)
  const [section10] = await db
    .insert(schema.dietarySection)
    .values({
      templateId: highTempTemplate.id,
      sectionNumber: 10,
      title: "PERSONNEL STANDARDS",
      maxPoints: 5,
      sortOrder: 10,
    })
    .returning();

  await db.insert(schema.dietaryQuestion).values([
    {
      sectionId: section10!.id,
      questionLetter: "A",
      questionText: "Hair effectively restrained with hair nets/hat/beard restraint.",
      points: 1,
      sortOrder: 1,
    },
    {
      sectionId: section10!.id,
      questionLetter: "B",
      questionText: "Proper hand hygiene observed during meal prep/tray line.",
      points: 1,
      sortOrder: 2,
    },
    {
      sectionId: section10!.id,
      questionLetter: "C",
      questionText: "Staff wash hands according to procedure; step-can is at the handwashing sink with towels & soap.",
      points: 1,
      sortOrder: 3,
    },
    {
      sectionId: section10!.id,
      questionLetter: "D",
      questionText: "Uniforms & aprons are clean & appropriate per Center policy.",
      points: 1,
      sortOrder: 4,
    },
    {
      sectionId: section10!.id,
      questionLetter: "E",
      questionText: "No personal items in the kitchen or store room.",
      points: 1,
      sortOrder: 5,
    },
  ]);

  // Section #11: FOOD PREP & SERVICE (3 questions)
  const [section11] = await db
    .insert(schema.dietarySection)
    .values({
      templateId: highTempTemplate.id,
      sectionNumber: 11,
      title: "FOOD PREP & SERVICE",
      maxPoints: 3,
      sortOrder: 11,
    })
    .returning();

  await db.insert(schema.dietaryQuestion).values([
    {
      sectionId: section11!.id,
      questionLetter: "A",
      questionText: "Appropriate food prepared according to recipes for all therapeutic diets.",
      points: 1,
      sortOrder: 1,
    },
    {
      sectionId: section11!.id,
      questionLetter: "B",
      questionText: "Appropriate portion sizes served according to therapeutic menu (i.e., spreadsheet).",
      points: 1,
      sortOrder: 2,
    },
    {
      sectionId: section11!.id,
      questionLetter: "C",
      questionText: "Temp of food checked prior to meal & recorded; appropriate action taken if temp is inappropriate.",
      points: 1,
      sortOrder: 3,
    },
  ]);

  // Section #12: Inspections & Cleanings (3 questions)
  const [section12] = await db
    .insert(schema.dietarySection)
    .values({
      templateId: highTempTemplate.id,
      sectionNumber: 12,
      title: "Inspections & Cleanings",
      maxPoints: 3,
      sortOrder: 12,
    })
    .returning();

  await db.insert(schema.dietaryQuestion).values([
    {
      sectionId: section12!.id,
      questionLetter: "A",
      questionText: "Exhaust hood inspection is in compliance.",
      points: 1,
      sortOrder: 1,
    },
    {
      sectionId: section12!.id,
      questionLetter: "B",
      questionText: "Ice machine cleaning up to date.",
      points: 1,
      sortOrder: 2,
    },
    {
      sectionId: section12!.id,
      questionLetter: "C",
      questionText: "Grease trap log up to date.",
      points: 1,
      sortOrder: 3,
    },
  ]);

  // Section #13: Additional Focus Points (4 questions)
  const [section13] = await db
    .insert(schema.dietarySection)
    .values({
      templateId: highTempTemplate.id,
      sectionNumber: 13,
      title: "Additional Focus Points",
      maxPoints: 4,
      sortOrder: 13,
    })
    .returning();

  await db.insert(schema.dietaryQuestion).values([
    {
      sectionId: section13!.id,
      questionLetter: "A",
      questionText: "F-Tag 806 Resident Allergies/Preferences/Substitutes\nTray accuracy audit (Preferences/Allergies)- This will ensure residents will not receive foods that they dislike or have an intolerance to.",
      points: 1,
      sortOrder: 1,
    },
    {
      sectionId: section13!.id,
      questionLetter: "B",
      questionText: "F-Tag 807 Drinks Available to Meet Resident Needs\nThickened drinks available in kitchenette if applicable. If a unit doesn't have any thickened residents on it then no thickened juice would be needed to be kept there.",
      points: 1,
      sortOrder: 2,
    },
    {
      sectionId: section13!.id,
      questionLetter: "C",
      questionText: "F-Tag 809 Frequency of Meals/Snacks at Bedtime\nResident summary list (in Nutrition Management Reports) posted in designated area/kitchenette r/t snacks/drinks available for all textures/restrictions per MD Diet Orders.",
      points: 1,
      sortOrder: 3,
    },
    {
      sectionId: section13!.id,
      questionLetter: "D",
      questionText: "F-Tag 813 Personal Food Policy\nFood from home/Microwave policies posted. T-Sticks (165 F) available.",
      points: 1,
      sortOrder: 4,
    },
  ]);

  console.log("✅ HIGH TEMP: 13 sections, 51 total points");

  // ==================== LOW TEMP MACHINE TEMPLATE ====================
  const [lowTempTemplate] = await db
    .insert(schema.dietaryTemplate)
    .values({
      name: "Low Temp Machine",
      machineType: "low_temp",
      description: "Dietary audit template for facilities using low temperature dishwashing machines",
      organizationId: orgId,
      isActive: true,
    })
    .onConflictDoNothing()
    .returning();

  if (!lowTempTemplate) {
    console.log("✅ Both templates already exist");
    await conn.end();
    return;
  }

  console.log(`✅ Created template: ${lowTempTemplate.name}`);

  // Copy sections 1-5 from High Temp (same for both)
  for (let i = 1; i <= 5; i++) {
    const sourceSection = [section1, section2, section3, section4, section5][i - 1];
    const [newSection] = await db
      .insert(schema.dietarySection)
      .values({
        templateId: lowTempTemplate.id,
        sectionNumber: sourceSection!.sectionNumber,
        title: sourceSection!.title,
        maxPoints: sourceSection!.maxPoints,
        sortOrder: sourceSection!.sortOrder,
      })
      .returning();
    const questions = await db
      .select()
      .from(schema.dietaryQuestion)
      .where(sql`${schema.dietaryQuestion.sectionId} = ${sourceSection!.id}`);

    for (const q of questions) {
      await db.insert(schema.dietaryQuestion).values({
        sectionId: newSection!.id,
        questionLetter: q.questionLetter,
        questionText: q.questionText,
        points: q.points,
        sortOrder: q.sortOrder,
      });
    }
  }

  // Section #6 for LOW TEMP: DISHWASHING AREA (3 questions)
  const [lowSection6] = await db
    .insert(schema.dietarySection)
    .values({
      templateId: lowTempTemplate.id,
      sectionNumber: 6,
      title: "DISHWASHING AREA",
      maxPoints: 3,
      sortOrder: 6,
    })
    .returning();

  await db.insert(schema.dietaryQuestion).values([
    {
      sectionId: lowSection6!.id,
      questionLetter: "A",
      questionText: "Dishwasher temperatures reach proper temperature for wash & rinse cycle per Manufacturers Recommendation (see face plate on machine). Temperatures taken and logged each meal.",
      points: 1,
      sortOrder: 1,
    },
    {
      sectionId: lowSection6!.id,
      questionLetter: "B",
      questionText: "If low temperature dish machine: sanitizer checked and logged each meal-proper PPM range.",
      points: 1,
      sortOrder: 2,
    },
    {
      sectionId: lowSection6!.id,
      questionLetter: "C",
      questionText: "All items air dried and clean when stored. Storage units are clean. CHECK dish storage area – lift several cups, bowls, plates, etc. to check.",
      points: 1,
      sortOrder: 3,
    },
  ]);

  // Copy sections 7-13 from High Temp
  for (let i = 7; i <= 13; i++) {
    const sourceSection = [section7, section8, section9, section10, section11, section12, section13][i - 7];
    const [newSection] = await db
      .insert(schema.dietarySection)
      .values({
        templateId: lowTempTemplate.id,
        sectionNumber: sourceSection!.sectionNumber,
        title: sourceSection!.title,
        maxPoints: sourceSection!.maxPoints,
        sortOrder: sourceSection!.sortOrder,
      })
      .returning();

    const questions = await db
      .select()
      .from(schema.dietaryQuestion)
      .where(sql`${schema.dietaryQuestion.sectionId} = ${sourceSection!.id}`);
    for (const q of questions) {
      await db.insert(schema.dietaryQuestion).values({
        sectionId: newSection!.id,
        questionLetter: q.questionLetter,
        questionText: q.questionText,
        points: q.points,
        sortOrder: q.sortOrder,
      });
    }
  }

  console.log("✅ LOW TEMP: 13 sections, 52 total points");
  console.log("🎉 All dietary templates seeded successfully!");

  await conn.end();
}

main().catch((err) => {
  console.error("❌ Seeding failed:", err);
  process.exit(1);
});
