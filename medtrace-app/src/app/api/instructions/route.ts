import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(request: NextRequest) {
  const db = getDb();
  const patientId = request.nextUrl.searchParams.get("patient_id");

  const query = patientId
    ? "SELECT di.*, d.name as doctor_name, d.specialization, p.name as patient_name FROM doctor_instructions di LEFT JOIN doctors d ON d.id = di.doctor_id LEFT JOIN patients p ON p.id = di.patient_id WHERE di.patient_id = ? ORDER BY di.created_at DESC"
    : "SELECT di.*, d.name as doctor_name, d.specialization, p.name as patient_name, r.room_number FROM doctor_instructions di LEFT JOIN doctors d ON d.id = di.doctor_id LEFT JOIN patients p ON p.id = di.patient_id LEFT JOIN admissions a ON a.patient_id = p.id AND a.status = 'admitted' LEFT JOIN rooms r ON r.id = a.room_id ORDER BY CASE di.priority WHEN 'stat' THEN 0 WHEN 'urgent' THEN 1 ELSE 2 END, di.created_at DESC";

  const instructions = patientId ? db.prepare(query).all(patientId) : db.prepare(query).all();
  return NextResponse.json({ success: true, data: instructions, error: null, meta: {} });
}

export async function PATCH(request: Request) {
  const db = getDb();
  const body = await request.json();
  const { id, status, completed_by } = body;

  if (!id || !status) {
    return NextResponse.json({ success: false, data: null, error: { code: "INVALID_INPUT", message: "id and status required" }, meta: {} }, { status: 400 });
  }

  if (status === "completed") {
    db.prepare("UPDATE doctor_instructions SET status = ?, completed_at = datetime('now'), completed_by = ? WHERE id = ?").run(status, completed_by ?? null, id);
  } else {
    db.prepare("UPDATE doctor_instructions SET status = ? WHERE id = ?").run(status, id);
  }

  const updated = db.prepare("SELECT * FROM doctor_instructions WHERE id = ?").get(id);
  return NextResponse.json({ success: true, data: updated, error: null, meta: {} });
}
