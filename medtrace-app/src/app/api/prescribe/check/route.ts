import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { analyzeInteractions, getOverallRisk } from "@/lib/ai-engine";

export async function POST(request: Request) {
  const startTime = Date.now();
  const body = await request.json();
  const { patient_id, drug_name } = body as { patient_id: string; drug_name: string };

  if (!patient_id || !drug_name) {
    return NextResponse.json(
      { success: false, data: null, error: { code: "INVALID_INPUT", message: "patient_id and drug_name are required" }, meta: {} },
      { status: 400 }
    );
  }

  const db = getDb();
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

  const overallRisk = getOverallRisk(interactions);

  return NextResponse.json({
    success: true,
    data: { patient_id, new_drug: drug_name, overall_risk: overallRisk, interactions, ai_powered: false },
    error: null,
    meta: { ai_powered: false, query_time_ms: Date.now() - startTime },
  });
}
