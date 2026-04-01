import { NextResponse } from "next/server";
import { getProviderAndKey, generateAiResponse, formatAiError } from "@/lib/ai-client";
import { getDb } from "@/lib/db";

type Row = Record<string, unknown>;

export async function POST(request: Request) {
  const startTime = Date.now();
  const { provider, key } = getProviderAndKey(request);
  const body = await request.json();
  const { patient_id, plan_type } = body as { patient_id: string; plan_type: "current" | "discharge" };

  if (!patient_id) return NextResponse.json({ success: false, data: null, error: { code: "INVALID_INPUT", message: "patient_id required" }, meta: {} }, { status: 400 });

  const db = getDb();
  const patient = db.prepare("SELECT * FROM patients WHERE id = ?").get(patient_id) as Row | undefined;
  if (!patient) return NextResponse.json({ success: false, data: null, error: { code: "NOT_FOUND", message: "Patient not found" }, meta: {} }, { status: 404 });

  const admission = db.prepare("SELECT * FROM admissions WHERE patient_id = ? AND status = 'admitted'").get(patient_id) as Row | undefined;
  const meds = db.prepare("SELECT pm.*, d.name as drug_name, d.drug_class FROM patient_medications pm JOIN drugs d ON d.id = pm.drug_id WHERE pm.patient_id = ? AND pm.status = 'active'").all(patient_id) as Row[];
  const conditions = db.prepare("SELECT c.name, c.category, pc.severity FROM patient_conditions pc JOIN conditions c ON c.id = pc.condition_id WHERE pc.patient_id = ?").all(patient_id) as Row[];
  const allergies = db.prepare("SELECT allergen, reaction, severity FROM allergies WHERE patient_id = ?").all(patient_id) as Row[];
  const vitals = db.prepare("SELECT * FROM vital_signs WHERE patient_id = ? ORDER BY recorded_at DESC LIMIT 5").all(patient_id) as Row[];
  const labs = db.prepare("SELECT test_name, value, unit, reference_low, reference_high, status FROM lab_results WHERE patient_id = ? ORDER BY resulted_at DESC LIMIT 15").all(patient_id) as Row[];
  const genotypes = db.prepare("SELECT gv.gene, gv.variant, gv.type FROM patient_genotypes pg JOIN gene_variants gv ON gv.id = pg.gene_variant_id WHERE pg.patient_id = ?").all(patient_id) as Row[];
  const notes = db.prepare("SELECT author, note_type, content, created_at FROM nurse_notes WHERE patient_id = ? ORDER BY created_at DESC LIMIT 5").all(patient_id) as Row[];

  const context = `
========================================
PATIENT PROFILE
========================================
Name: ${patient.name}
Age: ${patient.age} years old | Sex: ${patient.sex} | Blood Group: ${patient.blood_group}
Date of Birth: ${patient.date_of_birth ?? "N/A"}

========================================
ADMISSION DETAILS
========================================
Admission Date: ${admission?.admission_date ?? "N/A"}
Reason for Admission: ${admission?.reason ?? "N/A"}
Primary Diagnosis: ${admission?.diagnosis ?? "N/A"}
Clinical Notes: ${admission?.notes ?? "None"}

========================================
ALLERGIES (CRITICAL - DO NOT RECOMMEND THESE)
========================================
${allergies.length > 0 ? allergies.map((a) => `- ${a.allergen}: Reaction=${a.reaction}, Severity=${a.severity}`).join("\n") : "No Known Drug Allergies (NKDA)"}

========================================
ACTIVE CONDITIONS
========================================
${conditions.map((c) => `- ${c.name} (${c.category}) — Severity: ${c.severity}`).join("\n") || "None documented"}

========================================
PHARMACOGENOMICS (GENETIC FACTORS)
========================================
${genotypes.length > 0 ? genotypes.map((g) => `- ${g.gene} ${g.variant}: ${String(g.type).replace("_", " ")} — affects drug metabolism`).join("\n") : "No genetic testing performed"}

========================================
CURRENT MEDICATIONS (${meds.length} active)
========================================
${meds.map((m) => `- ${m.drug_name} ${m.dose} — ${m.frequency} via ${m.route} (Class: ${m.drug_class})${m.instructions ? `\n  Instructions: ${m.instructions}` : ""}`).join("\n") || "No active medications"}

========================================
VITAL SIGNS (Most Recent First)
========================================
${vitals.map((v) => `[${v.recorded_at}] by ${v.recorded_by}
  Heart Rate: ${v.heart_rate} bpm | Blood Pressure: ${v.blood_pressure_sys}/${v.blood_pressure_dia} mmHg
  SpO2: ${v.spo2}% | Respiratory Rate: ${v.respiratory_rate}/min
  Temperature: ${v.temperature}°F | Blood Sugar: ${v.blood_sugar} mg/dL
  Pain Level: ${v.pain_level}/10 | Weight: ${v.weight} kg
  Notes: ${v.notes ?? "None"}`).join("\n\n") || "No vitals recorded"}

========================================
LAB RESULTS
========================================
${labs.map((l) => `- ${l.test_name}: ${l.value} ${l.unit} (Reference: ${l.reference_low}-${l.reference_high}) [${String(l.status).toUpperCase()}]`).join("\n") || "No lab results"}

========================================
RECENT NURSE NOTES
========================================
${notes.map((n) => `[${n.created_at}] ${n.author} (${n.note_type}): ${n.content}`).join("\n") || "No notes"}
`;

  if (!provider || !key) {
    return NextResponse.json({
      success: true,
      data: { plan: buildRuleBasedPlan(patient, conditions, meds, allergies, vitals, labs, plan_type), ai_model: "rule-based", plan_type },
      error: null, meta: { ai_powered: false, query_time_ms: Date.now() - startTime },
    });
  }

  try {
    const systemPrompt = plan_type === "discharge"
      ? `You are an experienced clinical AI physician assistant generating a DISCHARGE CARE PLAN. You must create a thorough, patient-friendly document. IMPORTANT RULES:
- Reference ACTUAL patient data (vitals numbers, lab values, medication names and doses)
- NEVER suggest anything the patient is allergic to
- Consider their pharmacogenomics when discussing medications
- Use warm, caring but medically accurate language
- Be SPECIFIC — not generic advice. Reference THIS patient's conditions.

Structure your response with these EXACT sections using ## headers:

## Discharge Summary
What happened during this hospital stay, why they were admitted, what was done.

## Current Vital Signs at Discharge
List their latest vitals with whether each is normal or needs monitoring.

## Medications to Continue at Home
For EACH medication: name, dose, when to take it, what it's for (in simple terms), and any food/drug interactions to avoid.

## Warning Signs — Return to Hospital Immediately If:
Specific symptoms for THIS patient's conditions that need emergency care.

## Home Care Instructions
Daily care routine specific to their conditions. Be very specific and practical.

## Home Remedies & Natural Supportive Care
Evidence-based home remedies for each condition (specific teas, foods, exercises, breathing techniques, sleep positions, etc.). Make these practical and specific.

## Diet Plan
Specific foods to eat and avoid for each condition. Include meal timing if relevant (e.g., for diabetes).

## Exercise & Activity Guidelines
What they can do, what to avoid, how to gradually increase activity.

## Follow-Up Schedule
Which doctor to see, when, what tests to get before the appointment.

## Instructions for Family & Caregivers
What to watch for, how to help, emergency contacts.

CRITICAL RULES: Write each section ONCE — never repeat information. Keep each section 3-8 bullet points. Complete ALL sections. Do not stop mid-section.`

      : `You are an experienced clinical AI generating a CURRENT CARE PLAN for a hospitalized patient. You must reference the ACTUAL patient data — real vital sign numbers, real lab values, real medications. IMPORTANT: be specific to THIS patient, not generic.

Structure your response with these EXACT sections using ## headers:

## Current Status Assessment
Where does this patient stand RIGHT NOW? Reference their latest vitals (with actual numbers), recent labs (with values), and clinical trajectory (improving/stable/worsening based on vitals trends).

## Priority Actions (Next 4-8 Hours)
Numbered list of what needs attention, ordered by urgency. Reference specific vital sign thresholds.

## Vital Signs Monitoring Plan
What to monitor, how often, and the EXACT thresholds that should trigger escalation (e.g., "Call MD if HR > 120 or SpO2 < 92%").

## Medication Schedule & Notes
List upcoming medications with timing, and any special nursing considerations for each.

## Pain & Comfort Management
Current pain level, what's being done, what else could help. Include positioning, ice/heat, breathing exercises.

## Nutrition & Hydration
Current diet, fluid restrictions if any, blood sugar management plan if diabetic.

## Activity & Mobility Plan
Current activity level, mobilization goals, fall precautions if needed.

## Supportive Care & Home Remedies
Evidence-based comfort measures safe with current medications: warm compresses, breathing exercises, appropriate herbal teas, meditation, aromatherapy, etc.

## Patient Education Points
What the patient should understand about their condition and treatment plan today.

## Escalation Triggers — Notify Doctor If:
Specific findings with exact numbers that require physician notification.

CRITICAL RULES: Write each section ONCE — never repeat information. Keep each section 3-8 bullet points. Complete ALL sections. Do not stop mid-section.`;

    const plan = await generateAiResponse(provider, key, systemPrompt,
      `IMPORTANT: Generate a detailed ${plan_type === "discharge" ? "DISCHARGE" : "CURRENT"} care plan for this patient. Use their ACTUAL data — real vitals numbers, real lab values, real medications. Do not be generic.\n\n${context}`
    );

    return NextResponse.json({
      success: true,
      data: { plan, ai_model: provider, plan_type, patient_name: patient.name },
      error: null, meta: { ai_powered: true, query_time_ms: Date.now() - startTime },
    });
  } catch (error) {
    return NextResponse.json({
      success: true,
      data: { plan: buildRuleBasedPlan(patient, conditions, meds, allergies, vitals, labs, plan_type) + `\n\n---\n*AI unavailable: ${formatAiError(error)}*`, ai_model: "rule-based", plan_type },
      error: null, meta: { ai_powered: false, query_time_ms: Date.now() - startTime },
    });
  }
}

function buildRuleBasedPlan(patient: Row, conditions: Row[], meds: Row[], allergies: Row[], vitals: Row[], labs: Row[], planType: string): string {
  const v = vitals[0];
  let plan = `## ${planType === "discharge" ? "Discharge" : "Current"} Care Plan for ${patient.name}\n\n`;
  plan += `**Patient:** ${patient.name}, ${patient.age}y ${patient.sex}, Blood Group: ${patient.blood_group}\n`;
  plan += `**Conditions:** ${conditions.map((c) => `${c.name} (${c.severity})`).join(", ") || "None"}\n`;
  plan += `**Allergies:** ${allergies.length > 0 ? allergies.map((a) => `${a.allergen} (${a.severity})`).join(", ") : "NKDA"}\n\n`;

  if (v) {
    plan += `## Current Vital Signs\n`;
    plan += `- Heart Rate: ${v.heart_rate} bpm${Number(v.heart_rate) > 100 ? " (ELEVATED)" : ""}\n`;
    plan += `- Blood Pressure: ${v.blood_pressure_sys}/${v.blood_pressure_dia} mmHg${Number(v.blood_pressure_sys) > 140 ? " (HIGH)" : ""}\n`;
    plan += `- SpO2: ${v.spo2}%${Number(v.spo2) < 95 ? " (LOW)" : ""}\n`;
    plan += `- Blood Sugar: ${v.blood_sugar} mg/dL${Number(v.blood_sugar) > 200 ? " (ELEVATED)" : ""}\n`;
    plan += `- Temperature: ${v.temperature}°F${Number(v.temperature) > 100.4 ? " (FEVER)" : ""}\n`;
    plan += `- Pain: ${v.pain_level}/10\n`;
    plan += `- Recorded by: ${v.recorded_by} at ${v.recorded_at}\n\n`;
  }

  plan += `## Medications (${meds.length})\n`;
  meds.forEach((m) => { plan += `- **${m.drug_name}** ${m.dose} — ${m.frequency} (${m.route})${m.instructions ? ` — *${m.instructions}*` : ""}\n`; });

  const abnormal = labs.filter((l) => l.status !== "normal");
  if (abnormal.length > 0) {
    plan += `\n## Abnormal Lab Results\n`;
    abnormal.forEach((l) => { plan += `- **${l.test_name}:** ${l.value} ${l.unit} [${String(l.status).toUpperCase()}] (Normal: ${l.reference_low}-${l.reference_high})\n`; });
  }

  plan += `\n---\n*Add AI key at login for a comprehensive, personalized care plan with home remedies and lifestyle recommendations.*`;
  return plan;
}
