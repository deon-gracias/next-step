// src/qal_seed.ts
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { sql } from "drizzle-orm";

const HARDCODED_DB_URL =
  "postgresql://postgres:Rahul@2025@db.odjkzowqixaqpesalenl.supabase.co:5432/postgres";

const db = drizzle(postgres(HARDCODED_DB_URL, { max: 1, prepare: false }));

import { qalTemplate, qalSection, qalQuestion } from "@/server/db/schema";

// EXACT DATA FROM EXCEL - West Newton RCO QAL Audit.xlsx
const AUDIT_STRUCTURE = [
  {
    title: "Admissions",
    possiblePoints: 35,
    description: "Admission documentation and compliance audit",
    items: [
      { prompt: "Test the last 3 Admission Files (aged 5 days or longer) and verify Admission Agreements are populated in Document Manager.", guidance: "* Run the Action Summary Report in PCC to find the last 3 admissions that are aged 5 days or longer--giving enough time for Document Manager completion.\n* A follow up audit is required upon the QAL's next site visit if admission audit results are below the established target. (The NHA and Admissions Staff are responsible for completing a plan of correction based on audit results.)", fixedSample: 0, possiblePoints: 10 },
      { prompt: "Review hard copy 72 Hour Meeting worksheet for both primary and secondary coverage completion (use the same sample as above).", guidance: "Using the same sample as #1 above, review copy of worksheet is uploaded to Misc Tab to ensure completion.", fixedSample: 0, possiblePoints: 5 },
      { prompt: "Test the last 3 admission files to ensure facility is documenting the 72 Hour Meetings in the collections module.", guidance: "Using the same sample as #1 above, review the collection module notation under primary payer to view the 72 hr meeting note, and ensure all items on the worksheet were reviewed and notated.", fixedSample: 0, possiblePoints: 10 },
      { prompt: "Test the last 3 admission files to verify the hard copy Medicaid Preliminary Questionnaire was started/completed, if applicable due to 72 Hour Meeting worksheet responses (i.e. no secondary insurance for Medicare resident, long term payer source needed, etc.).", guidance: "Using the same sample as #1 above, ensure copy of Medicaid Preliminary Questionnaire is uploaded to Misc Tab, fully completed and no red flag barriers are left unaddressed.", fixedSample: 0, possiblePoints: 10 },
      { prompt: "Verify PPA Worksheet is completed (if applicable) with income information and uploaded to the MISC tab (use the same sample as above).", guidance: "Using the same sample as #1 above, review copy of worksheet is uploaded to Misc Tab to ensure completion.", fixedSample: 0, possiblePoints: 10 },
      { prompt: "Test 3 admissions from previous month with secondary coverage to ensure that Business Office or Designee is verifying secondary insurance coverage (and any payer not verified through CRM/Central) on all admissions.", guidance: "Review the AR Ins tab and collections module completed by the Business Office or Designee.", fixedSample: 0, possiblePoints: 5 },
    ],
  },
  {
    title: "Census",
    possiblePoints: 40,
    description: "Census accuracy and maintenance",
    items: [
      { prompt: "Test 4 days Run Action Summary Report and select 4 dates.", guidance: "*Was the Midnight census reconciled no later than 10am following the next business day?\n*Was the resident profile tab completed accurately to include responsible party and proper labeling of legal responsible party?\n*Are all the resident identifiers including SSN accurately entered to the identifier tab?", fixedSample: 0, possiblePoints: 15 },
      { prompt: "Insurance Sequencing/Level/Rate Accuracy. Test the last 5 admissions/payer changes, comparing the Eval tab, AR ins tab and any hard copy documents in the MISC tab to verify:", guidance: "* Was the insurance sequencing entered without error to include all Primary, Secondary and Tertiary Payer Sources?\n* Was coinsurance entered per the tools as above?\n* Is the Level & Rate Accurately booked per the tools above?\n*Was the AR ins tab updated to include current Auth, and Next Auth Due?\n* Was an Open Activity set to the collection module for follow up on any authorization expiration dates?", fixedSample: 0, possiblePoints: 15 },
      { prompt: "DORADO (Sample 2 months): Is there evidence to suggest the Eligibility section on the Dashboard is being used to verify insurance eligibility and reviewed for termed insurances biweekly or at a minimum every 30 days during pre-month end?", guidance: "Review Dashboard Eligibility section for evidence of regular use and insurance verification.", fixedSample: 0, possiblePoints: 10 },
    ],
  },
  {
    title: "Billing and Collections-Private",
    possiblePoints: 75,
    description: "Private pay billing and collections audit",
    items: [
      { prompt: "Validate that facility is mailing Medicaid Pending statements monthly.", guidance: "Review copies of Medicaid Pending Statements for last two months are on file. Ask for Designee to detail/demonstrate how they run the statements, attach labels, etc. to ensure process is being followed.", fixedSample: 0, possiblePoints: 15 },
      { prompt: "Test 3 outstanding private accounts over 30 days.", guidance: "Ensure that facility is making the minimum of two collection attempts and documenting in the collections module including escalation steps to NHA. Go to Collections module, sort for Private, and further sort by highest dollar amounts. Hit the plus sign under each resident to read notation detail--search top 3 over 30 days.", fixedSample: 0, possiblePoints: 15 },
      { prompt: "Test 3 outstanding private accounts over 90 days.", guidance: "Ensure that private collections timeline is being followed to ensure proper escalation through QAL, VPRCO, etc. (as applicable) through write offs. Go to Collections module, sort for Private, and further sort by highest dollar amounts. Hit the plus sign under each resident to read notation detail--search top 3 over 90 days.", fixedSample: 0, possiblePoints: 15 },
      { prompt: "Test the last 3 cuts to private/private pay admissions to ensure Private advance payments were solicited, documented, and collections process was initiated on payer changes to private and/or private admissions.", guidance: "Verify that facility is collecting Private advance payments (where applicable), creating hard bills, and setting follow up activities until resolution. Run Action Summary Report for payer change and admission type activities to locate the sample of 3.", fixedSample: 0, possiblePoints: 15 },
      { prompt: "Validate credit card processing through Waystar (if applicable).", guidance: "*Review last credit card payment posted--was posted to cash in PCC.\n*Is facility requesting credit card payments/indicating that this is a payment option?", fixedSample: 0, possiblePoints: 10 },
      { prompt: "Test that facility is following Discharge Billing Policy/procedure. Check the last 5 discharges. Comment if facility has a \"team approach\" in place to ensure family/resident is meeting with BOM upon discharge.", guidance: "Is BOM meeting with family, securing payment or payment plan, documenting the contact in the PCC collections module, and mailing a hard copy bill if discharge was unplanned?", fixedSample: 0, possiblePoints: 15 },
      { prompt: "Verify that facility is following the High Risk Financial Process relating to residents/former residents that owe more than $2,000.", guidance: "Ensure that when facility identifies a financial high risk issue that they are proceeding with the red flag process by alerting the QALs.", fixedSample: 0, possiblePoints: 15 },
    ],
  },
  {
    title: "Medicaid/SCO/Medicaid Pending",
    possiblePoints: 50,
    description: "Medicaid and SCO compliance audit",
    items: [
      { prompt: "Test the last 3 Medicaid/SCO/Pending admissions or payer changes to Medicaid/SCO/Pending to ensure they were vetted prior to admission.", guidance: "Review CRM and MISC tab to ensure resident was vetted prior to admission. If resident was not vetted prior to admission, did BOM initiate vetting process?", fixedSample: 0, possiblePoints: 10 },
      { prompt: "Test the last 3 Medicaid/SCO/Pending admissions to ensure a Medicaid Questionnaire and PPA worksheet were completed and uploaded to the MISC tab.", guidance: "Using the same sample as above, ensure an accurate PPA is booked in census, using the uploaded PPA worksheet. If income is unknown at the time, ensure the generic $1k is being utilized. If $0 PPA is booked in census, ensure there is a PPA worksheet that confirms a $0 PPA is calculated.", fixedSample: 0, possiblePoints: 10 },
      { prompt: "Test 3 Pending residents to ensure Medicaid Referral and Medicaid Questionnaire are uploaded to the MISC tab and an OA is set to the Medicaid Specialist (if applicable) or SC-1 and LOC have been submitted/requested for coding.", guidance: "Verify documentation uploads and Open Activities are properly set.", fixedSample: 0, possiblePoints: 10 },
      { prompt: "Test 3 Pending residents to ensure any identified financial barriers have been escalated using the escalation tool.", guidance: "Using the sample above test residents to ensure any barriers to being approved for Mass Health have been escalated per escalation tool, such as Barriers to Mass Health triggering on Medicaid Questionnaire, unpaid PPA, Rep Payee being filed timely or denied, etc.", fixedSample: 0, possiblePoints: 15 },
      { prompt: "Test 5 Pending residents to ensure an Open Activity (OA) is set in the Collection Module (CM) monitoring the short term Level of Care Screens, until resident discharges and a long term Level of Care Screen is received.", guidance: "*Using the sample above, test residents to ensure an OA is entered into the Collection Module stating what type of Level of Care Screen has been received, and if it is short term, an OA is set to ensure the next Screen is requested timely, until discharge or a LTC Screen is received.\n*Ensure LOC Screens are uploaded to MISC tab.", fixedSample: 0, possiblePoints: 5 },
    ],
  },
  {
    title: "AR Other",
    possiblePoints: 20,
    description: "Other accounts receivable management",
    items: [
      { prompt: "Test 5 Open Activities set to the Facility Designee to ensure they are being addressed in a timely fashion, and set according to best practices.", guidance: "*Go to the Collections module, Upcoming Activities, then sort by Facility Designee name. Are the top 5 OAs past due by more than 3 days?", fixedSample: 0, possiblePoints: 10 },
      { prompt: "Test Open Activities addressed to Billers/Medicaid Specialist to ensure they are accurately set.", guidance: "*Go to Collections Module, Upcoming Activities, then sort by Biller name or Medicaid Specialist name. Are OAs first set to BOM name, initialed, and closed. Then copied and reset in an Open Activity for the Biller/Medicaid Specialist, to ensure OAs are addressed in a timely fashion.", fixedSample: 0, possiblePoints: 10 },
    ],
  },
  {
    title: "Managed Care/Insurance",
    possiblePoints: 30,
    description: "Managed care and insurance billing audit",
    items: [
      { prompt: "Test the last 3 Managed Care admissions to ensure that all items were reviewed from CRM and Evaluations Tab.", guidance: "Review Managed Care verification in CRM/Evaluations tab to ensure correct rate is set in census.", fixedSample: 0, possiblePoints: 10 },
      { prompt: "Verify that payer sequence is setup to properly to bill resource, copays, etc. (as applicable).", guidance: "*Using same sample as #1 above, review payer sequence and copay/deductible amounts booked.\n*Review Payer setup to ensure Authorizations numbers are listed correctly in the AR Insurance tab.", fixedSample: 0, possiblePoints: 10 },
      { prompt: "Verify collection module use and notation by ensuring Collection Module notes are entered regarding the authorization through dates, and OAs are set to ensure upcoming authorizations are received timely.", guidance: "Using same sample as #1 above, review collections module for appropriate documentation and ensure upcoming Authorization OAs are set appropriately.", fixedSample: 0, possiblePoints: 10 },
    ],
  },
  {
    title: "MISC Tab PCC",
    possiblePoints: 10,
    description: "PCC MISC tab documentation audit",
    items: [
      { prompt: "Test 5 in-house residents MISC tab, to ensure the correct documents are uploaded to the MISC tab, meeting HIPPA guidelines.", guidance: "*Run a daily census and pick 5 residents at random. Review the MISC tab of each resident to ensure all documents listed on the Financial Document Upload Guide are uploaded, if applicable. Due to HIPPA compliance ensure Banking, Mass Health applications, and other personal documentation not listed on the Upload Guide are NOT uploaded to the MISC tab.\n*Review Resident Profile for legal appointments, and ensure these documents are also uploaded to the MISC tab.", fixedSample: 0, possiblePoints: 10 },
    ],
  },
  {
    title: "Cash Handling/Posting",
    possiblePoints: 0,
    description: "Cash handling and posting procedures",
    items: [
      { prompt: "For NS2 building - Review 2 deposits within the last 2 months to ensure proper handling of payments.", guidance: "Review facility copies of deposits to ensure process is being followed.\n*Test that deposits are being processed through FTNI and are entered timely with a copy retained at the facility for verification.\n*Are cash batches being posted in PCC timely, once they appear on the bank stmt provided by QAL.", fixedSample: 0, possiblePoints: 20 },
      { prompt: "For NS2 facility, verify current month commercial cash log, PCC deposits and bank statements tie out to one another.", guidance: "*Compare the current month commercial cash log and PCC commercial deposits tie out to one another.\n*Compare the current commercial cash log and bank statement through the same date tie out to one another.", fixedSample: 0, possiblePoints: 20 },
      { prompt: "For NS2 facility, verify current month government cash log, PCC deposits and bank statements tie out to one another.", guidance: "*Compare the current month government cash log and PCC commercial deposits tie out to one another.\n*Compare the current government cash log and bank statement through the same date tie out to one another.", fixedSample: 0, possiblePoints: 20 },
      { prompt: "Choose 3 residents from a Medicaid remit and ensure cash posting is accurate.", guidance: "* Choose a Medicaid remit from the current month with at least 3+ residents listed on it.\n*Choose 3 residents and verify the payment on the remit, date listed on the remit, match the payment posted in PCC and is posted to the correct payer.", fixedSample: 0, possiblePoints: 20 },
    ],
  },
  {
    title: "Accounts Payable Ancillaries",
    possiblePoints: 20,
    description: "Ancillary services AP audit",
    items: [
      { prompt: "Verify that Private Refunds are processed within 30 days.", guidance: "Run private aging (select credits only) and validate 5 credits over 30 days on discharged residents. Refunds must be resolved within 30 days or have collections module notation indicating why the credit is being held longer. (There should be an open note to follow up.)", fixedSample: 0, possiblePoints: 10 },
      { prompt: "Consolidated Billing - are any ancillary batches entered for previous and last month? Ask BOM to provide any consolidated bills sent to DSSI.", guidance: "Review consolidated billing submissions.", fixedSample: 0, possiblePoints: 0 },
      { prompt: "Test last 2 months of Rehab invoices, to ensure they are accurate and entered timely.", guidance: "*Review the last 2 months of Rehab invoices, and ensure they are entered accurately to DSSI by the 10th of the month and batch totals tie out.", fixedSample: 0, possiblePoints: 5 },
      { prompt: "Test last 2 months of Pharmacy billing, to ensure they are accurately entered into DSSI, and posted into PCC.", guidance: "*Review the last 2 months of Pharmacy invoices, and ensure they are completed and posted in PCC (prior to Month End Close) and DSSI (by the 10th of the month).", fixedSample: 0, possiblePoints: 5 },
    ],
  },
  {
    title: "Resident Trust Fund",
    possiblePoints: 110,
    description: "Resident trust fund compliance and reconciliation",
    items: [
      { prompt: "Ensure that resident's have a complete, signed & dated RFMS Authorization Form using a current trial balance report--sample 5 residents.", guidance: "Sample the group to ensure the date on the form is either on or before the date RTF account was opened. Original auth should always be retained in binder along with any updates, and uploaded to RFMS.\nRun RFMS Trial Balance Report and select 5 current residents to test.\nReview RTF authorizations (Authorization and Agreement to Handle Resident Funds) and perform the following:\n1. Verify each resident has an authorization on file.\n2. Verify authorization form contains appropriate signatures by resident or resident's representative. [Check the signer on the \"Authorization and Agreement to Handle Resident Funds\" and compare it to the legal document that grants the signer the authority (e.g. Rep Payee, COE, POA, etc.)]\n3. Review the authorizations for date on form versus date account opened. Account cannot be opened prior to signature date.", fixedSample: 0, possiblePoints: 20 },
      { prompt: "Review 1 month of Resident Trust Fund activity to ensure it is posted daily (weekdays).", guidance: "Review daily posting to RFMS Online. Validate dates on cash receipts against RFMS withdrawal reports from the withdrawal packet/documentation to verify that facilities are posting/withdrawing RFMS activity daily.", fixedSample: 0, possiblePoints: 10 },
      { prompt: "Count cash box, after hours cash, and unprocessed receipts to verify balance is accurate.", guidance: "Count down/balance resident cash box. Resident Cash Box Count tab included (in audit document) to aid in balance/counting cash box.", fixedSample: 0, possiblePoints: 10 },
      { prompt: "Test current trial balance to ensure that all discharged resident accounts have been closed timely [within state defined time period, or within 30 days (policy), whichever is sooner].", guidance: "Compare RFMS Trial Balance to the PCC current month census to validate the RFMS system has the appropriate discharge status (i.e. Closed or Frozen) so that the Direct Deposit will not hit. \"Close\" always stops a direct deposit. \"Freezing an account\" can, but does not always stop a direct deposit and requires review.", fixedSample: 0, possiblePoints: 10 },
      { prompt: "Test 3 discharged/deceased residents to ensure the refund/estate checks were written according to policy or within state defined time period, whichever is sooner.", guidance: "*Verify the discharged patient's trust account is zero and that the refund check has been written and posted to the trust check register.\n*BOM follows the State Guidelines (contact QAL for additional assistance as needed) to determine whether the balance in the RTF Resident Account is an Estate recovery to Medicaid. If the balance is to be sent to the state, verify that the BOM wrote a refund check from RFMS Petty Cash or followed state's applicable process.", fixedSample: 0, possiblePoints: 15 },
      { prompt: "Test that the prior month's $200 letters in RFMS were sent to residents within $200 of the state's asset level for Medicaid eligibility.", guidance: "Review trial balance in RFMS (set to 30 days prior) for accounts that are within $200 of state limit for assets. Review letters that have been issued to the resident and ensure the follow-up is documented regarding need to spend down the account balance. Test that copy of spend down letter is present in resident file.", fixedSample: 0, possiblePoints: 10 },
      { prompt: "Verify that the surety bond is uploaded into RFMS and that is adequate to cover the total funds listed in the trial balance run for today?", guidance: "Review surety bond documentation.", fixedSample: 0, possiblePoints: 15 },
      { prompt: "Test one full sample of Resident Trust Fund Quarterly Statements to ensure federal process was followed.", guidance: "Review address of any statements without acknowledgment letter to ensure that the address is not the facility address or an employee address.\n\nCompetent Residents:\n* Verify the competent patients have signed and dated the copy of the statement.\n   OR\n* For statements sent to the appropriate Responsible Party, confirm an Acknowledgement letter and return signature page was included with the quarterly statements.\n* For Acknowledgement letters not returned within three weeks, minimally ensure that \"Not Returned\" was noted on the copy of the letter, dated, and returned to the patient's RFMS file.\n\nNot Competent Residents:\n* For patients deemed not competent, determine if the quarterly statement was mailed to the appropriate Responsible Party.\n* Confirm that an Acknowledgement letter and return signature page was included with the quarterly statements.\n* For Acknowledgement letters not returned within three weeks, minimally ensure that \"Not Returned\" was noted on the copy of the letter, dated, and returned to the patient's RFMS file.", fixedSample: 0, possiblePoints: 15 },
      // { prompt: "Review blank check inventory and initial/date the first blank check reviewed to document the audit.", guidance: "Review resident petty cash check inventory to ensure the checks are being kept in a secured location and that there are no discrepancies in the pre-numbered checks on file.", fixedSample: 0, possiblePoints: 10 },
      { prompt: "Verify that the after hours cash process is in place at facility.", guidance: "Review after hours cash log to validate that this process is in place at the facility.", fixedSample: 0, possiblePoints: 10 },
    ],
  },
];

export async function seedQALDeterministic() {
  console.log("Starting QAL seed...");

  await db.execute(sql`UPDATE "qal_template" SET "is_active" = false WHERE "is_active" = true;`);
  console.log("Inactivated existing templates");

  const [tpl] = await db.insert(qalTemplate).values({
    name: "RCO QAL Audit 2025",
    meta: "Regional Compliance Officer Quality Assurance Level audit - West Newton",
    isActive: true,
  }).returning();

  if (!tpl) throw new Error("Failed to create template");
  console.log(`Created template: ${tpl.name} (ID: ${tpl.id})`);

  for (let i = 0; i < AUDIT_STRUCTURE.length; i++) {
    const sectionDef = AUDIT_STRUCTURE[i];
    if (!sectionDef) continue;

    const [section] = await db.insert(qalSection).values({
      templateId: tpl.id,
      title: sectionDef.title,
      description: sectionDef.description,
      possiblePoints: sectionDef.possiblePoints,
      sortOrder: i + 1,
    }).returning();

    if (!section) {
      console.error(`Failed to create section: ${sectionDef.title}`);
      continue;
    }

    const totalSample = sectionDef.items.reduce((sum, item) => sum + item.fixedSample, 0);
    console.log(`  Created section: ${section.title} (${sectionDef.items.length} items, ${section.possiblePoints} pts, ${totalSample} samples)`);

    const questionValues = sectionDef.items.map((item, idx) => ({
      sectionId: section.id,
      prompt: item.prompt,
      guidance: item.guidance,
      fixedSample: item.fixedSample,
      possiblePoints: item.possiblePoints.toString(), // EXACT from Excel
      sortOrder: idx + 1,
    }));

    if (questionValues.length > 0) {
      await db.insert(qalQuestion).values(questionValues);
      console.log(`    Inserted ${questionValues.length} questions`);
    }
  }

  const totalSections = AUDIT_STRUCTURE.length;
  const totalQuestions = AUDIT_STRUCTURE.reduce((sum, s) => sum + s.items.length, 0);
  const totalPoints = AUDIT_STRUCTURE.reduce((sum, s) => sum + s.possiblePoints, 0);

  console.log("\n✅ QAL seed complete!");
  console.log(`   Template ID: ${tpl.id}`);
  console.log(`   Sections: ${totalSections}`);
  console.log(`   Questions: ${totalQuestions}`);
  console.log(`   Total Possible Points: ${totalPoints}`);
}

const isDirectRun =
  typeof process !== "undefined" &&
  Array.isArray(process.argv) &&
  (process.argv[1]?.endsWith("qal_seed.ts") || process.argv[1]?.endsWith("qal_seed.js"));

if (isDirectRun) {
  seedQALDeterministic()
    .then(() => {
      console.log("\n🎉 Seeding completed successfully");
      process.exit(0);
    })
    .catch((err) => {
      console.error("\n❌ Seeding failed:");
      console.error(err);
      process.exit(1);
    });
}
