import { NextResponse } from "next/server";
import { getProviderAndKey, generateAiResponse, formatAiError } from "@/lib/ai-client";
import { getDb } from "@/lib/db";

type Row = Record<string, unknown>;

export async function POST(request: Request) {
  const startTime = Date.now();
  const { key } = getProviderAndKey(request);
  const body = await request.json();
  const { patient_id } = body as { patient_id: string };

  if (!patient_id) return NextResponse.json({ success: false, data: null, error: { code: "INVALID_INPUT", message: "patient_id required" }, meta: {} }, { status: 400 });

  const db = getDb();
  const patient = db.prepare("SELECT * FROM patients WHERE id = ?").get(patient_id) as Row | undefined;
  if (!patient) return NextResponse.json({ success: false, data: null, error: { code: "NOT_FOUND", message: "Patient not found" }, meta: {} }, { status: 404 });

  const admission = db.prepare("SELECT * FROM admissions WHERE patient_id = ? AND status = 'admitted'").get(patient_id) as Row | undefined;
  const meds = db.prepare("SELECT pm.*, d.name as drug_name, d.drug_class FROM patient_medications pm JOIN drugs d ON d.id = pm.drug_id WHERE pm.patient_id = ? AND pm.status = 'active'").all(patient_id) as Row[];
  const conditions = db.prepare("SELECT c.name, c.category, pc.severity FROM patient_conditions pc JOIN conditions c ON c.id = pc.condition_id WHERE pc.patient_id = ?").all(patient_id) as Row[];
  const allergies = db.prepare("SELECT allergen, reaction, severity FROM allergies WHERE patient_id = ?").all(patient_id) as Row[];
  const genotypes = db.prepare("SELECT gv.gene, gv.variant, gv.type FROM patient_genotypes pg JOIN gene_variants gv ON gv.id = pg.gene_variant_id WHERE pg.patient_id = ?").all(patient_id) as Row[];
  const latestVitals = db.prepare("SELECT * FROM vital_signs WHERE patient_id = ? ORDER BY recorded_at DESC LIMIT 1").get(patient_id) as Row | undefined;
  const labs = db.prepare("SELECT test_name, value, unit, status FROM lab_results WHERE patient_id = ? ORDER BY resulted_at DESC LIMIT 10").all(patient_id) as Row[];

  const currentDrugNames = new Set(meds.map((m) => String(m.drug_name).toLowerCase()));
  const allergenNames = new Set(allergies.map((a) => String(a.allergen).toLowerCase()));
  const conditionNames = conditions.map((c) => String(c.name).toLowerCase());
  const summary = `${patient.name}, ${conditions.length} conditions, ${meds.length} active meds, ${allergies.length} allergies`;

  // Build patient context for AI
  const patientContext = `PATIENT: ${patient.name}, ${patient.age}y ${patient.sex}, Blood: ${patient.blood_group}
ADMISSION: ${admission?.diagnosis ?? "N/A"} — ${admission?.reason ?? "N/A"}
CONDITIONS: ${conditions.map((c) => `${c.name} (${c.severity})`).join(", ") || "None"}
CURRENT MEDICATIONS: ${meds.map((m) => `${m.drug_name} ${m.dose} ${m.frequency} (${m.drug_class})`).join(", ") || "None"}
ALLERGIES: ${allergies.length > 0 ? allergies.map((a) => `${a.allergen} (${a.severity}: ${a.reaction})`).join(", ") : "NKDA"}
GENETICS: ${genotypes.map((g) => `${g.gene} ${g.variant} (${g.type})`).join(", ") || "None"}
VITALS: ${latestVitals ? `HR:${latestVitals.heart_rate} BP:${latestVitals.blood_pressure_sys}/${latestVitals.blood_pressure_dia} SpO2:${latestVitals.spo2}% Sugar:${latestVitals.blood_sugar} Temp:${latestVitals.temperature}°F Pain:${latestVitals.pain_level}/10` : "None"}
LABS: ${labs.map((l) => `${l.test_name}: ${l.value} ${l.unit} [${l.status}]`).join(", ") || "None"}`;

  // === AI-POWERED SUGGESTIONS ===
  if (key) {
    try {
      const allDrugs = db.prepare("SELECT name, generic_name, drug_class FROM drugs ORDER BY name").all() as Row[];
      const text = await generateAiResponse(key,
        `You are an expert clinical pharmacologist AI with deep knowledge of drug interactions, pharmacogenomics, and evidence-based prescribing. You are assisting a hospital physician with medication recommendations for a specific patient.

Suggest 3-5 NEW medications that are NOT already prescribed. Your recommendations must demonstrate sophisticated clinical reasoning:

CLINICAL REASONING REQUIREMENTS:
- Analyze the patient's conditions and identify undertreated or untreated issues
- Consider their current drug regimen for synergistic opportunities (e.g., if they're on a beta-blocker for heart failure, suggest an ACE inhibitor if not already on one)
- Review their lab values — if renal function is impaired, adjust doses accordingly; if electrolytes are off, consider drugs that address or don't worsen that
- Factor in their pharmacogenomic profile — if they're a CYP2D6 poor metabolizer, avoid drugs primarily metabolized by that enzyme or adjust dose
- Consider their age and sex for dose adjustments and drug selection
- Look at their vitals trends — if BP is trending up despite current medications, suggest add-on therapy
- Identify preventive medications they should be on (DVT prophylaxis, stress ulcer prophylaxis, etc.) based on their admission context

RATIONALE MUST EXPLAIN (this is what impresses physicians — be thorough):
1. WHY this specific drug — not just "for hypertension" but "Patient's BP is 158/92 trending up despite current Amlodipine 5mg. Adding Losartan provides dual-mechanism control via RAAS pathway, complementing the calcium channel blockade"
2. WHY this exact dose/concentration — "Starting at 25mg (not 50mg) because patient is ${">"}65 years old with mildly elevated creatinine at 1.4 mg/dL, suggesting reduced renal clearance. Lower starting dose minimizes hypotension risk"
3. HOW you calculated it — "Based on patient's age (72y), weight, eGFR estimate from creatinine 1.4, and current medication load of 6 drugs — dose adjusted downward to reduce polypharmacy burden"
4. LIFESTYLE factors — "Patient's diabetes and sedentary admission status increase cardiovascular risk. This medication also provides renal protective benefits for diabetic nephropathy"
5. DISEASE interaction — "This drug treats their primary condition (hypertension) while also benefiting their comorbid condition (diabetic nephropathy) — dual therapeutic value"
6. WHAT the drug's active compound does at molecular level — brief 1-line mechanism like "Blocks angiotensin II AT1 receptors, reducing vasoconstriction and aldosterone secretion"

Return ONLY a valid JSON array with this format:
[{
  "drug_name": "Losartan",
  "dose": "25mg",
  "frequency": "Once daily",
  "route": "Oral",
  "rationale": "MUST be 3-5 sentences covering: WHY this drug for THIS patient (cite their specific vitals/labs/conditions), WHY this dose (explain calculation based on age/weight/renal function), and HOW it complements their existing medications. End with the molecular mechanism in 1 line.",
  "warnings": "Monitor potassium levels (risk of hyperkalemia with current Lisinopril). Check renal function in 1 week. Hold if systolic BP < 90. Watch for dizziness in first 48 hours.",
  "priority": "high|medium|low"
}]

ABSOLUTE RULES:
- NEVER suggest a drug the patient is already taking (check the list carefully)
- NEVER suggest a drug the patient is allergic to or a cross-reactive drug in the same class
- The "rationale" MUST cite specific patient numbers — actual BP readings, lab values, age, condition names. Generic rationales are unacceptable.
- The "warnings" field must include monitoring requirements, hold parameters, and key drug-drug interactions with their current regimen
- Doses must be justified by the patient's age, renal/hepatic function, and pharmacogenomics
- Each suggestion should feel like a senior physician explaining their thought process to a resident`,
        `${patientContext}\n\nAVAILABLE DRUGS: ${allDrugs.map((d) => d.name).join(", ")}\n\nSuggest medications specifically for this patient.`
      );

      // Extract JSON from AI response — handle markdown wrapping, extra text, etc.
      let cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      // Try to find JSON array in the response
      const jsonMatch = cleaned.match(/\[[\s\S]*\]/);
      if (jsonMatch) cleaned = jsonMatch[0];

      let suggestions;
      try {
        suggestions = JSON.parse(cleaned);
        if (!Array.isArray(suggestions)) suggestions = [];
        // Filter out any drugs already prescribed or allergens
        suggestions = suggestions.filter((s: { drug_name: string }) =>
          s.drug_name &&
          !currentDrugNames.has(s.drug_name.toLowerCase()) &&
          !allergenNames.has(s.drug_name.toLowerCase())
        );
      } catch {
        // AI returned non-JSON — fall through to rule-based
        const rbSuggestions = buildSmartSuggestions(conditionNames, currentDrugNames, allergenNames, latestVitals, labs, patient, genotypes, db);
        return NextResponse.json({
          success: true,
          data: { suggestions: rbSuggestions, patient_context_summary: summary, ai_model: "rule-based", ai_error: "AI returned invalid format, using rule-based fallback" },
          error: null, meta: { ai_powered: false, query_time_ms: Date.now() - startTime },
        });
      }

      return NextResponse.json({
        success: true,
        data: { suggestions, patient_context_summary: summary, ai_model: "nvidia" },
        error: null, meta: { ai_powered: true, query_time_ms: Date.now() - startTime },
      });
    } catch (error) {
      // Fall through to rule-based
      const suggestions = buildSmartSuggestions(conditionNames, currentDrugNames, allergenNames, latestVitals, labs, patient, genotypes, db);
      return NextResponse.json({
        success: true,
        data: { suggestions, patient_context_summary: summary, ai_model: "rule-based", ai_error: formatAiError(error) },
        error: null, meta: { ai_powered: false, query_time_ms: Date.now() - startTime },
      });
    }
  }

  // === RULE-BASED SUGGESTIONS (no AI key) ===
  const suggestions = buildSmartSuggestions(conditionNames, currentDrugNames, allergenNames, latestVitals, labs, patient, genotypes, db);
  return NextResponse.json({
    success: true,
    data: { suggestions, patient_context_summary: summary, ai_model: "rule-based" },
    error: null, meta: { ai_powered: false, query_time_ms: Date.now() - startTime },
  });
}

function buildSmartSuggestions(
  conditions: string[], currentDrugs: Set<string>, allergens: Set<string>,
  vitals: Row | undefined, labs: Row[], patient: Row, genotypes: Row[],
  db: ReturnType<typeof getDb>
) {
  type Suggestion = { drug_name: string; dose: string; frequency: string; route: string; rationale: string; warnings: string; priority: string };
  const suggestions: Suggestion[] = [];
  const suggested = new Set<string>();

  function add(s: Suggestion) {
    const name = s.drug_name.toLowerCase();
    if (currentDrugs.has(name) || allergens.has(name) || suggested.has(name)) return;
    // Verify drug exists in DB
    const exists = db.prepare("SELECT id FROM drugs WHERE LOWER(name) = LOWER(?)").get(s.drug_name);
    if (!exists) return;
    suggested.add(name);
    suggestions.push(s);
  }

  const age = Number(patient.age) || 0;
  const hasCKD = conditions.some((c) => c.includes("ckd") || c.includes("kidney"));
  const isPregnant = conditions.some((c) => c.includes("pregnan"));
  const isPoorMetabolizer = genotypes.some((g) => String(g.type) === "poor_metabolizer");

  // === CONDITION-BASED ===
  for (const cond of conditions) {
    if (cond.includes("hypertension") || cond.includes("hypertensive")) {
      add({ drug_name: "Lisinopril", dose: hasCKD ? "2.5mg" : age > 65 ? "5mg" : "10mg", frequency: "Once daily", route: "Oral", rationale: `ACE inhibitor for hypertension${hasCKD ? " with renal-protective benefits for CKD" : ""}. ${age > 65 ? "Starting low dose due to age." : ""}`, warnings: "Monitor potassium and creatinine. Hold if SBP < 90.", priority: "high" });
      add({ drug_name: "Amlodipine", dose: age > 65 ? "2.5mg" : "5mg", frequency: "Once daily", route: "Oral", rationale: "Calcium channel blocker for BP control. Good option if ACE inhibitor not tolerated.", warnings: "May cause peripheral edema. Monitor BP.", priority: "medium" });
      add({ drug_name: "Metoprolol", dose: "25mg", frequency: "Twice daily", route: "Oral", rationale: "Beta-blocker for hypertension and heart rate control.", warnings: "Check HR before giving. Hold if HR < 60 or SBP < 100.", priority: "medium" });
    }
    if (cond.includes("diabetes") || cond.includes("dka") || cond.includes("hyperglycemia")) {
      add({ drug_name: "Metformin", dose: hasCKD ? "250mg" : "500mg", frequency: hasCKD ? "Once daily" : "Twice daily with meals", route: "Oral", rationale: `First-line for Type 2 DM.${hasCKD ? " Reduced dose for CKD — monitor creatinine." : " Give with meals to reduce GI side effects."}`, warnings: hasCKD ? "CAUTION in CKD — monitor eGFR. Hold if creatinine > 1.5." : "Hold before contrast procedures.", priority: "high" });
      add({ drug_name: "Insulin Lispro", dose: "Sliding scale", frequency: "Before meals + bedtime", route: "Subcutaneous", rationale: "Rapid-acting insulin for glycemic control. Essential if blood sugar consistently > 200.", warnings: "Check blood sugar before each dose. Watch for hypoglycemia.", priority: "high" });
    }
    if (cond.includes("depression")) {
      add({ drug_name: "Sertraline", dose: isPoorMetabolizer ? "25mg" : "50mg", frequency: "Once daily AM", route: "Oral", rationale: `SSRI for depression.${isPoorMetabolizer ? " Starting lower dose due to poor metabolizer status." : ""} Generally well tolerated.`, warnings: "Monitor for activation/suicidal ideation in first 2 weeks. Takes 4-6 weeks for full effect.", priority: "medium" });
      add({ drug_name: "Fluoxetine", dose: "20mg", frequency: "Once daily AM", route: "Oral", rationale: "SSRI for major depression. Long half-life provides stable drug levels.", warnings: "Potent CYP2D6 inhibitor — check for interactions with beta-blockers.", priority: "medium" });
    }
    if (cond.includes("atrial fibrillation") || cond.includes("afib")) {
      add({ drug_name: "Warfarin", dose: isPoorMetabolizer ? "2mg" : "5mg", frequency: "Once daily at 18:00", route: "Oral", rationale: `Anticoagulation for stroke prevention in AFib.${isPoorMetabolizer ? " Reduced dose — CYP2C9 poor metabolizer detected." : ""} Target INR 2.0-3.0.`, warnings: "Check INR before each dose. Hold if INR > 3.5. Watch for bleeding.", priority: "high" });
      add({ drug_name: "Metoprolol", dose: "25mg", frequency: "Twice daily", route: "Oral", rationale: "Rate control for atrial fibrillation. Target resting HR 60-80.", warnings: "Check HR and BP before giving.", priority: "high" });
    }
    if (cond.includes("gerd") || cond.includes("gastro")) {
      add({ drug_name: "Pantoprazole", dose: "40mg", frequency: "Once daily before breakfast", route: "Oral", rationale: "PPI for GERD. Preferred over omeprazole if patient takes clopidogrel (no CYP2C19 interaction).", warnings: "Long-term use: monitor magnesium, B12, bone density.", priority: "low" });
    }
    if (cond.includes("osteoarthritis") || cond.includes("pain")) {
      add({ drug_name: "Acetaminophen", dose: age > 65 ? "325mg" : "500mg", frequency: "Every 6 hours as needed", route: "Oral", rationale: `First-line analgesic for pain. Safer than NSAIDs${currentDrugs.has("warfarin") ? " especially with concurrent anticoagulation" : ""}.`, warnings: `Max ${age > 65 ? "2000" : "3000"}mg/day. Avoid if liver disease.`, priority: "medium" });
    }
    if (cond.includes("copd")) {
      add({ drug_name: "Albuterol", dose: "2.5mg", frequency: "Every 4 hours + PRN", route: "Nebulizer", rationale: "Short-acting bronchodilator for COPD/acute bronchospasm relief.", warnings: "Monitor HR after nebulizer treatment. May cause tachycardia.", priority: "high" });
      add({ drug_name: "Prednisone", dose: "40mg", frequency: "Once daily for 5 days", route: "Oral", rationale: "Short corticosteroid burst for COPD exacerbation.", warnings: "Monitor blood sugar — steroids cause hyperglycemia. Give with food.", priority: "high" });
      add({ drug_name: "Tiotropium", dose: "18mcg", frequency: "Once daily", route: "Inhaled", rationale: "Long-acting anticholinergic for COPD maintenance therapy.", warnings: "Not for acute rescue. Give in the morning.", priority: "medium" });
    }
    if (cond.includes("pneumonia")) {
      add({ drug_name: "Azithromycin", dose: "500mg", frequency: "Once daily for 5 days", route: "IV", rationale: "Macrolide antibiotic for community-acquired pneumonia. Good atypical coverage.", warnings: "QT prolongation risk. Switch to PO when tolerating oral intake.", priority: "high" });
    }
    if (cond.includes("heart failure") || cond.includes("chf")) {
      add({ drug_name: "Furosemide", dose: "20mg", frequency: "Once daily", route: "Oral", rationale: "Loop diuretic for fluid overload in heart failure.", warnings: "Monitor daily weight, I&O, potassium, and creatinine.", priority: "high" });
    }
    if (cond.includes("seizure") || cond.includes("epilepsy")) {
      add({ drug_name: "Levetiracetam", dose: "500mg", frequency: "Twice daily", route: "Oral", rationale: `Anticonvulsant for seizure control.${isPregnant ? " PREGNANCY SAFE — preferred over valproic acid." : ""}`, warnings: "May cause behavioral changes. Taper when discontinuing.", priority: "high" });
      if (isPregnant) {
        add({ drug_name: "Folic Acid", dose: "4mg", frequency: "Once daily", route: "Oral", rationale: "High-dose folic acid — critical for pregnant patients on anticonvulsants to prevent neural tube defects.", warnings: "Continue throughout pregnancy.", priority: "high" });
      }
    }
    if (cond.includes("hypothyroid")) {
      add({ drug_name: "Levothyroxine", dose: age > 65 ? "25mcg" : "50mcg", frequency: "Once daily on empty stomach", route: "Oral", rationale: `Thyroid hormone replacement.${age > 65 ? " Starting low dose for elderly — titrate slowly." : ""}`, warnings: "Take 30-60 min before breakfast. Separate from calcium/iron by 4 hours.", priority: "medium" });
    }
    if (cond.includes("anxiety")) {
      add({ drug_name: "Sertraline", dose: "50mg", frequency: "Once daily", route: "Oral", rationale: "SSRI — first-line for generalized anxiety disorder.", warnings: "Takes 4-6 weeks for full anxiolytic effect.", priority: "medium" });
      add({ drug_name: "Lorazepam", dose: "0.5mg", frequency: "Every 8 hours as needed", route: "Oral", rationale: "Short-term anxiolytic for acute anxiety. Not for long-term use.", warnings: "Risk of dependence. Max 3 doses/day. Monitor sedation.", priority: "low" });
    }
  }

  // === VITALS-BASED ===
  if (vitals) {
    const sugar = Number(vitals.blood_sugar) || 0;
    const pain = Number(vitals.pain_level) || 0;
    const spo2 = Number(vitals.spo2) || 100;

    if (sugar > 250 && !currentDrugs.has("insulin lispro")) {
      add({ drug_name: "Insulin Lispro", dose: "Sliding scale", frequency: "Before meals + bedtime", route: "Subcutaneous", rationale: `Blood sugar critically elevated at ${sugar} mg/dL. Insulin needed for acute glycemic control.`, warnings: "Monitor blood sugar Q2H until < 250.", priority: "high" });
    }
    if (pain >= 6 && !currentDrugs.has("acetaminophen")) {
      add({ drug_name: "Acetaminophen", dose: "500mg", frequency: "Every 6 hours", route: "Oral", rationale: `Pain level ${pain}/10 — add scheduled analgesic for comfort.`, warnings: "Max 3000mg/day.", priority: "medium" });
    }
    if (spo2 < 93 && !currentDrugs.has("albuterol")) {
      add({ drug_name: "Albuterol", dose: "2.5mg", frequency: "Every 4 hours + PRN", route: "Nebulizer", rationale: `SpO2 low at ${spo2}%. Bronchodilator may help improve oxygenation.`, warnings: "Monitor HR. May cause tachycardia.", priority: "high" });
    }
  }

  // === LAB-BASED ===
  for (const lab of labs) {
    if (String(lab.test_name).includes("HbA1c") && Number(lab.value) > 8 && !currentDrugs.has("metformin")) {
      add({ drug_name: "Metformin", dose: "500mg", frequency: "Twice daily with meals", route: "Oral", rationale: `HbA1c elevated at ${lab.value}% — long-term glycemic control needed.`, warnings: "Start low, titrate up. Give with meals.", priority: "high" });
    }
    if (String(lab.test_name).includes("BNP") && Number(lab.value) > 300 && !currentDrugs.has("furosemide")) {
      add({ drug_name: "Furosemide", dose: "20mg", frequency: "Once daily", route: "Oral", rationale: `BNP elevated at ${lab.value} — suggests fluid overload. Diuretic indicated.`, warnings: "Monitor weight, potassium, creatinine daily.", priority: "high" });
    }
  }

  // === DVT PROPHYLAXIS (all immobile patients) ===
  if (!currentDrugs.has("heparin") && !currentDrugs.has("warfarin") && !isPregnant) {
    add({ drug_name: "Heparin", dose: "5000 units", frequency: "Every 8 hours", route: "Subcutaneous", rationale: "DVT prophylaxis for hospitalized patient.", warnings: "Hold if platelets < 100K or active bleeding.", priority: "low" });
  }

  // === STRESS ULCER PROPHYLAXIS ===
  if (!currentDrugs.has("pantoprazole") && !currentDrugs.has("omeprazole") && (currentDrugs.has("prednisone") || currentDrugs.has("heparin") || currentDrugs.has("warfarin"))) {
    add({ drug_name: "Pantoprazole", dose: "40mg", frequency: "Once daily", route: "Oral", rationale: "Stress ulcer prophylaxis — patient on anticoagulation/steroids.", warnings: "Preferred over omeprazole (no CYP2C19 interaction with clopidogrel).", priority: "low" });
  }

  return suggestions.slice(0, 8);
}
