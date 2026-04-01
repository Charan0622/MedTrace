import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(request: NextRequest) {
  const patientId = request.nextUrl.searchParams.get("patient_id");
  if (!patientId) return NextResponse.json({ success: false, data: null, error: { code: "INVALID_INPUT", message: "patient_id required" }, meta: {} }, { status: 400 });
  const db = getDb();
  const records = db.prepare(`
    SELECT ma.*, d.name as drug_name, d.drug_class
    FROM medication_administration ma
    LEFT JOIN patient_medications pm ON pm.id = ma.medication_id
    LEFT JOIN drugs d ON d.id = pm.drug_id
    WHERE ma.patient_id = ?
    ORDER BY ma.administered_at DESC
  `).all(patientId);
  return NextResponse.json({ success: true, data: records, error: null, meta: {} });
}

export async function POST(request: Request) {
  const db = getDb();
  const body = await request.json();
  const { patient_id, medication_id, administered_by, dose_given, status, reason, notes } = body;
  const id = `ma-${Date.now()}`;
  db.prepare("INSERT INTO medication_administration (id, patient_id, medication_id, administered_by, dose_given, status, reason, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run(id, patient_id, medication_id, administered_by, dose_given, status ?? "given", reason ?? null, notes ?? null);
  const saved = db.prepare("SELECT * FROM medication_administration WHERE id = ?").get(id);
  return NextResponse.json({ success: true, data: saved, error: null, meta: {} });
}
