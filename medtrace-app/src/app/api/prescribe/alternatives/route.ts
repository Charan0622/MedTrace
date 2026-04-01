import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function POST(request: Request) {
  const startTime = Date.now();
  const body = await request.json();
  const { patient_id, drug_name } = body as { patient_id: string; drug_name: string };

  if (!patient_id || !drug_name) {
    return NextResponse.json({ success: false, data: null, error: { code: "INVALID_INPUT", message: "patient_id and drug_name required" }, meta: {} }, { status: 400 });
  }

  const db = getDb();
  const currentDrugIds = (db.prepare("SELECT drug_id FROM patient_medications WHERE patient_id = ? AND status = 'active'").all(patient_id) as { drug_id: string }[]).map((r) => r.drug_id);

  // Find drugs in the same class that have fewer interactions with current meds
  const newDrug = db.prepare("SELECT * FROM drugs WHERE LOWER(name) = LOWER(?)").get(drug_name) as { id: string; drug_class: string } | undefined;
  if (!newDrug) {
    return NextResponse.json({ success: true, data: [], error: null, meta: { query_time_ms: Date.now() - startTime } });
  }

  // Get all drugs not currently prescribed
  const allDrugs = db.prepare("SELECT * FROM drugs WHERE id NOT IN (" + currentDrugIds.map(() => "?").join(",") + ") AND id != ?" ).all(...currentDrugIds, newDrug.id) as Record<string, unknown>[];

  const alternatives = allDrugs.map((drug) => {
    const drugId = drug.id as string;
    // Count interactions this drug would have with current meds
    let interactionCount = 0;
    if (currentDrugIds.length > 0) {
      const placeholders = currentDrugIds.map(() => "?").join(",");
      interactionCount = (db.prepare(`SELECT COUNT(*) as cnt FROM drug_interactions WHERE (drug_a_id = ? AND drug_b_id IN (${placeholders})) OR (drug_b_id = ? AND drug_a_id IN (${placeholders}))`).get(drugId, ...currentDrugIds, drugId, ...currentDrugIds) as { cnt: number }).cnt;
    }
    // Count interactions the original drug would have
    let origInteractionCount = 0;
    if (currentDrugIds.length > 0) {
      const placeholders = currentDrugIds.map(() => "?").join(",");
      origInteractionCount = (db.prepare(`SELECT COUNT(*) as cnt FROM drug_interactions WHERE (drug_a_id = ? AND drug_b_id IN (${placeholders})) OR (drug_b_id = ? AND drug_a_id IN (${placeholders}))`).get(newDrug.id, ...currentDrugIds, newDrug.id, ...currentDrugIds) as { cnt: number }).cnt;
    }

    return {
      drug, risk_level: interactionCount === 0 ? "safe" : interactionCount < origInteractionCount ? "low" : "moderate",
      reason: `${drug.name} has ${interactionCount} interaction(s) vs ${origInteractionCount} for ${drug_name}`,
      interactions_avoided: origInteractionCount - interactionCount,
    };
  }).filter((a) => a.interactions_avoided > 0).sort((a, b) => b.interactions_avoided - a.interactions_avoided).slice(0, 5);

  return NextResponse.json({ success: true, data: alternatives, error: null, meta: { query_time_ms: Date.now() - startTime } });
}
