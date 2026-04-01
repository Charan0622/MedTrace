import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

// Full patient admission — creates patient + emergency contact + admission + doctor assignment
export async function POST(request: Request) {
  const db = getDb();
  const body = await request.json();
  const { patient, room_id, doctor_id, reason, diagnosis, emergency_contact, notes } = body;

  if (!patient?.name || !room_id || !doctor_id || !reason) {
    return NextResponse.json({ success: false, data: null, error: { code: "INVALID_INPUT", message: "patient name, room_id, doctor_id, and reason are required" }, meta: {} }, { status: 400 });
  }

  const tx = db.transaction(() => {
    // Create patient
    const patientId = `patient-${Date.now()}`;
    db.prepare("INSERT INTO patients (id, name, age, sex, date_of_birth, blood_group) VALUES (?, ?, ?, ?, ?, ?)")
      .run(patientId, patient.name, patient.age ?? 0, patient.sex ?? "Other", patient.date_of_birth ?? null, patient.blood_group ?? null);

    // Emergency contact
    if (emergency_contact?.name) {
      db.prepare("INSERT INTO emergency_contacts (id, patient_id, name, relationship, phone, alt_phone) VALUES (?, ?, ?, ?, ?, ?)")
        .run(`ec-${Date.now()}`, patientId, emergency_contact.name, emergency_contact.relationship ?? null, emergency_contact.phone ?? null, emergency_contact.alt_phone ?? null);
    }

    // Create admission
    db.prepare("INSERT INTO admissions (id, patient_id, room_id, admission_date, reason, diagnosis, status, admitted_by, notes) VALUES (?, ?, ?, datetime('now'), ?, ?, 'admitted', ?, ?)")
      .run(`adm-${Date.now()}`, patientId, room_id, reason, diagnosis ?? null, doctor_id, notes ?? null);

    // Update room status
    db.prepare("UPDATE rooms SET status = 'occupied' WHERE id = ?").run(room_id);

    // Assign primary doctor
    db.prepare("INSERT INTO doctor_assignments (id, patient_id, doctor_id, condition, assigned_date, is_primary, notes) VALUES (?, ?, ?, ?, date('now'), 1, 'Admitting physician')")
      .run(`da-${Date.now()}`, patientId, doctor_id, diagnosis ?? reason);

    return patientId;
  });

  const patientId = tx();
  const created = db.prepare("SELECT * FROM patients WHERE id = ?").get(patientId);

  return NextResponse.json({ success: true, data: created, error: null, meta: {} }, { status: 201 });
}
