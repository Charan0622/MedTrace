import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(request: NextRequest) {
  const patientId = request.nextUrl.searchParams.get("patient_id");
  if (!patientId) return NextResponse.json({ success: false, data: null, error: { code: "INVALID_INPUT", message: "patient_id required" }, meta: {} }, { status: 400 });
  const db = getDb();
  const allergies = db.prepare("SELECT * FROM allergies WHERE patient_id = ?").all(patientId);
  return NextResponse.json({ success: true, data: allergies, error: null, meta: {} });
}

export async function POST(request: Request) {
  const db = getDb();
  const body = await request.json();
  const { patient_id, allergen, allergen_type, reaction, severity, verified_by } = body;
  if (!patient_id || !allergen || !reaction) {
    return NextResponse.json({ success: false, data: null, error: { code: "INVALID_INPUT", message: "patient_id, allergen, reaction required" }, meta: {} }, { status: 400 });
  }
  const id = `alg-${Date.now()}`;
  db.prepare("INSERT INTO allergies (id, patient_id, allergen, allergen_type, reaction, severity, reported_date, verified_by) VALUES (?, ?, ?, ?, ?, ?, date('now'), ?)")
    .run(id, patient_id, allergen, allergen_type ?? "drug", reaction, severity ?? "moderate", verified_by ?? null);
  const saved = db.prepare("SELECT * FROM allergies WHERE id = ?").get(id);
  return NextResponse.json({ success: true, data: saved, error: null, meta: {} }, { status: 201 });
}

export async function DELETE(request: Request) {
  const db = getDb();
  const body = await request.json();
  const { id } = body;
  if (!id) return NextResponse.json({ success: false, data: null, error: { code: "INVALID_INPUT", message: "id required" }, meta: {} }, { status: 400 });
  db.prepare("DELETE FROM allergies WHERE id = ?").run(id);
  return NextResponse.json({ success: true, data: { deleted: id }, error: null, meta: {} });
}
