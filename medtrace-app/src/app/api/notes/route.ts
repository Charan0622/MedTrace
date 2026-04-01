import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(request: NextRequest) {
  const patientId = request.nextUrl.searchParams.get("patient_id");
  if (!patientId) {
    return NextResponse.json({ success: false, data: null, error: { code: "INVALID_INPUT", message: "patient_id required" }, meta: {} }, { status: 400 });
  }
  const db = getDb();
  const notes = db.prepare("SELECT * FROM nurse_notes WHERE patient_id = ? ORDER BY created_at DESC").all(patientId);
  return NextResponse.json({ success: true, data: notes, error: null, meta: {} });
}

export async function POST(request: Request) {
  const db = getDb();
  const body = await request.json();
  const { patient_id, author, note_type, content, shift } = body;
  if (!patient_id || !author || !content) {
    return NextResponse.json({ success: false, data: null, error: { code: "INVALID_INPUT", message: "patient_id, author, content required" }, meta: {} }, { status: 400 });
  }
  const id = `nn-${Date.now()}`;
  db.prepare("INSERT INTO nurse_notes (id, patient_id, author, note_type, content, shift) VALUES (?, ?, ?, ?, ?, ?)").run(id, patient_id, author, note_type ?? "observation", content, shift ?? "day");
  const saved = db.prepare("SELECT * FROM nurse_notes WHERE id = ?").get(id);
  return NextResponse.json({ success: true, data: saved, error: null, meta: {} });
}
