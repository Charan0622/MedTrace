import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

// CREATE — Doctor prescribes new medication
export async function POST(request: Request) {
  const db = getDb();
  const body = await request.json();
  const { patient_id, drug_id, drug_name, generic_name, drug_class, dose, frequency, route, prescriber, instructions } = body;

  if (!patient_id || !dose || !frequency) {
    return NextResponse.json({ success: false, data: null, error: { code: "INVALID_INPUT", message: "patient_id, dose, frequency required" }, meta: {} }, { status: 400 });
  }

  // If drug_id starts with "fda-" or doesn't exist locally, auto-create the drug
  let finalDrugId = drug_id;
  if (!finalDrugId || finalDrugId.startsWith("fda-")) {
    const name = drug_name ?? "Unknown Drug";
    const existing = db.prepare("SELECT id FROM drugs WHERE LOWER(name) = LOWER(?)").get(name) as { id: string } | undefined;
    if (existing) {
      finalDrugId = existing.id;
    } else {
      finalDrugId = `drug-${Date.now()}`;
      db.prepare("INSERT INTO drugs (id, name, generic_name, drug_class) VALUES (?, ?, ?, ?)")
        .run(finalDrugId, name, generic_name ?? null, drug_class ?? null);
    }
  }

  // Check for duplicates
  const dup = db.prepare("SELECT * FROM patient_medications WHERE patient_id = ? AND drug_id = ? AND status = 'active'").get(patient_id, finalDrugId);
  if (dup) {
    return NextResponse.json({ success: false, data: null, error: { code: "DUPLICATE", message: "Patient already has this medication active" }, meta: {} }, { status: 409 });
  }

  const id = `pm-${Date.now()}`;
  db.prepare("INSERT INTO patient_medications (id, patient_id, drug_id, dose, frequency, route, start_date, prescriber, status, instructions) VALUES (?, ?, ?, ?, ?, ?, date('now'), ?, 'active', ?)")
    .run(id, patient_id, finalDrugId, dose, frequency, route ?? "Oral", prescriber, instructions ?? null);

  const saved = db.prepare("SELECT pm.*, d.name as drug_name FROM patient_medications pm JOIN drugs d ON d.id = pm.drug_id WHERE pm.id = ?").get(id);
  return NextResponse.json({ success: true, data: saved, error: null, meta: {} }, { status: 201 });
}

// UPDATE — Edit medication (dose, frequency, instructions, discontinue)
export async function PATCH(request: Request) {
  const db = getDb();
  const body = await request.json();
  const { id, dose, frequency, instructions, status } = body;

  if (!id) return NextResponse.json({ success: false, data: null, error: { code: "INVALID_INPUT", message: "id required" }, meta: {} }, { status: 400 });

  if (status === "discontinued") {
    db.prepare("UPDATE patient_medications SET status = 'discontinued', end_date = date('now') WHERE id = ?").run(id);
  } else {
    const updates: string[] = [];
    const values: unknown[] = [];
    if (dose !== undefined) { updates.push("dose = ?"); values.push(dose); }
    if (frequency !== undefined) { updates.push("frequency = ?"); values.push(frequency); }
    if (instructions !== undefined) { updates.push("instructions = ?"); values.push(instructions); }
    if (updates.length > 0) { values.push(id); db.prepare(`UPDATE patient_medications SET ${updates.join(", ")} WHERE id = ?`).run(...values); }
  }

  const updated = db.prepare("SELECT pm.*, d.name as drug_name FROM patient_medications pm JOIN drugs d ON d.id = pm.drug_id WHERE pm.id = ?").get(id);
  return NextResponse.json({ success: true, data: updated, error: null, meta: {} });
}
