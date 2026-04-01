import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET() {
  const startTime = Date.now();
  const db = getDb();

  const patients = db.prepare(`
    SELECT p.*,
      r.room_number, r.floor, r.ward, r.room_type, r.status as room_status, r.id as room_id,
      a.id as admission_id, a.admission_date, a.reason as admission_reason, a.diagnosis, a.status as admission_status, a.notes as admission_notes,
      d.id as doctor_id, d.name as doctor_name, d.specialization, d.department as doctor_dept, d.phone as doctor_phone,
      ec.name as ec_name, ec.relationship as ec_relationship, ec.phone as ec_phone,
      (SELECT COUNT(*) FROM patient_medications WHERE patient_id = p.id AND status = 'active') as medication_count,
      (SELECT COUNT(*) FROM doctor_instructions WHERE patient_id = p.id AND status != 'completed' AND status != 'cancelled') as pending_instructions
    FROM patients p
    LEFT JOIN admissions a ON a.patient_id = p.id AND a.status = 'admitted'
    LEFT JOIN rooms r ON r.id = a.room_id
    LEFT JOIN doctor_assignments da ON da.patient_id = p.id AND da.is_primary = 1
    LEFT JOIN doctors d ON d.id = da.doctor_id
    LEFT JOIN emergency_contacts ec ON ec.patient_id = p.id
  `).all() as Record<string, unknown>[];

  const result = patients.map((row) => {
    const patientId = row.id as string;

    // Get latest vitals
    const latestVitals = db.prepare(
      "SELECT * FROM vital_signs WHERE patient_id = ? ORDER BY recorded_at DESC LIMIT 1"
    ).get(patientId) as Record<string, unknown> | undefined;

    // Get drug interaction alert count
    const drugIds = db.prepare(
      "SELECT drug_id FROM patient_medications WHERE patient_id = ? AND status = 'active'"
    ).all(patientId) as { drug_id: string }[];
    const ids = drugIds.map((d) => d.drug_id);

    let alertCount = 0;
    if (ids.length > 1) {
      const placeholders = ids.map(() => "?").join(",");
      alertCount = (db.prepare(
        `SELECT COUNT(*) as cnt FROM drug_interactions WHERE drug_a_id IN (${placeholders}) AND drug_b_id IN (${placeholders})`
      ).get(...ids, ...ids) as { cnt: number }).cnt;
    }

    return {
      id: patientId,
      name: row.name,
      age: row.age,
      sex: row.sex,
      date_of_birth: row.date_of_birth,
      blood_group: row.blood_group,
      room: row.room_id ? { id: row.room_id, room_number: row.room_number, floor: row.floor, ward: row.ward, room_type: row.room_type, status: row.room_status } : undefined,
      admission: row.admission_id ? { id: row.admission_id, admission_date: row.admission_date, reason: row.admission_reason, diagnosis: row.diagnosis, status: row.admission_status, notes: row.admission_notes } : undefined,
      doctor: row.doctor_id ? { id: row.doctor_id, name: row.doctor_name, specialization: row.specialization, department: row.doctor_dept, phone: row.doctor_phone } : undefined,
      emergency_contact: row.ec_name ? { name: row.ec_name, relationship: row.ec_relationship, phone: row.ec_phone } : undefined,
      latest_vitals: latestVitals ?? undefined,
      medication_count: row.medication_count,
      pending_instructions: row.pending_instructions,
      alert_count: alertCount,
    };
  });

  return NextResponse.json({
    success: true, data: result, error: null,
    meta: { ai_powered: false, query_time_ms: Date.now() - startTime, source: "sqlite" },
  });
}

export async function POST(request: Request) {
  const startTime = Date.now();
  const db = getDb();
  const body = await request.json();

  const id = `patient-${Date.now()}`;
  db.prepare(
    "INSERT INTO patients (id, name, age, sex, date_of_birth, blood_group) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(id, body.name, body.age, body.sex, body.date_of_birth ?? null, body.blood_group ?? null);

  const patient = db.prepare("SELECT * FROM patients WHERE id = ?").get(id);

  return NextResponse.json({
    success: true, data: patient, error: null,
    meta: { query_time_ms: Date.now() - startTime },
  });
}
