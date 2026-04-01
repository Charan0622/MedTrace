import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(request: NextRequest) {
  const patientId = request.nextUrl.searchParams.get("patient_id");
  if (!patientId) return NextResponse.json({ success: false, data: null, error: { code: "INVALID_INPUT", message: "patient_id required" }, meta: {} }, { status: 400 });
  const db = getDb();
  const labs = db.prepare("SELECT * FROM lab_results WHERE patient_id = ? ORDER BY resulted_at DESC").all(patientId);
  return NextResponse.json({ success: true, data: labs, error: null, meta: {} });
}

export async function POST(request: Request) {
  const db = getDb();
  const body = await request.json();
  const { patient_id, test_name, value, unit, reference_low, reference_high, ordered_by } = body;
  if (!patient_id || !test_name || value === undefined) {
    return NextResponse.json({ success: false, data: null, error: { code: "INVALID_INPUT", message: "patient_id, test_name, value required" }, meta: {} }, { status: 400 });
  }

  // Auto-determine status
  let status = "normal";
  if (reference_low !== undefined && value < reference_low) status = "abnormal";
  if (reference_high !== undefined && value > reference_high) status = "abnormal";
  if (reference_low !== undefined && value < reference_low * 0.7) status = "critical";
  if (reference_high !== undefined && value > reference_high * 1.5) status = "critical";

  const id = `lab-${Date.now()}`;
  db.prepare("INSERT INTO lab_results (id, patient_id, test_name, value, unit, reference_low, reference_high, status, ordered_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
    .run(id, patient_id, test_name, value, unit ?? "", reference_low ?? null, reference_high ?? null, status, ordered_by ?? null);
  const saved = db.prepare("SELECT * FROM lab_results WHERE id = ?").get(id);
  return NextResponse.json({ success: true, data: saved, error: null, meta: {} }, { status: 201 });
}
