import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

type Row = Record<string, unknown>;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const startTime = Date.now();
  const db = getDb();

  const patient = db.prepare("SELECT * FROM patients WHERE id = ?").get(id) as Row | undefined;
  if (!patient) {
    return NextResponse.json({ success: false, data: null, error: { code: "PATIENT_NOT_FOUND", message: `Patient ${id} not found` }, meta: {} }, { status: 404 });
  }

  const admission = db.prepare("SELECT a.*, r.room_number, r.floor, r.ward, r.room_type FROM admissions a LEFT JOIN rooms r ON r.id = a.room_id WHERE a.patient_id = ? AND a.status = 'admitted'").get(id) as Row | undefined;
  const ec = db.prepare("SELECT * FROM emergency_contacts WHERE patient_id = ?").get(id) as Row | undefined;
  const primaryDA = db.prepare("SELECT da.*, d.name as doctor_name, d.specialization, d.department, d.phone as doctor_phone FROM doctor_assignments da JOIN doctors d ON d.id = da.doctor_id WHERE da.patient_id = ? AND da.is_primary = 1").get(id) as Row | undefined;

  const medications = (db.prepare("SELECT pm.*, dr.name as drug_name, dr.generic_name, dr.drug_class FROM patient_medications pm JOIN drugs dr ON dr.id = pm.drug_id WHERE pm.patient_id = ?").all(id) as Row[]).map((r) => ({
    id: r.id, patient_id: r.patient_id, drug_id: r.drug_id, dose: r.dose, frequency: r.frequency, route: r.route,
    start_date: r.start_date, end_date: r.end_date, prescriber: r.prescriber, status: r.status, instructions: r.instructions, next_due: r.next_due,
    drug: { id: r.drug_id, name: r.drug_name, generic_name: r.generic_name, drug_class: r.drug_class },
  }));

  const conditions = (db.prepare("SELECT pc.*, c.name as condition_name, c.category, c.icd_code FROM patient_conditions pc JOIN conditions c ON c.id = pc.condition_id WHERE pc.patient_id = ?").all(id) as Row[]).map((r) => ({
    id: r.id, patient_id: r.patient_id, condition_id: r.condition_id, severity: r.severity, diagnosed_date: r.diagnosed_date,
    condition: { id: r.condition_id, name: r.condition_name, category: r.category, icd_code: r.icd_code },
  }));

  const genotypes = (db.prepare("SELECT pg.*, gv.gene, gv.variant, gv.type, gv.frequency FROM patient_genotypes pg JOIN gene_variants gv ON gv.id = pg.gene_variant_id WHERE pg.patient_id = ?").all(id) as Row[]).map((r) => ({
    id: r.id, patient_id: r.patient_id, gene_variant_id: r.gene_variant_id,
    gene_variant: { id: r.gene_variant_id, gene: r.gene, variant: r.variant, type: r.type, frequency: r.frequency },
  }));

  const vitalsHistory = db.prepare("SELECT * FROM vital_signs WHERE patient_id = ? ORDER BY recorded_at DESC").all(id) as Row[];

  return NextResponse.json({
    success: true,
    data: {
      ...patient,
      room: admission ? { id: admission.room_id, room_number: admission.room_number, floor: admission.floor, ward: admission.ward, room_type: admission.room_type } : undefined,
      admission: admission ? { id: admission.id, patient_id: admission.patient_id, room_id: admission.room_id, admission_date: admission.admission_date, discharge_date: admission.discharge_date, reason: admission.reason, diagnosis: admission.diagnosis, status: admission.status, notes: admission.notes } : undefined,
      emergency_contact: ec ?? undefined,
      assigned_doctor: primaryDA ? { id: primaryDA.doctor_id, name: primaryDA.doctor_name, specialization: primaryDA.specialization, department: primaryDA.department, phone: primaryDA.doctor_phone } : undefined,
      medications, conditions, genotypes,
      latest_vitals: vitalsHistory[0] ?? undefined,
      vitals_history: vitalsHistory,
    },
    error: null,
    meta: { query_time_ms: Date.now() - startTime, source: "sqlite" },
  });
}

// UPDATE patient
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();
  const body = await request.json();

  const existing = db.prepare("SELECT * FROM patients WHERE id = ?").get(id);
  if (!existing) {
    return NextResponse.json({ success: false, data: null, error: { code: "NOT_FOUND", message: "Patient not found" }, meta: {} }, { status: 404 });
  }

  db.prepare("UPDATE patients SET name = ?, age = ?, sex = ?, date_of_birth = ?, blood_group = ? WHERE id = ?")
    .run(body.name, body.age, body.sex, body.date_of_birth ?? null, body.blood_group ?? null, id);

  // Update emergency contact
  if (body.emergency_contact) {
    const ec = body.emergency_contact;
    const existingEC = db.prepare("SELECT * FROM emergency_contacts WHERE patient_id = ?").get(id);
    if (existingEC) {
      db.prepare("UPDATE emergency_contacts SET name = ?, relationship = ?, phone = ?, alt_phone = ? WHERE patient_id = ?")
        .run(ec.name, ec.relationship, ec.phone, ec.alt_phone ?? null, id);
    } else {
      db.prepare("INSERT INTO emergency_contacts (id, patient_id, name, relationship, phone, alt_phone) VALUES (?, ?, ?, ?, ?, ?)")
        .run(`ec-${Date.now()}`, id, ec.name, ec.relationship, ec.phone, ec.alt_phone ?? null);
    }
  }

  const updated = db.prepare("SELECT * FROM patients WHERE id = ?").get(id);
  return NextResponse.json({ success: true, data: updated, error: null, meta: {} });
}

// DELETE patient
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();

  const existing = db.prepare("SELECT * FROM patients WHERE id = ?").get(id);
  if (!existing) {
    return NextResponse.json({ success: false, data: null, error: { code: "NOT_FOUND", message: "Patient not found" }, meta: {} }, { status: 404 });
  }

  // Cascade delete handled by foreign keys
  db.prepare("DELETE FROM patients WHERE id = ?").run(id);
  return NextResponse.json({ success: true, data: { deleted: id }, error: null, meta: {} });
}
