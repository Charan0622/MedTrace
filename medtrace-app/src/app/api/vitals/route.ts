import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function POST(request: Request) {
  const startTime = Date.now();
  const db = getDb();
  const body = await request.json();

  const {
    patient_id, recorded_by,
    heart_rate, blood_pressure_sys, blood_pressure_dia,
    temperature, spo2, respiratory_rate,
    blood_sugar, weight, pain_level, notes,
  } = body;

  if (!patient_id || !recorded_by) {
    return NextResponse.json(
      { success: false, data: null, error: { code: "INVALID_INPUT", message: "patient_id and recorded_by are required" }, meta: {} },
      { status: 400 }
    );
  }

  const id = `v-${Date.now()}`;
  db.prepare(`
    INSERT INTO vital_signs (id, patient_id, recorded_at, recorded_by, heart_rate, blood_pressure_sys, blood_pressure_dia, temperature, spo2, respiratory_rate, blood_sugar, weight, pain_level, notes)
    VALUES (?, ?, datetime('now'), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, patient_id, recorded_by, heart_rate ?? null, blood_pressure_sys ?? null, blood_pressure_dia ?? null, temperature ?? null, spo2 ?? null, respiratory_rate ?? null, blood_sugar ?? null, weight ?? null, pain_level ?? null, notes ?? null);

  const saved = db.prepare("SELECT * FROM vital_signs WHERE id = ?").get(id);

  return NextResponse.json({
    success: true, data: saved, error: null,
    meta: { query_time_ms: Date.now() - startTime },
  });
}
