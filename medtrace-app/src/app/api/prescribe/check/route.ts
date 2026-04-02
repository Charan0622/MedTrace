import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { analyzeInteractions, getOverallRisk } from "@/lib/ai-engine";
import { getProviderAndKey, generateAiResponse, formatAiError } from "@/lib/ai-client";

type Row = Record<string, unknown>;

// Dangerous/toxic substances that should NEVER be prescribed
const TOXIC_SUBSTANCES = [
  "sulfuric acid", "hydrochloric acid", "nitric acid", "phosphoric acid", "acetic acid",
  "bleach", "ammonia", "cyanide", "arsenic", "mercury", "lead", "thallium", "ricin",
  "methanol", "ethylene glycol", "antifreeze", "rat poison", "pesticide", "insecticide",
  "formaldehyde", "benzene", "toluene", "acetone", "turpentine", "kerosene", "gasoline",
  "drain cleaner", "oven cleaner", "detergent", "soap", "shampoo", "nail polish remover",
  "paint thinner", "lighter fluid", "rubbing alcohol", "hydrogen peroxide", "chlorine",
  "lye", "caustic soda", "sodium hydroxide", "potassium hydroxide", "battery acid",
  "strychnine", "hemlock", "nightshade", "aconite", "oleander",
  "heroin", "cocaine", "methamphetamine", "fentanyl", "crack", "meth", "ecstasy", "lsd",
  "plutonium", "uranium", "radium", "asbestos", "ddt",
];

function isToxicSubstance(name: string): boolean {
  const lower = name.toLowerCase().trim();
  return TOXIC_SUBSTANCES.some((t) => lower.includes(t) || t.includes(lower));
}

function isValidMedication(name: string, db: ReturnType<typeof getDb>): { valid: boolean; source: string } {
  const lower = name.toLowerCase().trim();

  // Check our drugs database
  const dbDrug = db.prepare(
    "SELECT id FROM drugs WHERE LOWER(name) = ? OR LOWER(generic_name) = ?"
  ).get(lower, lower);
  if (dbDrug) return { valid: true, source: "database" };

  // Check drug_info table
  const drugInfo = db.prepare(
    "SELECT id FROM drug_info WHERE LOWER(drug_name) = ? OR LOWER(generic_name) = ?"
  ).get(lower, lower);
  if (drugInfo) return { valid: true, source: "drug_info" };

  return { valid: false, source: "unknown" };
}

export async function POST(request: Request) {
  const startTime = Date.now();
  const { key } = getProviderAndKey(request);
  const body = await request.json();
  const { patient_id, drug_name } = body as { patient_id: string; drug_name: string };

  if (!patient_id || !drug_name) {
    return NextResponse.json(
      { success: false, data: null, error: { code: "INVALID_INPUT", message: "patient_id and drug_name are required" }, meta: {} },
      { status: 400 }
    );
  }

  // ── SAFETY GATE 1: Toxic substance check ──
  if (isToxicSubstance(drug_name)) {
    return NextResponse.json({
      success: true,
      data: {
        patient_id, new_drug: drug_name, overall_risk: "critical" as const,
        interactions: [{
          type: "contraindication" as const,
          risk_level: "critical" as const,
          drugs_involved: [drug_name],
          mechanism: "TOXIC SUBSTANCE — NOT A MEDICATION",
          explanation: `"${drug_name}" is a toxic/dangerous substance, NOT an approved medication. It is harmful to humans and must NEVER be administered to any patient. This substance can cause severe organ damage, chemical burns, or death.`,
          evidence_level: "Safety Blocklist",
        }],
        ai_analysis: null,
        ai_powered: false,
        blocked: true,
        block_reason: "toxic_substance",
      },
      error: null,
      meta: { ai_powered: false, query_time_ms: Date.now() - startTime },
    });
  }

  const db = getDb();

  // ── SAFETY GATE 2: Verify it's a known medication ──
  const drugCheck = isValidMedication(drug_name, db);

  const currentDrugIds = (db.prepare(
    "SELECT drug_id FROM patient_medications WHERE patient_id = ? AND status = 'active'"
  ).all(patient_id) as { drug_id: string }[]).map((r) => r.drug_id);

  // Check allergies
  const allergies = db.prepare(
    "SELECT * FROM allergies WHERE patient_id = ?"
  ).all(patient_id) as { allergen: string; reaction: string; severity: string }[];

  const allergyWarnings = allergies.filter((a) =>
    drug_name.toLowerCase().includes(a.allergen.toLowerCase()) ||
    a.allergen.toLowerCase().includes(drug_name.toLowerCase())
  );

  // Rule-based analysis (always runs — instant)
  const interactions = analyzeInteractions({
    patient_id,
    new_drug_name: drug_name,
    current_drug_ids: currentDrugIds,
  });

  // Add allergy warnings as critical interactions
  for (const aw of allergyWarnings) {
    interactions.unshift({
      type: "contraindication",
      risk_level: aw.severity === "severe" ? "critical" : "high",
      drugs_involved: [drug_name],
      mechanism: `ALLERGY: Patient is allergic to ${aw.allergen}`,
      explanation: `Patient has a documented ${aw.severity} allergy to ${aw.allergen} with reaction: ${aw.reaction}. This drug should NOT be prescribed.`,
      evidence_level: "Patient Record",
    });
  }

  // If drug is not in our database, add a warning
  if (!drugCheck.valid) {
    interactions.unshift({
      type: "contraindication",
      risk_level: "high",
      drugs_involved: [drug_name],
      mechanism: "UNVERIFIED MEDICATION — Not found in MedTrace database",
      explanation: `"${drug_name}" is not found in the MedTrace approved drug database. This could be a misspelling, a non-standard medication name, or a non-pharmaceutical substance. Please verify the drug name and consult a pharmacist before prescribing. Only FDA-approved medications should be administered.`,
      evidence_level: "Database Validation",
    });
  }

  const overallRisk = getOverallRisk(interactions);

  // If no AI key, return rule-based results
  if (!key) {
    return NextResponse.json({
      success: true,
      data: { patient_id, new_drug: drug_name, overall_risk: overallRisk, interactions, ai_analysis: null, ai_powered: false },
      error: null,
      meta: { ai_powered: false, query_time_ms: Date.now() - startTime },
    });
  }

  // ── AI-ENHANCED ANALYSIS ──
  const patient = db.prepare("SELECT * FROM patients WHERE id = ?").get(patient_id) as Row | undefined;
  const admission = db.prepare("SELECT * FROM admissions WHERE patient_id = ? AND status = 'admitted'").get(patient_id) as Row | undefined;
  const meds = db.prepare("SELECT pm.*, d.name as drug_name, d.drug_class FROM patient_medications pm JOIN drugs d ON d.id = pm.drug_id WHERE pm.patient_id = ? AND pm.status = 'active'").all(patient_id) as Row[];
  const conditions = db.prepare("SELECT c.name, c.category, pc.severity FROM patient_conditions pc JOIN conditions c ON c.id = pc.condition_id WHERE pc.patient_id = ?").all(patient_id) as Row[];
  const vitals = db.prepare("SELECT * FROM vital_signs WHERE patient_id = ? ORDER BY recorded_at DESC LIMIT 3").all(patient_id) as Row[];
  const labs = db.prepare("SELECT test_name, value, unit, status FROM lab_results WHERE patient_id = ? ORDER BY resulted_at DESC LIMIT 10").all(patient_id) as Row[];
  const genotypes = db.prepare("SELECT gv.gene, gv.variant, gv.type FROM patient_genotypes pg JOIN gene_variants gv ON gv.id = pg.gene_variant_id WHERE pg.patient_id = ?").all(patient_id) as Row[];

  const ruleBasedFindings = interactions.map((i) => `[${i.risk_level.toUpperCase()}] ${i.mechanism}: ${i.explanation}`).join("\n");

  const patientContext = `PATIENT: ${patient?.name ?? "Unknown"}, ${patient?.age}y ${patient?.sex}, Blood: ${patient?.blood_group}
DIAGNOSIS: ${admission?.diagnosis ?? "N/A"} | REASON: ${admission?.reason ?? "N/A"}
ALLERGIES: ${allergies.length > 0 ? allergies.map((a) => `${a.allergen} (${a.severity}: ${a.reaction})`).join(", ") : "NKDA"}
CONDITIONS: ${conditions.map((c) => `${c.name} (${c.severity})`).join(", ") || "None"}
GENETICS: ${genotypes.map((g) => `${g.gene} ${g.variant} (${String(g.type).replace("_", " ")})`).join(", ") || "None"}
CURRENT MEDICATIONS (${meds.length}): ${meds.map((m) => `${m.drug_name} ${m.dose} ${m.frequency} (${m.drug_class})`).join("; ") || "None"}
VITALS: ${vitals.length > 0 ? `HR:${vitals[0].heart_rate} BP:${vitals[0].blood_pressure_sys}/${vitals[0].blood_pressure_dia} SpO2:${vitals[0].spo2}% Sugar:${vitals[0].blood_sugar} Temp:${vitals[0].temperature}°F Pain:${vitals[0].pain_level}/10` : "None"}
LABS: ${labs.map((l) => `${l.test_name}: ${l.value} ${l.unit} [${l.status}]`).join("; ") || "None"}
NEW DRUG BEING PRESCRIBED: ${drug_name}
IS IN MEDTRACE DATABASE: ${drugCheck.valid ? "Yes" : "NO — UNVERIFIED"}
RULE-BASED FINDINGS: ${ruleBasedFindings || "No interactions found by rule engine"}`;

  try {
    const aiText = await generateAiResponse(key,
      `You are a senior clinical pharmacologist AI performing a comprehensive drug safety check in a hospital. A physician wants to prescribe "${drug_name}" to a patient.

ABSOLUTE SAFETY RULES — THESE OVERRIDE EVERYTHING:
1. If the substance is NOT a real, FDA/WHO-approved pharmaceutical medication, you MUST set safe_to_prescribe to false and risk_score to 10. Chemicals, household products, industrial compounds, recreational drugs, poisons, acids, bases, solvents — are NOT medications. Be extremely strict.
2. If you are not at least 95% confident this is a legitimate, approved medication with a known safety profile, set safe_to_prescribe to false.
3. NEVER approve a substance just because it has some medical use in very specific contexts (e.g., "dilute acetic acid for ear infections" does NOT make "acetic acid" safe to prescribe generally).
4. When in doubt, REJECT. Patient safety is paramount. A false rejection is infinitely better than a false approval.

Analyze these 8 dimensions:
1. Drug-Drug Interactions — with ALL current medications
2. Drug-Disease Interactions — safe for patient's conditions?
3. Vitals Impact — will it push vitals into danger zone? (cite actual values)
4. Lab Safety — do current lab values affect dosing/safety? (cite values)
5. Pharmacogenomics — genetic profile affects metabolism?
6. Age & Lifestyle — age-appropriate? falls risk? admission context?
7. Diet & Nutrition — foods to avoid? timing with meals?
8. Polypharmacy — total medication burden assessment

Return ONLY valid JSON:
{
  "safe_to_prescribe": true/false,
  "confidence": "high|medium|low",
  "overall_assessment": "2-3 sentence summary — if rejecting, explain clearly WHY this is not safe",
  "risk_score": 1-10,
  "dimensions": [
    {"name": "Drug Validity", "risk": "safe|low|moderate|high|critical", "finding": "Is this a real, approved medication? If not, explain what it actually is."},
    {"name": "Drug-Drug", "risk": "...", "finding": "..."},
    {"name": "Drug-Disease", "risk": "...", "finding": "..."},
    {"name": "Vitals Impact", "risk": "...", "finding": "cite actual vital values"},
    {"name": "Lab Safety", "risk": "...", "finding": "cite actual lab values"},
    {"name": "Pharmacogenomics", "risk": "...", "finding": "..."},
    {"name": "Age & Lifestyle", "risk": "...", "finding": "..."},
    {"name": "Diet & Nutrition", "risk": "...", "finding": "..."},
    {"name": "Polypharmacy", "risk": "...", "finding": "..."}
  ],
  "dose_recommendation": "If safe: recommended starting dose with justification. If unsafe: 'DO NOT PRESCRIBE'",
  "monitoring_plan": "If safe: what to monitor. If unsafe: 'N/A — substance rejected'"
}`,
      patientContext
    );

    const cleaned = aiText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    let aiAnalysis = null;

    if (jsonMatch) {
      try {
        aiAnalysis = JSON.parse(jsonMatch[0]);
        // Safety override: if AI somehow approves an unverified drug, downgrade
        if (!drugCheck.valid && aiAnalysis.safe_to_prescribe) {
          aiAnalysis.safe_to_prescribe = false;
          aiAnalysis.confidence = "low";
          aiAnalysis.risk_score = Math.max(aiAnalysis.risk_score, 7);
          aiAnalysis.overall_assessment = `SAFETY OVERRIDE: "${drug_name}" is not in the MedTrace approved drug database. ${aiAnalysis.overall_assessment}`;
        }
      } catch { /* ignore parse error */ }
    }

    // If AI says unsafe, upgrade overall risk
    const finalRisk = aiAnalysis && !aiAnalysis.safe_to_prescribe && overallRisk === "safe" ? "high" : overallRisk;

    return NextResponse.json({
      success: true,
      data: {
        patient_id, new_drug: drug_name, overall_risk: finalRisk, interactions,
        ai_analysis: aiAnalysis,
        ai_powered: true,
      },
      error: null,
      meta: { ai_powered: true, query_time_ms: Date.now() - startTime },
    });
  } catch (error) {
    return NextResponse.json({
      success: true,
      data: {
        patient_id, new_drug: drug_name, overall_risk: overallRisk, interactions,
        ai_analysis: null, ai_error: formatAiError(error),
        ai_powered: false,
      },
      error: null,
      meta: { ai_powered: false, query_time_ms: Date.now() - startTime },
    });
  }
}
