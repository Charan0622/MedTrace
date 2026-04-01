import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function POST(request: Request) {
  const db = getDb();
  const body = await request.json();
  const { patient_id, discharge_notes } = body;

  if (!patient_id) {
    return NextResponse.json({ success: false, data: null, error: { code: "INVALID_INPUT", message: "patient_id required" }, meta: {} }, { status: 400 });
  }

  const admission = db.prepare("SELECT * FROM admissions WHERE patient_id = ? AND status = 'admitted'").get(patient_id) as Record<string, unknown> | undefined;
  if (!admission) {
    return NextResponse.json({ success: false, data: null, error: { code: "NOT_ADMITTED", message: "Patient is not currently admitted" }, meta: {} }, { status: 400 });
  }

  const tx = db.transaction(() => {
    db.prepare("UPDATE admissions SET status = 'discharged', discharge_date = datetime('now'), notes = COALESCE(notes || ' | ', '') || ? WHERE id = ?")
      .run(discharge_notes ?? "Discharged", admission.id);

    db.prepare("UPDATE rooms SET status = 'available' WHERE id = ?").run(admission.room_id);

    // Mark all active medications as completed
    db.prepare("UPDATE patient_medications SET status = 'completed', end_date = date('now') WHERE patient_id = ? AND status = 'active'").run(patient_id);

    // Complete all pending instructions
    db.prepare("UPDATE doctor_instructions SET status = 'cancelled' WHERE patient_id = ? AND status IN ('pending', 'in_progress')").run(patient_id);
  });

  tx();
  return NextResponse.json({ success: true, data: { patient_id, status: "discharged" }, error: null, meta: {} });
}
