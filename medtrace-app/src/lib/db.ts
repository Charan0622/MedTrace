// ============================================================
// MedTrace — SQLite Database (zero-config, local persistence)
// Auto-creates tables and seeds on first run
// ============================================================

import Database from "better-sqlite3";
import path from "path";
import { logger } from "./logger";

const DB_PATH = path.join(process.cwd(), "medtrace.db");

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;

  _db = new Database(DB_PATH);
  _db.pragma("journal_mode = WAL");
  _db.pragma("foreign_keys = ON");

  // Check if tables exist
  const tableCheck = _db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='patients'").get();

  if (!tableCheck) {
    logger.info("First run — creating database tables and seeding data...");
    createTables(_db);
    seedData(_db);
    logger.info("Database ready.");
  } else {
    // Run migrations for new tables
    migrateIfNeeded(_db);
  }

  return _db;
}

function migrateIfNeeded(db: Database.Database) {
  const hasAllergies = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='allergies'").get();
  if (!hasAllergies) {
    logger.info("Migrating — adding allergies, nurse_notes, lab_results tables...");
    createNewTables(db);
    seedNewData(db);
  }
  const hasDrugInfo = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='drug_info'").get();
  if (!hasDrugInfo) {
    logger.info("Migrating — adding drug_info + drug_info_cache tables...");
    createDrugInfoTables(db);
    seedDrugInfo(db);
  }
  // Add password column to users if missing
  try { db.exec("ALTER TABLE users ADD COLUMN password TEXT DEFAULT ''"); } catch { /* column already exists */ }

  // Add more patients if only 4 exist
  const patientCount = (db.prepare("SELECT COUNT(*) as cnt FROM patients").get() as { cnt: number }).cnt;
  if (patientCount <= 4) {
    logger.info("Adding additional test patients...");
    seedMorePatients(db);
  }
}

function createTables(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('doctor', 'nurse', 'admin')),
      department TEXT,
      employee_id TEXT UNIQUE,
      email TEXT UNIQUE,
      password TEXT NOT NULL DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS rooms (
      id TEXT PRIMARY KEY,
      room_number TEXT UNIQUE NOT NULL,
      floor INTEGER,
      ward TEXT,
      bed_count INTEGER DEFAULT 1,
      room_type TEXT DEFAULT 'general',
      status TEXT DEFAULT 'available'
    );

    CREATE TABLE IF NOT EXISTS doctors (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      specialization TEXT,
      department TEXT,
      phone TEXT,
      employee_id TEXT UNIQUE
    );

    CREATE TABLE IF NOT EXISTS patients (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      age INTEGER NOT NULL,
      sex TEXT NOT NULL CHECK (sex IN ('M', 'F', 'Other')),
      date_of_birth TEXT,
      blood_group TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS emergency_contacts (
      id TEXT PRIMARY KEY,
      patient_id TEXT REFERENCES patients(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      relationship TEXT,
      phone TEXT,
      alt_phone TEXT
    );

    CREATE TABLE IF NOT EXISTS admissions (
      id TEXT PRIMARY KEY,
      patient_id TEXT REFERENCES patients(id) ON DELETE CASCADE,
      room_id TEXT REFERENCES rooms(id),
      admission_date TEXT,
      discharge_date TEXT,
      reason TEXT,
      diagnosis TEXT,
      status TEXT DEFAULT 'admitted',
      admitted_by TEXT,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS doctor_assignments (
      id TEXT PRIMARY KEY,
      patient_id TEXT REFERENCES patients(id) ON DELETE CASCADE,
      doctor_id TEXT REFERENCES doctors(id),
      condition TEXT,
      assigned_date TEXT,
      is_primary INTEGER DEFAULT 0,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS drugs (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      generic_name TEXT,
      drug_class TEXT,
      efficacy_score REAL
    );

    CREATE TABLE IF NOT EXISTS patient_medications (
      id TEXT PRIMARY KEY,
      patient_id TEXT REFERENCES patients(id) ON DELETE CASCADE,
      drug_id TEXT REFERENCES drugs(id),
      dose TEXT,
      frequency TEXT,
      route TEXT,
      start_date TEXT,
      end_date TEXT,
      prescriber TEXT,
      status TEXT DEFAULT 'active',
      instructions TEXT,
      next_due TEXT,
      UNIQUE(patient_id, drug_id)
    );

    CREATE TABLE IF NOT EXISTS vital_signs (
      id TEXT PRIMARY KEY,
      patient_id TEXT REFERENCES patients(id) ON DELETE CASCADE,
      recorded_at TEXT DEFAULT (datetime('now')),
      recorded_by TEXT,
      heart_rate REAL,
      blood_pressure_sys REAL,
      blood_pressure_dia REAL,
      temperature REAL,
      spo2 REAL,
      respiratory_rate REAL,
      blood_sugar REAL,
      weight REAL,
      pain_level INTEGER,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS doctor_instructions (
      id TEXT PRIMARY KEY,
      patient_id TEXT REFERENCES patients(id) ON DELETE CASCADE,
      doctor_id TEXT REFERENCES doctors(id),
      instruction TEXT NOT NULL,
      category TEXT,
      priority TEXT DEFAULT 'routine',
      created_at TEXT DEFAULT (datetime('now')),
      completed_at TEXT,
      completed_by TEXT,
      status TEXT DEFAULT 'pending'
    );

    CREATE TABLE IF NOT EXISTS medication_administration (
      id TEXT PRIMARY KEY,
      patient_id TEXT REFERENCES patients(id) ON DELETE CASCADE,
      medication_id TEXT REFERENCES patient_medications(id),
      administered_at TEXT DEFAULT (datetime('now')),
      administered_by TEXT,
      dose_given TEXT,
      status TEXT DEFAULT 'given',
      reason TEXT,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS drug_interactions (
      id TEXT PRIMARY KEY,
      drug_a_id TEXT REFERENCES drugs(id),
      drug_b_id TEXT REFERENCES drugs(id),
      severity INTEGER CHECK (severity BETWEEN 1 AND 10),
      mechanism TEXT,
      evidence_level TEXT,
      UNIQUE(drug_a_id, drug_b_id)
    );

    CREATE TABLE IF NOT EXISTS conditions (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      category TEXT,
      icd_code TEXT
    );

    CREATE TABLE IF NOT EXISTS patient_conditions (
      id TEXT PRIMARY KEY,
      patient_id TEXT REFERENCES patients(id) ON DELETE CASCADE,
      condition_id TEXT REFERENCES conditions(id),
      severity TEXT,
      diagnosed_date TEXT
    );

    CREATE TABLE IF NOT EXISTS enzymes (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      gene TEXT,
      function TEXT
    );

    CREATE TABLE IF NOT EXISTS drug_enzyme_effects (
      id TEXT PRIMARY KEY,
      drug_id TEXT REFERENCES drugs(id),
      enzyme_id TEXT REFERENCES enzymes(id),
      effect TEXT CHECK (effect IN ('inhibits', 'induces')),
      potency REAL
    );

    CREATE TABLE IF NOT EXISTS enzyme_metabolisms (
      id TEXT PRIMARY KEY,
      enzyme_id TEXT REFERENCES enzymes(id),
      drug_id TEXT REFERENCES drugs(id),
      rate TEXT
    );

    CREATE TABLE IF NOT EXISTS gene_variants (
      id TEXT PRIMARY KEY,
      gene TEXT NOT NULL,
      variant TEXT NOT NULL,
      type TEXT,
      frequency REAL
    );

    CREATE TABLE IF NOT EXISTS patient_genotypes (
      id TEXT PRIMARY KEY,
      patient_id TEXT REFERENCES patients(id) ON DELETE CASCADE,
      gene_variant_id TEXT REFERENCES gene_variants(id)
    );

    CREATE TABLE IF NOT EXISTS gene_enzyme_effects (
      id TEXT PRIMARY KEY,
      gene_variant_id TEXT REFERENCES gene_variants(id),
      enzyme_id TEXT REFERENCES enzymes(id),
      effect TEXT
    );

    CREATE TABLE IF NOT EXISTS drug_recalls (
      id TEXT PRIMARY KEY,
      drug_id TEXT REFERENCES drugs(id),
      manufacturer_id TEXT,
      recall_date TEXT,
      reason TEXT,
      fda_id TEXT
    );

    CREATE TABLE IF NOT EXISTS manufacturers (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      country TEXT
    );

    CREATE TABLE IF NOT EXISTS drug_treatments (
      id TEXT PRIMARY KEY,
      drug_id TEXT REFERENCES drugs(id),
      condition_id TEXT REFERENCES conditions(id)
    );

    CREATE TABLE IF NOT EXISTS drug_contraindications (
      id TEXT PRIMARY KEY,
      drug_id TEXT REFERENCES drugs(id),
      condition_id TEXT REFERENCES conditions(id),
      reason TEXT
    );

    -- Indexes
    CREATE INDEX IF NOT EXISTS idx_vitals_patient ON vital_signs(patient_id);
    CREATE INDEX IF NOT EXISTS idx_meds_patient ON patient_medications(patient_id);
    CREATE INDEX IF NOT EXISTS idx_admissions_patient ON admissions(patient_id);
    CREATE INDEX IF NOT EXISTS idx_instructions_patient ON doctor_instructions(patient_id);
    CREATE INDEX IF NOT EXISTS idx_med_admin_patient ON medication_administration(patient_id);
  `);

  createNewTables(db);
}

function createNewTables(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS allergies (
      id TEXT PRIMARY KEY,
      patient_id TEXT REFERENCES patients(id) ON DELETE CASCADE,
      allergen TEXT NOT NULL,
      allergen_type TEXT DEFAULT 'drug',
      reaction TEXT,
      severity TEXT DEFAULT 'moderate',
      reported_date TEXT,
      verified_by TEXT
    );

    CREATE TABLE IF NOT EXISTS nurse_notes (
      id TEXT PRIMARY KEY,
      patient_id TEXT REFERENCES patients(id) ON DELETE CASCADE,
      author TEXT NOT NULL,
      note_type TEXT DEFAULT 'observation',
      content TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      shift TEXT
    );

    CREATE TABLE IF NOT EXISTS lab_results (
      id TEXT PRIMARY KEY,
      patient_id TEXT REFERENCES patients(id) ON DELETE CASCADE,
      test_name TEXT NOT NULL,
      value REAL,
      unit TEXT,
      reference_low REAL,
      reference_high REAL,
      status TEXT DEFAULT 'normal',
      ordered_by TEXT,
      collected_at TEXT,
      resulted_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_allergies_patient ON allergies(patient_id);
    CREATE INDEX IF NOT EXISTS idx_notes_patient ON nurse_notes(patient_id);
    CREATE INDEX IF NOT EXISTS idx_labs_patient ON lab_results(patient_id);
  `);
}

function seedNewData(db: Database.Database) {
  const tx = db.transaction(() => {
    // Allergies
    const insertAllergy = db.prepare("INSERT OR IGNORE INTO allergies (id, patient_id, allergen, allergen_type, reaction, severity, reported_date, verified_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
    insertAllergy.run("alg-1", "patient-raj", "Penicillin", "drug", "Anaphylaxis", "severe", "2019-03-10", "Dr. Chen");
    insertAllergy.run("alg-2", "patient-raj", "Sulfonamides", "drug", "Rash, hives", "moderate", "2020-05-15", "Dr. Chen");
    insertAllergy.run("alg-3", "patient-john", "Codeine", "drug", "Nausea, vomiting", "moderate", "2021-09-20", "Dr. Brown");
    insertAllergy.run("alg-4", "patient-emma", "Latex", "environmental", "Contact dermatitis", "mild", "2022-01-10", "Dr. Park");
    insertAllergy.run("alg-5", "patient-emma", "Morphine", "drug", "Respiratory depression", "severe", "2023-04-15", "Dr. Park");

    // Nurse Notes
    const insertNote = db.prepare("INSERT OR IGNORE INTO nurse_notes (id, patient_id, author, note_type, content, created_at, shift) VALUES (?, ?, ?, ?, ?, ?, ?)");
    insertNote.run("nn-1", "patient-raj", "Ben Thompson", "assessment", "Patient alert and oriented x3. Irregular pulse noted on palpation. Skin warm, dry. Denies chest pain at this time. Continues to report mild epigastric discomfort.", "2026-03-31T06:15:00Z", "night");
    insertNote.run("nn-2", "patient-raj", "Ben Thompson", "intervention", "IV site right forearm checked — no redness, swelling, or tenderness. Flushed with NS. Rate adjusted per order.", "2026-03-31T07:00:00Z", "night");
    insertNote.run("nn-3", "patient-raj", "Amy Rodriguez", "observation", "Patient ambulated to bathroom with assistance. Steady gait, no SOB. Tolerated well. Blood sugar checked pre-lunch: 160 mg/dL — within target range.", "2026-03-31T11:30:00Z", "day");
    insertNote.run("nn-4", "patient-maria", "Amy Rodriguez", "assessment", "Patient in good spirits. Fasting blood sugar 210 — elevated. Reported compliance with diabetic diet. No complaints of polyuria or polydipsia. Feet inspected — no lesions, pulses palpable.", "2026-03-31T07:15:00Z", "day");
    insertNote.run("nn-5", "patient-maria", "Carol Singh", "communication", "Called Dr. Gupta regarding elevated fasting glucose. New order received: increase Metformin to 1000mg BID starting tomorrow. Patient educated on dietary modifications.", "2026-03-31T10:00:00Z", "day");
    insertNote.run("nn-6", "patient-john", "Carol Singh", "assessment", "Patient reports severe headache rated 6/10. BP remains elevated at 178/105. Restless in bed. Bed rest maintained. HOB elevated 30 degrees.", "2026-03-31T06:45:00Z", "night");
    insertNote.run("nn-7", "patient-john", "Amy Rodriguez", "intervention", "Ice pack applied to forehead per patient request. Lights dimmed. BP rechecked at 162/98 — trending down but still above target. Dr. Brown notified of reading.", "2026-03-31T12:15:00Z", "day");
    insertNote.run("nn-8", "patient-emma", "Amy Rodriguez", "assessment", "Patient reports joint pain 7/10 this morning, primarily bilateral knees and right hip. ROM limited. Administered Ibuprofen 400mg PO with breakfast per order.", "2026-03-31T07:45:00Z", "day");
    insertNote.run("nn-9", "patient-emma", "Carol Singh", "observation", "Pain reassessed 2h post-medication: reports improvement to 5/10. Able to perform ADLs with minimal assistance. Mood appears improved from yesterday.", "2026-03-31T13:15:00Z", "day");

    // Lab Results
    const insertLab = db.prepare("INSERT OR IGNORE INTO lab_results (id, patient_id, test_name, value, unit, reference_low, reference_high, status, ordered_by, collected_at, resulted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    // Raj Patel labs
    insertLab.run("lab-r1", "patient-raj", "INR", 2.4, "", 2.0, 3.0, "normal", "Dr. Chen", "2026-03-31T05:30:00Z", "2026-03-31T06:45:00Z");
    insertLab.run("lab-r2", "patient-raj", "Creatinine", 1.3, "mg/dL", 0.7, 1.3, "normal", "Dr. Chen", "2026-03-31T05:30:00Z", "2026-03-31T06:45:00Z");
    insertLab.run("lab-r3", "patient-raj", "Potassium", 4.8, "mEq/L", 3.5, 5.0, "normal", "Dr. Chen", "2026-03-31T05:30:00Z", "2026-03-31T06:45:00Z");
    insertLab.run("lab-r4", "patient-raj", "HbA1c", 7.8, "%", 4.0, 5.7, "abnormal", "Dr. Gupta", "2026-03-29T08:00:00Z", "2026-03-30T10:00:00Z");
    insertLab.run("lab-r5", "patient-raj", "BNP", 450, "pg/mL", 0, 100, "critical", "Dr. Chen", "2026-03-31T05:30:00Z", "2026-03-31T06:45:00Z");
    insertLab.run("lab-r6", "patient-raj", "Hemoglobin", 12.1, "g/dL", 13.5, 17.5, "abnormal", "Dr. Chen", "2026-03-31T05:30:00Z", "2026-03-31T06:45:00Z");
    // Maria Lopez labs
    insertLab.run("lab-m1", "patient-maria", "Fasting Glucose", 210, "mg/dL", 70, 100, "abnormal", "Dr. Gupta", "2026-03-31T06:00:00Z", "2026-03-31T07:00:00Z");
    insertLab.run("lab-m2", "patient-maria", "HbA1c", 8.2, "%", 4.0, 5.7, "abnormal", "Dr. Gupta", "2026-03-29T08:00:00Z", "2026-03-30T10:00:00Z");
    insertLab.run("lab-m3", "patient-maria", "TSH", 5.8, "mIU/L", 0.4, 4.0, "abnormal", "Dr. Adams", "2026-03-29T08:00:00Z", "2026-03-30T10:00:00Z");
    insertLab.run("lab-m4", "patient-maria", "Creatinine", 0.9, "mg/dL", 0.6, 1.1, "normal", "Dr. Gupta", "2026-03-31T06:00:00Z", "2026-03-31T07:00:00Z");
    // John Doe labs
    insertLab.run("lab-j1", "patient-john", "BUN", 28, "mg/dL", 7, 20, "abnormal", "Dr. Brown", "2026-03-31T06:00:00Z", "2026-03-31T07:00:00Z");
    insertLab.run("lab-j2", "patient-john", "Creatinine", 1.5, "mg/dL", 0.7, 1.3, "abnormal", "Dr. Brown", "2026-03-31T06:00:00Z", "2026-03-31T07:00:00Z");
    insertLab.run("lab-j3", "patient-john", "Troponin", 0.02, "ng/mL", 0, 0.04, "normal", "Dr. Brown", "2026-03-31T06:00:00Z", "2026-03-31T07:00:00Z");
    insertLab.run("lab-j4", "patient-john", "Total Cholesterol", 245, "mg/dL", 0, 200, "abnormal", "Dr. Brown", "2026-03-29T08:00:00Z", "2026-03-30T10:00:00Z");
    // Emma Wilson labs
    insertLab.run("lab-e1", "patient-emma", "CRP", 18.5, "mg/L", 0, 10, "abnormal", "Dr. Park", "2026-03-31T06:00:00Z", "2026-03-31T07:00:00Z");
    insertLab.run("lab-e2", "patient-emma", "ESR", 42, "mm/hr", 0, 20, "abnormal", "Dr. Park", "2026-03-31T06:00:00Z", "2026-03-31T07:00:00Z");
    insertLab.run("lab-e3", "patient-emma", "TSH", 6.1, "mIU/L", 0.4, 4.0, "abnormal", "Dr. Adams", "2026-03-29T08:00:00Z", "2026-03-30T10:00:00Z");
    insertLab.run("lab-e4", "patient-emma", "Hemoglobin", 11.8, "g/dL", 12.0, 16.0, "abnormal", "Dr. Park", "2026-03-31T06:00:00Z", "2026-03-31T07:00:00Z");
  });
  tx();
}

function seedData(db: Database.Database) {
  const tx = db.transaction(() => {
    // Users
    const insertUser = db.prepare("INSERT INTO users (id, name, role, department, employee_id, email, password) VALUES (?, ?, ?, ?, ?, ?, ?)");
    insertUser.run("user-doc-chen", "Dr. Sarah Chen", "doctor", "Cardiology", "DOC-1001", "s.chen@hospital.org", "medtrace123");
    insertUser.run("user-doc-park", "Dr. James Park", "doctor", "Psychiatry", "DOC-1002", "j.park@hospital.org", "medtrace123");
    insertUser.run("user-doc-gupta", "Dr. Priya Gupta", "doctor", "Endocrinology", "DOC-1003", "p.gupta@hospital.org", "medtrace123");
    insertUser.run("user-doc-brown", "Dr. Michael Brown", "doctor", "Internal Medicine", "DOC-1004", "m.brown@hospital.org", "medtrace123");
    insertUser.run("user-nurse-amy", "Amy Rodriguez", "nurse", "General Ward", "NUR-2001", "a.rodriguez@hospital.org", "medtrace123");
    insertUser.run("user-nurse-ben", "Ben Thompson", "nurse", "ICU", "NUR-2002", "b.thompson@hospital.org", "medtrace123");
    insertUser.run("user-nurse-carol", "Carol Singh", "nurse", "General Ward", "NUR-2003", "c.singh@hospital.org", "medtrace123");

    // Rooms
    const insertRoom = db.prepare("INSERT INTO rooms (id, room_number, floor, ward, bed_count, room_type, status) VALUES (?, ?, ?, ?, ?, ?, ?)");
    insertRoom.run("room-301a", "301-A", 3, "General Ward", 2, "semi-private", "occupied");
    insertRoom.run("room-302", "302", 3, "General Ward", 1, "private", "occupied");
    insertRoom.run("room-305", "305", 3, "General Ward", 2, "semi-private", "occupied");
    insertRoom.run("room-icu-1", "ICU-1", 2, "ICU", 1, "icu", "occupied");
    insertRoom.run("room-306", "306", 3, "General Ward", 1, "private", "available");
    insertRoom.run("room-307", "307", 3, "General Ward", 2, "general", "maintenance");

    // Doctors
    const insertDoc = db.prepare("INSERT INTO doctors (id, name, specialization, department, phone, employee_id) VALUES (?, ?, ?, ?, ?, ?)");
    insertDoc.run("doc-chen", "Dr. Sarah Chen", "Cardiology", "Cardiology", "555-0101", "DOC-1001");
    insertDoc.run("doc-park", "Dr. James Park", "Psychiatry", "Psychiatry", "555-0102", "DOC-1002");
    insertDoc.run("doc-gupta", "Dr. Priya Gupta", "Endocrinology", "Endocrinology", "555-0103", "DOC-1003");
    insertDoc.run("doc-brown", "Dr. Michael Brown", "Internal Medicine", "Internal Medicine", "555-0104", "DOC-1004");
    insertDoc.run("doc-adams", "Dr. Lisa Adams", "General Medicine", "General", "555-0105", "DOC-1005");
    insertDoc.run("doc-singh", "Dr. Raj Singh", "Gastroenterology", "GI", "555-0106", "DOC-1006");

    // Patients
    const insertPatient = db.prepare("INSERT INTO patients (id, name, age, sex, date_of_birth, blood_group) VALUES (?, ?, ?, ?, ?, ?)");
    insertPatient.run("patient-raj", "Raj Patel", 72, "M", "1954-03-15", "A+");
    insertPatient.run("patient-maria", "Maria Lopez", 54, "F", "1972-07-22", "O+");
    insertPatient.run("patient-john", "John Doe", 67, "M", "1959-11-08", "B-");
    insertPatient.run("patient-emma", "Emma Wilson", 41, "F", "1985-05-30", "AB+");

    // Emergency Contacts
    const insertEC = db.prepare("INSERT INTO emergency_contacts (id, patient_id, name, relationship, phone, alt_phone) VALUES (?, ?, ?, ?, ?, ?)");
    insertEC.run("ec-1", "patient-raj", "Anita Patel", "Wife", "555-1001", "555-1002");
    insertEC.run("ec-2", "patient-maria", "Carlos Lopez", "Husband", "555-2001", null);
    insertEC.run("ec-3", "patient-john", "Sarah Doe", "Daughter", "555-3001", "555-3002");
    insertEC.run("ec-4", "patient-emma", "Tom Wilson", "Husband", "555-4001", null);

    // Admissions
    const insertAdm = db.prepare("INSERT INTO admissions (id, patient_id, room_id, admission_date, discharge_date, reason, diagnosis, status, admitted_by, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    insertAdm.run("adm-1", "patient-raj", "room-icu-1", "2026-03-25T10:30:00Z", null, "Chest pain with irregular heartbeat", "Atrial fibrillation with rapid ventricular response", "admitted", "doc-chen", "History of polypharmacy. CYP2C9 poor metabolizer.");
    insertAdm.run("adm-2", "patient-maria", "room-302", "2026-03-28T14:00:00Z", null, "Routine monitoring for diabetes management", "Type 2 Diabetes — insulin adjustment needed", "admitted", "doc-gupta", "Stable. Adjusting Metformin dosage.");
    insertAdm.run("adm-3", "patient-john", "room-301a", "2026-03-27T08:00:00Z", null, "Severe hypertension — BP 190/110", "Hypertensive crisis, monitoring for end-organ damage", "admitted", "doc-brown", "CYP2C19 poor metabolizer.");
    insertAdm.run("adm-4", "patient-emma", "room-305", "2026-03-29T11:00:00Z", null, "Severe joint pain with suspected flare-up", "Osteoarthritis flare with depression management", "admitted", "doc-park", "CYP2D6 ultra-rapid metabolizer.");

    // Doctor Assignments
    const insertDA = db.prepare("INSERT INTO doctor_assignments (id, patient_id, doctor_id, condition, assigned_date, is_primary, notes) VALUES (?, ?, ?, ?, ?, ?, ?)");
    insertDA.run("da-1", "patient-raj", "doc-chen", "Atrial Fibrillation", "2026-03-25", 1, "Primary attending");
    insertDA.run("da-2", "patient-raj", "doc-gupta", "Type 2 Diabetes", "2026-03-25", 0, "Endocrine consult");
    insertDA.run("da-3", "patient-raj", "doc-park", "Depression", "2026-03-26", 0, "Psychiatric consult");
    insertDA.run("da-4", "patient-maria", "doc-gupta", "Type 2 Diabetes", "2026-03-28", 1, null);
    insertDA.run("da-5", "patient-maria", "doc-adams", "Hypothyroidism", "2026-03-28", 0, null);
    insertDA.run("da-6", "patient-john", "doc-brown", "Hypertension", "2026-03-27", 1, "Acute management");
    insertDA.run("da-7", "patient-john", "doc-singh", "GERD", "2026-03-27", 0, "GI consult");
    insertDA.run("da-8", "patient-emma", "doc-park", "Depression + Pain Management", "2026-03-29", 1, null);
    insertDA.run("da-9", "patient-emma", "doc-brown", "Hypertension", "2026-03-29", 0, null);

    // Drugs
    const insertDrug = db.prepare("INSERT INTO drugs (id, name, generic_name, drug_class, efficacy_score) VALUES (?, ?, ?, ?, ?)");
    for (const d of [
      ["drug-warfarin", "Warfarin", "Warfarin Sodium", "Anticoagulant", 0.85],
      ["drug-aspirin", "Aspirin", "Acetylsalicylic Acid", "NSAID/Antiplatelet", 0.78],
      ["drug-fluoxetine", "Fluoxetine", "Fluoxetine HCl", "SSRI", 0.82],
      ["drug-metoprolol", "Metoprolol", "Metoprolol Tartrate", "Beta-Blocker", 0.88],
      ["drug-omeprazole", "Omeprazole", "Omeprazole", "Proton Pump Inhibitor", 0.90],
      ["drug-simvastatin", "Simvastatin", "Simvastatin", "Statin", 0.87],
      ["drug-lisinopril", "Lisinopril", "Lisinopril", "ACE Inhibitor", 0.86],
      ["drug-metformin", "Metformin", "Metformin HCl", "Biguanide", 0.91],
      ["drug-amlodipine", "Amlodipine", "Amlodipine Besylate", "Calcium Channel Blocker", 0.84],
      ["drug-ibuprofen", "Ibuprofen", "Ibuprofen", "NSAID", 0.75],
      ["drug-acetaminophen", "Acetaminophen", "Paracetamol", "Analgesic", 0.72],
      ["drug-diclofenac-topical", "Topical Diclofenac", "Diclofenac Sodium Gel", "Topical NSAID", 0.68],
      ["drug-clopidogrel", "Clopidogrel", "Clopidogrel Bisulfate", "Antiplatelet", 0.83],
      ["drug-gabapentin", "Gabapentin", "Gabapentin", "Anticonvulsant", 0.76],
      ["drug-levothyroxine", "Levothyroxine", "Levothyroxine Sodium", "Thyroid Hormone", 0.92],
      ["drug-valsartan", "Valsartan", "Valsartan", "ARB", 0.85],
      ["drug-losartan", "Losartan", "Losartan Potassium", "ARB", 0.84],
    ] as const) {
      insertDrug.run(...d);
    }

    // Patient Medications (Raj - 9, Maria - 3, John - 5, Emma - 6)
    const insertMed = db.prepare("INSERT INTO patient_medications (id, patient_id, drug_id, dose, frequency, route, start_date, prescriber, status, instructions, next_due) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    insertMed.run("pm-1", "patient-raj", "drug-warfarin", "5mg", "Once daily at 18:00", "Oral", "2024-06-01", "Dr. Chen", "active", "Check INR before each dose. Hold if INR > 3.5", "2026-03-31T18:00:00Z");
    insertMed.run("pm-2", "patient-raj", "drug-aspirin", "81mg", "Once daily", "Oral", "2024-06-01", "Dr. Chen", "active", "Take with food", "2026-04-01T06:00:00Z");
    insertMed.run("pm-3", "patient-raj", "drug-fluoxetine", "20mg", "Once daily AM", "Oral", "2024-08-15", "Dr. Park", "active", null, "2026-04-01T06:00:00Z");
    insertMed.run("pm-4", "patient-raj", "drug-metoprolol", "50mg", "Twice daily", "Oral", "2024-03-10", "Dr. Chen", "active", "Check HR before giving. Hold if HR < 60", "2026-03-31T18:00:00Z");
    insertMed.run("pm-5", "patient-raj", "drug-omeprazole", "20mg", "Once daily before breakfast", "Oral", "2024-07-20", "Dr. Singh", "active", "30 min before first meal", "2026-04-01T06:00:00Z");
    insertMed.run("pm-6", "patient-raj", "drug-simvastatin", "40mg", "Once daily at bedtime", "Oral", "2024-01-05", "Dr. Chen", "active", null, "2026-03-31T21:00:00Z");
    insertMed.run("pm-7", "patient-raj", "drug-lisinopril", "10mg", "Once daily", "Oral", "2024-02-14", "Dr. Chen", "active", "Check BP before giving", "2026-04-01T06:00:00Z");
    insertMed.run("pm-8", "patient-raj", "drug-metformin", "500mg", "Twice daily with meals", "Oral", "2023-11-20", "Dr. Gupta", "active", "Give with meals", "2026-03-31T18:00:00Z");
    insertMed.run("pm-9", "patient-raj", "drug-amlodipine", "5mg", "Once daily", "Oral", "2024-04-01", "Dr. Chen", "active", null, "2026-04-01T06:00:00Z");
    insertMed.run("pm-10", "patient-maria", "drug-levothyroxine", "75mcg", "Once daily empty stomach", "Oral", "2024-01-10", "Dr. Adams", "active", "30-60 min before breakfast", "2026-04-01T06:00:00Z");
    insertMed.run("pm-11", "patient-maria", "drug-metformin", "500mg", "Once daily with dinner", "Oral", "2024-03-05", "Dr. Gupta", "active", "Increasing to 1000mg BID", "2026-03-31T18:00:00Z");
    insertMed.run("pm-12", "patient-maria", "drug-lisinopril", "5mg", "Once daily", "Oral", "2024-05-15", "Dr. Adams", "active", null, "2026-04-01T06:00:00Z");
    insertMed.run("pm-13", "patient-john", "drug-metoprolol", "100mg", "Twice daily", "Oral", "2023-09-01", "Dr. Brown", "active", "Hold if HR < 55 or SBP < 100", "2026-03-31T18:00:00Z");
    insertMed.run("pm-14", "patient-john", "drug-simvastatin", "20mg", "Once daily at bedtime", "Oral", "2023-10-15", "Dr. Brown", "active", null, "2026-03-31T21:00:00Z");
    insertMed.run("pm-15", "patient-john", "drug-clopidogrel", "75mg", "Once daily", "Oral", "2024-01-20", "Dr. Brown", "active", "Do not give with omeprazole", "2026-04-01T06:00:00Z");
    insertMed.run("pm-16", "patient-john", "drug-omeprazole", "40mg", "Once daily", "Oral", "2024-02-01", "Dr. Singh", "active", "CAUTION: Interacts with clopidogrel", "2026-04-01T06:00:00Z");
    insertMed.run("pm-17", "patient-john", "drug-lisinopril", "20mg", "Once daily", "Oral", "2023-08-10", "Dr. Brown", "active", null, "2026-04-01T06:00:00Z");
    insertMed.run("pm-18", "patient-emma", "drug-fluoxetine", "40mg", "Once daily AM", "Oral", "2024-04-01", "Dr. Park", "active", "CYP2D6 ultra-rapid — monitor efficacy", "2026-04-01T06:00:00Z");
    insertMed.run("pm-19", "patient-emma", "drug-gabapentin", "300mg", "Three times daily", "Oral", "2024-05-10", "Dr. Park", "active", null, "2026-03-31T18:00:00Z");
    insertMed.run("pm-20", "patient-emma", "drug-omeprazole", "20mg", "Once daily before breakfast", "Oral", "2024-06-01", "Dr. Singh", "active", null, "2026-04-01T06:00:00Z");
    insertMed.run("pm-21", "patient-emma", "drug-ibuprofen", "400mg", "Every 6 hours as needed", "Oral", "2024-07-15", "Dr. Park", "active", "Max 1600mg/day. Give with food.", "2026-03-31T14:15:00Z");
    insertMed.run("pm-22", "patient-emma", "drug-levothyroxine", "50mcg", "Once daily AM empty stomach", "Oral", "2023-12-01", "Dr. Adams", "active", null, "2026-04-01T06:00:00Z");
    insertMed.run("pm-23", "patient-emma", "drug-amlodipine", "2.5mg", "Once daily", "Oral", "2024-08-01", "Dr. Brown", "active", null, "2026-04-01T06:00:00Z");

    // Vitals
    const insertVital = db.prepare("INSERT INTO vital_signs (id, patient_id, recorded_at, recorded_by, heart_rate, blood_pressure_sys, blood_pressure_dia, temperature, spo2, respiratory_rate, blood_sugar, weight, pain_level, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    insertVital.run("v-r1", "patient-raj", "2026-03-31T06:00:00Z", "Ben Thompson", 112, 145, 88, 99.1, 94, 22, 185, 78, 4, "HR elevated, irregular rhythm noted");
    insertVital.run("v-r2", "patient-raj", "2026-03-31T10:00:00Z", "Ben Thompson", 105, 138, 85, 98.8, 95, 20, 172, 78, 3, "Slight improvement after medication");
    insertVital.run("v-r3", "patient-raj", "2026-03-31T14:00:00Z", "Amy Rodriguez", 98, 132, 82, 98.6, 96, 18, 160, 78, 2, "Stable, rhythm improving");
    insertVital.run("v-m1", "patient-maria", "2026-03-31T07:00:00Z", "Amy Rodriguez", 72, 125, 78, 98.4, 98, 16, 210, 68, 0, "Fasting blood sugar elevated");
    insertVital.run("v-m2", "patient-maria", "2026-03-31T12:00:00Z", "Carol Singh", 75, 122, 76, 98.6, 99, 15, 165, 68, 0, "Post-meal sugar still elevated");
    insertVital.run("v-j1", "patient-john", "2026-03-31T06:30:00Z", "Carol Singh", 88, 178, 105, 98.9, 96, 19, 130, 85, 6, "Headache reported, BP still high");
    insertVital.run("v-j2", "patient-john", "2026-03-31T12:00:00Z", "Amy Rodriguez", 82, 162, 98, 98.6, 97, 17, 125, 85, 4, "BP reducing slowly with meds");
    insertVital.run("v-e1", "patient-emma", "2026-03-31T07:30:00Z", "Amy Rodriguez", 78, 135, 85, 98.5, 98, 16, 95, 62, 7, "Joint pain severe this morning");
    insertVital.run("v-e2", "patient-emma", "2026-03-31T13:00:00Z", "Carol Singh", 74, 128, 80, 98.4, 99, 15, 92, 62, 5, "Pain reduced after medication");

    // Doctor Instructions
    const insertIns = db.prepare("INSERT INTO doctor_instructions (id, patient_id, doctor_id, instruction, category, priority, created_at, completed_at, completed_by, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    insertIns.run("ins-1", "patient-raj", "doc-chen", "Monitor heart rhythm every 2 hours. Report any HR > 120 or new arrhythmia immediately.", "monitoring", "urgent", "2026-03-31T08:00:00Z", null, null, "in_progress");
    insertIns.run("ins-2", "patient-raj", "doc-chen", "Administer Warfarin 5mg at 18:00. Check INR before administration.", "medication", "urgent", "2026-03-31T08:00:00Z", null, null, "pending");
    insertIns.run("ins-3", "patient-raj", "doc-gupta", "Check blood sugar before meals and at bedtime. Target: 140-180 mg/dL.", "monitoring", "routine", "2026-03-31T09:00:00Z", null, null, "in_progress");
    insertIns.run("ins-4", "patient-raj", "doc-chen", "Restrict fluid intake to 1500mL/day.", "diet", "routine", "2026-03-25T10:00:00Z", null, null, "in_progress");
    insertIns.run("ins-5", "patient-maria", "doc-gupta", "Adjust Metformin to 1000mg twice daily starting tomorrow.", "medication", "routine", "2026-03-31T10:00:00Z", null, null, "pending");
    insertIns.run("ins-6", "patient-maria", "doc-gupta", "Diabetic diet — no added sugars. Monitor blood sugar QID.", "diet", "routine", "2026-03-28T14:00:00Z", null, null, "in_progress");
    insertIns.run("ins-7", "patient-john", "doc-brown", "BP check every 1 hour until < 150/90. Call if not responding to meds.", "monitoring", "stat", "2026-03-31T07:00:00Z", null, null, "in_progress");
    insertIns.run("ins-8", "patient-john", "doc-brown", "Bed rest — no ambulation until BP stabilized.", "activity", "urgent", "2026-03-27T08:00:00Z", null, null, "in_progress");
    insertIns.run("ins-9", "patient-emma", "doc-park", "Administer Ibuprofen 400mg every 6h for pain. Do not exceed 1600mg/day.", "medication", "routine", "2026-03-31T08:00:00Z", "2026-03-31T08:15:00Z", "Amy Rodriguez", "completed");
    insertIns.run("ins-10", "patient-emma", "doc-park", "Assess pain level every 4 hours. Report if pain > 8/10.", "monitoring", "routine", "2026-03-29T11:00:00Z", null, null, "in_progress");

    // Drug Interactions
    const insertDI = db.prepare("INSERT INTO drug_interactions (id, drug_a_id, drug_b_id, severity, mechanism, evidence_level) VALUES (?, ?, ?, ?, ?, ?)");
    insertDI.run("di-1", "drug-warfarin", "drug-aspirin", 8, "Additive anticoagulant effect — increased bleeding risk", "High");
    insertDI.run("di-2", "drug-warfarin", "drug-fluoxetine", 7, "SSRI inhibits platelet aggregation, potentiating warfarin", "Moderate");
    insertDI.run("di-3", "drug-warfarin", "drug-omeprazole", 5, "CYP2C19 competition may alter warfarin metabolism", "Moderate");
    insertDI.run("di-4", "drug-simvastatin", "drug-amlodipine", 6, "Amlodipine inhibits CYP3A4, increasing simvastatin levels", "High");
    insertDI.run("di-5", "drug-clopidogrel", "drug-omeprazole", 7, "Omeprazole inhibits CYP2C19, reducing clopidogrel activation", "High");
    insertDI.run("di-6", "drug-fluoxetine", "drug-metoprolol", 6, "Fluoxetine inhibits CYP2D6, increasing metoprolol levels", "High");
    insertDI.run("di-7", "drug-ibuprofen", "drug-warfarin", 9, "NSAID + anticoagulant — high GI bleeding risk", "High");
    insertDI.run("di-8", "drug-ibuprofen", "drug-aspirin", 7, "Ibuprofen blocks aspirin antiplatelet effect", "High");
    insertDI.run("di-9", "drug-ibuprofen", "drug-lisinopril", 5, "NSAIDs reduce ACE inhibitor efficacy", "High");

    // Conditions
    const insertCond = db.prepare("INSERT INTO conditions (id, name, category, icd_code) VALUES (?, ?, ?, ?)");
    insertCond.run("cond-afib", "Atrial Fibrillation", "Cardiovascular", "I48.91");
    insertCond.run("cond-hypertension", "Hypertension", "Cardiovascular", "I10");
    insertCond.run("cond-t2d", "Type 2 Diabetes", "Endocrine", "E11.9");
    insertCond.run("cond-depression", "Major Depression", "Psychiatric", "F33.1");
    insertCond.run("cond-gerd", "GERD", "Gastrointestinal", "K21.0");
    insertCond.run("cond-osteoarthritis", "Osteoarthritis", "Musculoskeletal", "M19.90");
    insertCond.run("cond-hyperlipidemia", "Hyperlipidemia", "Metabolic", "E78.5");
    insertCond.run("cond-hypothyroid", "Hypothyroidism", "Endocrine", "E03.9");

    // Patient Conditions
    const insertPC = db.prepare("INSERT INTO patient_conditions (id, patient_id, condition_id, severity, diagnosed_date) VALUES (?, ?, ?, ?, ?)");
    insertPC.run("pc-1", "patient-raj", "cond-afib", "moderate", "2022-03-15");
    insertPC.run("pc-2", "patient-raj", "cond-hypertension", "moderate", "2019-06-20");
    insertPC.run("pc-3", "patient-raj", "cond-t2d", "mild", "2020-11-01");
    insertPC.run("pc-4", "patient-raj", "cond-depression", "mild", "2024-07-01");
    insertPC.run("pc-5", "patient-raj", "cond-gerd", "moderate", "2023-05-10");
    insertPC.run("pc-6", "patient-raj", "cond-hyperlipidemia", "moderate", "2018-09-15");
    insertPC.run("pc-7", "patient-maria", "cond-hypothyroid", "mild", "2023-01-10");
    insertPC.run("pc-8", "patient-maria", "cond-t2d", "mild", "2023-12-05");
    insertPC.run("pc-9", "patient-maria", "cond-hypertension", "mild", "2024-04-20");
    insertPC.run("pc-10", "patient-john", "cond-hypertension", "severe", "2018-05-01");
    insertPC.run("pc-11", "patient-john", "cond-hyperlipidemia", "moderate", "2019-03-15");
    insertPC.run("pc-12", "patient-john", "cond-gerd", "mild", "2023-08-01");
    insertPC.run("pc-13", "patient-emma", "cond-depression", "moderate", "2023-06-15");
    insertPC.run("pc-14", "patient-emma", "cond-hypothyroid", "mild", "2023-11-01");
    insertPC.run("pc-15", "patient-emma", "cond-osteoarthritis", "moderate", "2024-02-10");
    insertPC.run("pc-16", "patient-emma", "cond-gerd", "mild", "2024-05-20");
    insertPC.run("pc-17", "patient-emma", "cond-hypertension", "mild", "2024-07-01");

    // Medication Administration Log
    const insertMA = db.prepare("INSERT INTO medication_administration (id, patient_id, medication_id, administered_at, administered_by, dose_given, status, reason, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
    insertMA.run("ma-1", "patient-raj", "pm-1", "2026-03-31T06:00:00Z", "Ben Thompson", "5mg", "given", null, "INR checked: 2.4");
    insertMA.run("ma-2", "patient-raj", "pm-4", "2026-03-31T06:00:00Z", "Ben Thompson", "50mg", "given", null, null);
    insertMA.run("ma-3", "patient-raj", "pm-8", "2026-03-31T07:00:00Z", "Ben Thompson", "500mg", "given", null, "Given with breakfast");
    insertMA.run("ma-4", "patient-maria", "pm-10", "2026-03-31T06:00:00Z", "Amy Rodriguez", "75mcg", "given", null, "Empty stomach");
    insertMA.run("ma-5", "patient-john", "pm-16", "2026-03-31T06:00:00Z", "Carol Singh", "40mg", "held", "Omeprazole may reduce clopidogrel efficacy — awaiting doctor confirmation", "Notified Dr. Brown");

    // Enzymes, gene data etc.
    const insertEnz = db.prepare("INSERT INTO enzymes (id, name, gene, function) VALUES (?, ?, ?, ?)");
    insertEnz.run("enz-cyp2c9", "CYP2C9", "CYP2C9", "Metabolizes warfarin, NSAIDs");
    insertEnz.run("enz-cyp2d6", "CYP2D6", "CYP2D6", "Metabolizes beta-blockers, SSRIs");
    insertEnz.run("enz-cyp3a4", "CYP3A4", "CYP3A4", "Major drug metabolizer");
    insertEnz.run("enz-cyp2c19", "CYP2C19", "CYP2C19", "Metabolizes PPIs, clopidogrel");

    const insertGV = db.prepare("INSERT INTO gene_variants (id, gene, variant, type, frequency) VALUES (?, ?, ?, ?, ?)");
    insertGV.run("gv-cyp2c9-pm", "CYP2C9", "*2/*3", "poor_metabolizer", 0.03);
    insertGV.run("gv-cyp2d6-um", "CYP2D6", "*1/*1xN", "ultra_rapid", 0.05);
    insertGV.run("gv-cyp2c19-pm", "CYP2C19", "*2/*2", "poor_metabolizer", 0.02);

    const insertPG = db.prepare("INSERT INTO patient_genotypes (id, patient_id, gene_variant_id) VALUES (?, ?, ?)");
    insertPG.run("pg-1", "patient-raj", "gv-cyp2c9-pm");
    insertPG.run("pg-2", "patient-john", "gv-cyp2c19-pm");
    insertPG.run("pg-3", "patient-emma", "gv-cyp2d6-um");
  });

  tx();
  seedNewData(db);
  createDrugInfoTables(db);
  seedDrugInfo(db);
  seedMorePatients(db);
}

function createDrugInfoTables(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS drug_info (
      id TEXT PRIMARY KEY,
      drug_id TEXT REFERENCES drugs(id),
      drug_name TEXT NOT NULL,
      generic_name TEXT,
      drug_class TEXT,
      mechanism_of_action TEXT,
      indications TEXT,
      contraindications TEXT,
      side_effects TEXT,
      serious_adverse_reactions TEXT,
      dosage_info TEXT,
      interactions_summary TEXT,
      pregnancy_category TEXT,
      half_life TEXT,
      route_of_administration TEXT,
      fda_label_url TEXT,
      openfda_id TEXT,
      source TEXT DEFAULT 'curated',
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS drug_info_cache (
      id TEXT PRIMARY KEY,
      drug_name TEXT NOT NULL,
      query_hash TEXT UNIQUE,
      ai_summary TEXT NOT NULL,
      ai_model TEXT,
      context_used TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      expires_at TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_drug_info_name ON drug_info(drug_name);
    CREATE INDEX IF NOT EXISTS idx_drug_info_cache_hash ON drug_info_cache(query_hash);
  `);
}

function seedDrugInfo(db: Database.Database) {
  const insert = db.prepare(`INSERT OR IGNORE INTO drug_info (id, drug_id, drug_name, generic_name, drug_class, mechanism_of_action, indications, contraindications, side_effects, serious_adverse_reactions, dosage_info, interactions_summary, pregnancy_category, half_life, route_of_administration, source) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'curated')`);

  const drugs = [
    ["di-warfarin", "drug-warfarin", "Warfarin", "Warfarin Sodium", "Anticoagulant (Vitamin K Antagonist)",
      "Inhibits vitamin K epoxide reductase (VKORC1), preventing the recycling of vitamin K needed for synthesis of clotting factors II, VII, IX, and X. This reduces the blood's ability to form clots.",
      "Prevention and treatment of venous thromboembolism (DVT, PE); prevention of stroke in atrial fibrillation; mechanical heart valve prophylaxis; post-myocardial infarction",
      "Active bleeding; hemorrhagic tendencies; recent surgery on CNS/eye; pregnancy (Category X — causes birth defects); unsupervised patients with high fall risk; severe hepatic disease",
      "Bruising, minor bleeding, nausea, diarrhea, skin necrosis (rare), hair loss, purple toe syndrome",
      "Major hemorrhage (GI, intracranial); skin/tissue necrosis; cholesterol embolization syndrome; calciphylaxis",
      "Typical: 2-5mg daily, adjusted by INR. Target INR 2.0-3.0 for most indications; 2.5-3.5 for mechanical valves. Loading dose not recommended in elderly.",
      "MAJOR: NSAIDs (bleeding risk), aspirin, fluoxetine (platelet inhibition), amiodarone, fluconazole, metronidazole (increase effect). CYP2C9 substrates compete for metabolism. Vitamin K rich foods reduce effect.",
      "X", "20-60 hours (mean 40h)", "Oral"],

    ["di-aspirin", "drug-aspirin", "Aspirin", "Acetylsalicylic Acid", "NSAID / Antiplatelet",
      "Irreversibly inhibits cyclooxygenase-1 (COX-1) and COX-2 enzymes. At low doses (81-325mg), primarily inhibits thromboxane A2 synthesis in platelets, preventing platelet aggregation. At higher doses, also inhibits prostaglandin synthesis providing anti-inflammatory effects.",
      "Low-dose: cardiovascular prevention (secondary prevention of MI, stroke), acute coronary syndrome. High-dose: pain relief, fever reduction, anti-inflammatory for rheumatic conditions",
      "Active peptic ulcer; aspirin/NSAID allergy or asthma triad; children with viral infections (Reye syndrome risk); severe hepatic impairment; last trimester pregnancy",
      "GI irritation, heartburn, nausea, tinnitus (at high doses), easy bruising, prolonged bleeding time",
      "GI hemorrhage; hemorrhagic stroke; Reye syndrome (children); anaphylaxis; severe bronchospasm in aspirin-sensitive asthma",
      "Antiplatelet: 81mg daily. Analgesic: 325-650mg every 4-6h (max 4g/day). Acute MI: 162-325mg chewed immediately.",
      "Warfarin (increased bleeding), ibuprofen (blocks antiplatelet effect), ACE inhibitors (reduced efficacy), methotrexate (increased toxicity), SSRIs (bleeding risk)",
      "D", "15-20 minutes (acetylsalicylic acid); platelet effect lasts 7-10 days", "Oral"],

    ["di-fluoxetine", "drug-fluoxetine", "Fluoxetine", "Fluoxetine Hydrochloride", "Selective Serotonin Reuptake Inhibitor (SSRI)",
      "Selectively inhibits the reuptake of serotonin (5-HT) at the presynaptic neuronal membrane by blocking the serotonin transporter (SERT). This increases serotonin concentration in the synaptic cleft, enhancing serotonergic neurotransmission.",
      "Major depressive disorder; obsessive-compulsive disorder (OCD); bulimia nervosa; panic disorder; premenstrual dysphoric disorder (PMDD); treatment-resistant depression (with olanzapine)",
      "Concurrent MAO inhibitor use (or within 14 days); concurrent pimozide or thioridazine; hypersensitivity to fluoxetine",
      "Nausea, headache, insomnia, drowsiness, anxiety, tremor, decreased appetite, sexual dysfunction (decreased libido, anorgasmia), dry mouth, diarrhea",
      "Serotonin syndrome (with MAOIs/serotonergic drugs); suicidal ideation (especially ages 18-24); QT prolongation; hyponatremia (SIADH); abnormal bleeding; mania/hypomania activation",
      "Depression: Start 20mg/day, may increase after weeks. Max 80mg/day. OCD: 20-60mg/day. Bulimia: 60mg/day. Elderly: start 10mg/day.",
      "MAOIs (serotonin syndrome — FATAL), warfarin (increased bleeding), metoprolol/propranolol (CYP2D6 inhibition increases beta-blocker levels), NSAIDs (bleeding), tramadol, triptans",
      "C", "1-3 days (fluoxetine); 4-16 days (norfluoxetine active metabolite)", "Oral"],

    ["di-metoprolol", "drug-metoprolol", "Metoprolol", "Metoprolol Tartrate / Succinate", "Beta-1 Selective Adrenergic Blocker",
      "Selectively blocks beta-1 adrenergic receptors in cardiac tissue, reducing heart rate, myocardial contractility, and cardiac output. Decreases renin release from kidneys. At higher doses, may also block beta-2 receptors.",
      "Hypertension; angina pectoris; heart failure (succinate ER); acute MI; rate control in atrial fibrillation/flutter; migraine prophylaxis",
      "Sinus bradycardia (HR <45); heart block greater than first degree; cardiogenic shock; decompensated heart failure; sick sinus syndrome without pacemaker; severe peripheral arterial disease; pheochromocytoma (without alpha-blockade)",
      "Fatigue, dizziness, bradycardia, hypotension, cold extremities, depression, GI upset, exercise intolerance, weight gain",
      "Severe bradycardia; heart block; cardiogenic shock; bronchospasm (high doses); masking of hypoglycemia symptoms in diabetics",
      "Tartrate: 25-100mg BID. Succinate ER: 25-200mg daily. Heart failure: start 12.5-25mg, titrate slowly over weeks. Always check HR and BP before administration.",
      "Fluoxetine/paroxetine (CYP2D6 inhibition — increased metoprolol levels), verapamil/diltiazem (additive bradycardia), clonidine (rebound hypertension if metoprolol stopped first), insulin (masks hypoglycemia)",
      "C", "3-7 hours (tartrate); ~extended with succinate", "Oral, IV"],

    ["di-omeprazole", "drug-omeprazole", "Omeprazole", "Omeprazole", "Proton Pump Inhibitor (PPI)",
      "Irreversibly inhibits the hydrogen/potassium ATPase enzyme system (proton pump) on the parietal cell surface of the stomach. This blocks the final step of gastric acid production, reducing both basal and stimulated acid secretion by up to 95%.",
      "GERD (erosive and non-erosive); peptic ulcer disease; H. pylori eradication (with antibiotics); Zollinger-Ellison syndrome; stress ulcer prophylaxis in ICU; NSAID-induced ulcer prevention",
      "Hypersensitivity to PPIs; concurrent rilpivirine (reduced absorption); concurrent high-dose methotrexate",
      "Headache, diarrhea, nausea, abdominal pain, flatulence, dizziness, vitamin B12 deficiency (long-term), hypomagnesemia (long-term)",
      "C. difficile infection; bone fractures (long-term use); hypomagnesemia (severe); vitamin B12 deficiency; acute interstitial nephritis; fundic gland polyps",
      "GERD: 20mg daily for 4-8 weeks. Maintenance: 20mg daily. Ulcer: 20-40mg daily. H. pylori: 20mg BID with antibiotics for 10-14 days. Take 30-60 minutes before meals.",
      "CRITICAL: Clopidogrel (CYP2C19 inhibition reduces clopidogrel activation — avoid combination). Also affects: methotrexate, warfarin, diazepam, phenytoin, tacrolimus",
      "C", "0.5-1 hour (but acid suppression lasts 72+ hours due to irreversible binding)", "Oral, IV"],

    ["di-simvastatin", "drug-simvastatin", "Simvastatin", "Simvastatin", "HMG-CoA Reductase Inhibitor (Statin)",
      "Inhibits 3-hydroxy-3-methylglutaryl coenzyme A (HMG-CoA) reductase, the rate-limiting enzyme in hepatic cholesterol synthesis. This reduces intracellular cholesterol, upregulates LDL receptors, and increases LDL clearance from plasma. Also reduces triglycerides and modestly increases HDL.",
      "Hyperlipidemia; mixed dyslipidemia; hypertriglyceridemia; primary prevention of cardiovascular events; secondary prevention post-MI/stroke",
      "Active liver disease or unexplained persistent transaminase elevations; pregnancy and lactation (Category X); concurrent strong CYP3A4 inhibitors (itraconazole, ketoconazole, HIV protease inhibitors)",
      "Myalgia (muscle pain), headache, GI upset, elevated liver enzymes, insomnia",
      "Rhabdomyolysis (muscle breakdown — risk increases with dose >40mg and drug interactions); hepatotoxicity; myopathy; new-onset diabetes; hemorrhagic stroke (rare)",
      "Start 10-20mg at bedtime. Usual: 20-40mg daily. Max: 40mg (80mg only for patients already tolerating it). IMPORTANT: Do not exceed 20mg daily with amlodipine, diltiazem, or verapamil.",
      "Amlodipine/diltiazem (CYP3A4 — increased simvastatin, max 20mg), grapefruit juice (CYP3A4), gemfibrozil (rhabdomyolysis risk), warfarin (increased INR), amiodarone (max simvastatin 20mg)",
      "X", "2-3 hours", "Oral (take at bedtime)"],

    ["di-lisinopril", "drug-lisinopril", "Lisinopril", "Lisinopril", "Angiotensin-Converting Enzyme (ACE) Inhibitor",
      "Inhibits ACE, preventing conversion of angiotensin I to angiotensin II (a potent vasoconstrictor). This reduces aldosterone secretion, decreases peripheral vascular resistance, and lowers blood pressure. Also reduces cardiac remodeling post-MI.",
      "Hypertension; heart failure (adjunctive); post-acute MI (hemodynamically stable); diabetic nephropathy",
      "History of angioedema (ACE inhibitor or hereditary); bilateral renal artery stenosis; concurrent aliskiren in diabetics; pregnancy (Category D — fetal renal damage)",
      "Dry cough (10-15%), dizziness, headache, fatigue, hyperkalemia, hypotension (first dose), elevated creatinine",
      "Angioedema (can be life-threatening — more common in Black patients); severe hypotension; acute renal failure; hyperkalemia; neutropenia/agranulocytosis (rare)",
      "Hypertension: start 10mg daily, usual 20-40mg daily. Heart failure: start 2.5-5mg daily, target 20-40mg. Post-MI: start 5mg within 24h, then 10mg.",
      "Potassium supplements/sparing diuretics (hyperkalemia), NSAIDs (reduced efficacy + nephrotoxicity), lithium (increased levels), aliskiren (contraindicated in diabetes)",
      "D", "12 hours", "Oral"],

    ["di-metformin", "drug-metformin", "Metformin", "Metformin Hydrochloride", "Biguanide (Antidiabetic)",
      "Decreases hepatic glucose production (gluconeogenesis), decreases intestinal glucose absorption, and improves insulin sensitivity by increasing peripheral glucose uptake and utilization. Does NOT stimulate insulin secretion — does not cause hypoglycemia as monotherapy.",
      "Type 2 diabetes mellitus (first-line therapy); prediabetes (off-label); polycystic ovary syndrome (off-label); prevention of type 2 diabetes",
      "Severe renal impairment (eGFR <30); metabolic acidosis including diabetic ketoacidosis; radiologic contrast procedures (hold 48h); conditions predisposing to lactic acidosis (shock, sepsis, acute HF, severe hepatic impairment)",
      "GI effects (diarrhea, nausea, abdominal cramping, bloating) — common initially, often resolve. Metallic taste, vitamin B12 deficiency (long-term)",
      "Lactic acidosis (rare but potentially fatal — risk with renal impairment, liver disease, excess alcohol, dehydration); vitamin B12 deficiency (monitor periodically)",
      "Start 500mg once or twice daily with meals. Increase by 500mg weekly as tolerated. Usual: 1000mg BID. Max: 2550mg/day. ER: 500-2000mg daily with evening meal.",
      "Alcohol (lactic acidosis risk), iodinated contrast (hold metformin), carbonic anhydrase inhibitors, cimetidine (increases metformin levels)",
      "B", "6.2 hours (plasma), longer in erythrocytes", "Oral (take with meals)"],

    ["di-amlodipine", "drug-amlodipine", "Amlodipine", "Amlodipine Besylate", "Dihydropyridine Calcium Channel Blocker",
      "Inhibits calcium ion influx through L-type calcium channels in vascular smooth muscle and cardiac muscle. Primarily affects vascular smooth muscle, causing arterial vasodilation and reduced peripheral vascular resistance.",
      "Hypertension; chronic stable angina; vasospastic (Prinzmetal) angina; coronary artery disease (reduce risk of hospitalization for angina)",
      "Severe hypotension; severe aortic stenosis; hypersensitivity to dihydropyridine CCBs; cardiogenic shock",
      "Peripheral edema (dose-dependent, up to 10%), dizziness, flushing, headache, fatigue, palpitations, nausea",
      "Severe hypotension; worsening angina or MI at initiation (rare); hepatic injury",
      "Hypertension: start 5mg daily, max 10mg. Elderly/hepatic impairment: start 2.5mg. Angina: 5-10mg daily.",
      "Simvastatin (limit to 20mg simvastatin — CYP3A4 inhibition increases statin levels and rhabdomyolysis risk), cyclosporine (increased levels), strong CYP3A4 inhibitors (increased amlodipine)",
      "C", "30-50 hours", "Oral"],

    ["di-ibuprofen", "drug-ibuprofen", "Ibuprofen", "Ibuprofen", "Non-Steroidal Anti-Inflammatory Drug (NSAID)",
      "Non-selectively inhibits cyclooxygenase-1 (COX-1) and COX-2 enzymes, reducing prostaglandin synthesis. This provides anti-inflammatory, analgesic, and antipyretic effects. COX-1 inhibition also reduces gastric mucosal protection and platelet function.",
      "Pain (mild to moderate); fever; inflammatory conditions (rheumatoid arthritis, osteoarthritis); dysmenorrhea; headache/migraine; dental pain; patent ductus arteriosus (IV, neonates)",
      "Active GI bleeding or ulceration; aspirin triad (asthma, urticaria, rhinitis with NSAIDs); perioperative pain in CABG surgery; severe renal impairment; third trimester pregnancy; history of NSAID-induced asthma",
      "GI upset (nausea, dyspepsia, abdominal pain, diarrhea), headache, dizziness, rash, fluid retention, elevated blood pressure",
      "GI hemorrhage/perforation; cardiovascular events (MI, stroke — especially with prolonged use); acute renal failure; severe skin reactions (SJS, TEN); anaphylaxis; aseptic meningitis",
      "Pain/fever: 200-400mg every 4-6h (max 1200mg OTC, 3200mg Rx/day). Arthritis: 400-800mg TID-QID. Take with food to reduce GI effects.",
      "CRITICAL with Warfarin (GI bleeding), blocks Aspirin antiplatelet effect (take aspirin 30min before ibuprofen), ACE inhibitors/ARBs (reduced efficacy, nephrotoxicity), lithium (increased levels), methotrexate (increased toxicity)",
      "C (D in 3rd trimester)", "2-4 hours", "Oral"],

    ["di-acetaminophen", "drug-acetaminophen", "Acetaminophen", "Paracetamol (Acetaminophen)", "Analgesic / Antipyretic",
      "Exact mechanism not fully understood. Believed to inhibit COX enzymes centrally (brain) rather than peripherally, reducing prostaglandin synthesis in the CNS. May also activate descending serotonergic inhibitory pain pathways and interact with the endocannabinoid system.",
      "Mild to moderate pain; fever reduction; osteoarthritis; headache; post-surgical pain. Preferred analgesic when NSAIDs are contraindicated (GI bleeding, renal impairment, anticoagulant use).",
      "Severe hepatic impairment or active liver disease; known hypersensitivity",
      "Generally well tolerated at recommended doses. Rare: nausea, rash, allergic reactions",
      "Hepatotoxicity (MAJOR risk in overdose or chronic use >4g/day); acute liver failure; severe skin reactions (SJS, TEN, AGEP — very rare); anaphylaxis",
      "Adults: 325-1000mg every 4-6h. Max 4000mg/day (many guidelines recommend max 3000mg, especially in elderly or liver disease). Do not exceed 2000mg/day with chronic alcohol use.",
      "Warfarin (modest INR increase at high doses), alcohol (hepatotoxicity risk), isoniazid (hepatotoxicity), carbamazepine/phenytoin (increased toxic metabolite formation)",
      "B", "2-3 hours (may be prolonged in liver disease)", "Oral, IV, Rectal"],

    ["di-clopidogrel", "drug-clopidogrel", "Clopidogrel", "Clopidogrel Bisulfate", "Thienopyridine Antiplatelet Agent",
      "Prodrug that is metabolized by hepatic CYP enzymes (primarily CYP2C19) to an active metabolite. This active metabolite irreversibly binds to the P2Y12 ADP receptor on platelets, inhibiting ADP-mediated platelet activation and aggregation for the platelet's lifetime (7-10 days).",
      "Acute coronary syndrome (with aspirin); recent MI or stroke; peripheral arterial disease; coronary stent placement (dual antiplatelet therapy with aspirin)",
      "Active pathological bleeding (GI, intracranial); hypersensitivity to clopidogrel",
      "Bleeding, bruising, GI upset, headache, dizziness, rash, pruritus",
      "Major hemorrhage (GI, intracranial); thrombotic thrombocytopenic purpura (TTP — rare but serious); neutropenia",
      "Loading: 300-600mg once. Maintenance: 75mg daily. ACS: 75mg daily with aspirin for 12 months post-stent. CYP2C19 poor metabolizers may need alternative (prasugrel, ticagrelor).",
      "CRITICAL: Omeprazole/esomeprazole (CYP2C19 inhibition reduces activation — use pantoprazole instead). NSAIDs (bleeding), warfarin (bleeding), repaglinide (CYP2C8 interaction)",
      "B", "~6 hours (parent); active metabolite binds irreversibly", "Oral"],

    ["di-gabapentin", "drug-gabapentin", "Gabapentin", "Gabapentin", "Anticonvulsant / Gabapentinoid",
      "Binds to the alpha-2-delta subunit of voltage-gated calcium channels in the CNS, reducing calcium influx and subsequent release of excitatory neurotransmitters. Despite structural similarity to GABA, does not bind GABA receptors or affect GABA metabolism.",
      "Epilepsy (adjunctive for partial seizures); postherpetic neuralgia; neuropathic pain (off-label); restless legs syndrome (off-label); fibromyalgia (off-label); anxiety (off-label)",
      "Hypersensitivity to gabapentin. Use caution in renal impairment (dose adjustment required).",
      "Somnolence, dizziness, ataxia, fatigue, peripheral edema, weight gain, nystagmus, tremor, blurred vision",
      "Suicidal behavior/ideation; respiratory depression (especially with opioids or in COPD/elderly); DRESS syndrome; anaphylaxis; withdrawal seizures if stopped abruptly",
      "Neuropathic pain: start 100-300mg at bedtime, titrate to 300-600mg TID. Max 3600mg/day. Epilepsy: 300-600mg TID. Renal dosing required (CrCl-based). Taper when discontinuing.",
      "Opioids (respiratory depression — FDA boxed warning consideration), antacids (reduce absorption — take 2h apart), alcohol/CNS depressants (additive sedation)",
      "C", "5-7 hours", "Oral"],

    ["di-levothyroxine", "drug-levothyroxine", "Levothyroxine", "Levothyroxine Sodium", "Thyroid Hormone (T4)",
      "Synthetic form of thyroxine (T4), identical to the natural hormone produced by the thyroid gland. Converted peripherally to triiodothyronine (T3), the active form. T3 binds nuclear receptors and regulates gene expression controlling metabolic rate, growth, development, and protein synthesis.",
      "Hypothyroidism (primary, secondary, tertiary); TSH suppression in thyroid cancer; myxedema coma (IV); congenital hypothyroidism",
      "Uncorrected adrenal insufficiency (can precipitate adrenal crisis); acute MI (relative); thyrotoxicosis; hypersensitivity to inactive ingredients",
      "Usually well tolerated at correct dose. Overdose symptoms: palpitations, tachycardia, tremor, anxiety, insomnia, weight loss, diarrhea, heat intolerance",
      "Angina, MI, or arrhythmias (if overreplaced, especially in elderly/cardiac patients); bone loss with chronic overreplacement; seizures (rare, in initiation)",
      "Start 25-50mcg daily (12.5-25mcg in elderly/cardiac). Adjust by 12.5-25mcg every 6-8 weeks based on TSH. Usual: 1.6mcg/kg/day. Take on empty stomach 30-60 min before breakfast.",
      "Calcium, iron, aluminum antacids (reduce absorption — separate by 4h), warfarin (increased sensitivity), estrogens (may increase dose requirement), bile acid sequestrants (reduce absorption)",
      "A", "6-7 days", "Oral, IV"],

    ["di-valsartan", "drug-valsartan", "Valsartan", "Valsartan", "Angiotensin II Receptor Blocker (ARB)",
      "Selectively blocks the angiotensin II type 1 (AT1) receptor, preventing angiotensin II from causing vasoconstriction, aldosterone release, and sympathetic activation. Unlike ACE inhibitors, does not affect bradykinin metabolism (no cough).",
      "Hypertension; heart failure (NYHA II-IV); post-myocardial infarction with LV dysfunction",
      "Bilateral renal artery stenosis; pregnancy (Category D); concurrent aliskiren in diabetics; hypersensitivity to ARBs; severe hepatic impairment",
      "Dizziness, hypotension, hyperkalemia, headache, fatigue, diarrhea, elevated creatinine, back pain",
      "Acute renal failure; hyperkalemia; hypotension (especially volume-depleted); angioedema (less common than ACE inhibitors); hepatotoxicity",
      "Hypertension: 80-160mg daily, max 320mg. Heart failure: start 40mg BID, target 160mg BID. Post-MI: start 20mg BID, titrate to 160mg BID.",
      "ACE inhibitors (dual RAAS blockade — increased renal/hyperkalemia risk), potassium supplements, NSAIDs (reduced efficacy, renal risk), lithium (increased levels)",
      "D", "6-9 hours", "Oral"],

    ["di-losartan", "drug-losartan", "Losartan", "Losartan Potassium", "Angiotensin II Receptor Blocker (ARB)",
      "Blocks angiotensin II AT1 receptors. Unique among ARBs: also has uricosuric properties (lowers uric acid). Its active metabolite (EXP-3174) is 10-40x more potent than losartan itself and is formed via CYP2C9 and CYP3A4 metabolism.",
      "Hypertension; diabetic nephropathy (type 2 diabetes with proteinuria); stroke risk reduction in hypertensive patients with LVH",
      "Pregnancy (Category D); concurrent aliskiren in diabetics; hypersensitivity",
      "Dizziness, upper respiratory infection, diarrhea, fatigue, hypoglycemia (in diabetics), back pain, cough (less than ACE inhibitors)",
      "Angioedema; acute renal failure; hyperkalemia; rhabdomyolysis (rare); hepatic injury",
      "Hypertension: start 50mg daily (25mg if volume-depleted), max 100mg daily. Nephropathy: 50mg daily, increase to 100mg. Stroke prevention: 50-100mg daily.",
      "Fluconazole (CYP2C9 inhibition increases losartan), rifampin (CYP induction decreases effect), potassium supplements, NSAIDs, lithium",
      "D", "2 hours (losartan); 6-9 hours (active metabolite)", "Oral"],

    ["di-diclofenac-topical", "drug-diclofenac-topical", "Topical Diclofenac", "Diclofenac Sodium Gel", "Topical NSAID",
      "Same COX-1/COX-2 inhibition as oral NSAIDs but delivered topically, providing local anti-inflammatory and analgesic effects with minimal systemic absorption (typically <10% of oral equivalent dose).",
      "Osteoarthritis of joints amenable to topical treatment (knees, hands); actinic keratosis (3% gel); minor strains/sprains",
      "Application to non-intact skin, wounds, or infections; known NSAID allergy; perioperative CABG pain; third trimester pregnancy",
      "Application site reactions (dermatitis, pruritus, dry skin, redness); minimal systemic effects compared to oral NSAIDs",
      "Rare systemic NSAID effects possible with extensive use; severe skin reactions; hepatic effects (if significant absorption)",
      "OA: Apply 4g to affected joint QID (lower extremity) or 2g QID (upper extremity). Do not apply to more than 2 joints simultaneously. Wash hands after application.",
      "Minimal systemic interactions due to low absorption. Theoretical: other topical products at same site, oral NSAIDs (additive if absorbed), anticoagulants (minimal risk)",
      "C (D in 3rd trimester)", "1-2 hours (in skin); minimal systemic half-life", "Topical"],
  ];

  const tx = db.transaction(() => {
    for (const d of drugs) {
      insert.run(...d);
    }
  });
  tx();
}

function seedMorePatients(db: Database.Database) {
  const tx = db.transaction(() => {
    // New patients
    const ip = db.prepare("INSERT OR IGNORE INTO patients (id, name, age, sex, date_of_birth, blood_group) VALUES (?, ?, ?, ?, ?, ?)");
    ip.run("patient-anita", "Anita Sharma", 58, "F", "1968-09-12", "B+");
    ip.run("patient-david", "David Chen", 45, "M", "1981-04-03", "A-");
    ip.run("patient-grace", "Grace Okafor", 33, "F", "1993-01-28", "O-");
    ip.run("patient-harold", "Harold Williams", 78, "M", "1948-06-17", "AB+");

    // Emergency contacts
    const iec = db.prepare("INSERT OR IGNORE INTO emergency_contacts (id, patient_id, name, relationship, phone) VALUES (?, ?, ?, ?, ?)");
    iec.run("ec-5", "patient-anita", "Vikram Sharma", "Husband", "555-5001");
    iec.run("ec-6", "patient-david", "Lisa Chen", "Wife", "555-6001");
    iec.run("ec-7", "patient-grace", "Amara Okafor", "Mother", "555-7001");
    iec.run("ec-8", "patient-harold", "Nancy Williams", "Daughter", "555-8001");

    // New rooms
    db.prepare("INSERT OR IGNORE INTO rooms (id, room_number, floor, ward, bed_count, room_type, status) VALUES (?, ?, ?, ?, ?, ?, ?)").run("room-308", "308", 3, "General Ward", 2, "semi-private", "occupied");
    db.prepare("INSERT OR IGNORE INTO rooms (id, room_number, floor, ward, bed_count, room_type, status) VALUES (?, ?, ?, ?, ?, ?, ?)").run("room-icu-2", "ICU-2", 2, "ICU", 1, "icu", "occupied");
    db.prepare("INSERT OR IGNORE INTO rooms (id, room_number, floor, ward, bed_count, room_type, status) VALUES (?, ?, ?, ?, ?, ?, ?)").run("room-309", "309", 3, "General Ward", 1, "private", "occupied");
    db.prepare("INSERT OR IGNORE INTO rooms (id, room_number, floor, ward, bed_count, room_type, status) VALUES (?, ?, ?, ?, ?, ?, ?)").run("room-310", "310", 3, "General Ward", 2, "semi-private", "occupied");

    // Admissions
    const ia = db.prepare("INSERT OR IGNORE INTO admissions (id, patient_id, room_id, admission_date, reason, diagnosis, status, admitted_by, notes) VALUES (?, ?, ?, ?, ?, ?, 'admitted', ?, ?)");
    ia.run("adm-5", "patient-anita", "room-308", "2026-03-29T09:00:00Z", "Uncontrolled blood sugar with diabetic ketoacidosis symptoms", "DKA — Type 2 Diabetes decompensation, CKD Stage 3", "doc-gupta", "HbA1c 10.2%. Chronic kidney disease — dose-adjust renally cleared drugs. Insulin drip started in ER.");
    ia.run("adm-6", "patient-david", "room-309", "2026-03-30T16:00:00Z", "Severe anxiety attack with chest pain — rule out MI", "Generalized anxiety disorder, rule out acute coronary syndrome", "doc-park", "Troponin negative x2. ECG normal sinus. History of panic disorder. Recently lost job — psychosocial stressor.");
    ia.run("adm-7", "patient-grace", "room-310", "2026-03-30T22:00:00Z", "Seizure activity — new onset, found unconscious at home", "New-onset epilepsy, pending MRI. Post-ictal state resolved.", "doc-brown", "First seizure. No prior history. Pregnant — 14 weeks. All meds must be pregnancy-safe.");
    ia.run("adm-8", "patient-harold", "room-icu-2", "2026-03-28T06:00:00Z", "Acute exacerbation of COPD with pneumonia", "COPD exacerbation, community-acquired pneumonia, Type 2 respiratory failure", "doc-chen", "On BiPAP. Heavy smoker 40 pack-years. CHF history. DNR/DNI discussed — patient wants full code.");

    // Doctor assignments
    const ida = db.prepare("INSERT OR IGNORE INTO doctor_assignments (id, patient_id, doctor_id, condition, assigned_date, is_primary, notes) VALUES (?, ?, ?, ?, ?, ?, ?)");
    ida.run("da-10", "patient-anita", "doc-gupta", "DKA / Diabetes", "2026-03-29", 1, "Primary");
    ida.run("da-11", "patient-anita", "doc-brown", "CKD Stage 3", "2026-03-29", 0, "Nephrology consult");
    ida.run("da-12", "patient-david", "doc-park", "Anxiety / R/O ACS", "2026-03-30", 1, null);
    ida.run("da-13", "patient-david", "doc-chen", "Cardiac clearance", "2026-03-30", 0, "Cardiology consult");
    ida.run("da-14", "patient-grace", "doc-brown", "Seizure workup", "2026-03-30", 1, "Neurology pending");
    ida.run("da-15", "patient-harold", "doc-chen", "COPD / Pneumonia", "2026-03-28", 1, "Critical care");
    ida.run("da-16", "patient-harold", "doc-singh", "GI prophylaxis", "2026-03-28", 0, null);

    // New drugs (common hospital drugs not in original set)
    const idrug = db.prepare("INSERT OR IGNORE INTO drugs (id, name, generic_name, drug_class, efficacy_score) VALUES (?, ?, ?, ?, ?)");
    idrug.run("drug-insulin-lispro", "Insulin Lispro", "Insulin Lispro", "Rapid-Acting Insulin", 0.93);
    idrug.run("drug-lorazepam", "Lorazepam", "Lorazepam", "Benzodiazepine", 0.80);
    idrug.run("drug-levetiracetam", "Levetiracetam", "Levetiracetam", "Anticonvulsant", 0.88);
    idrug.run("drug-albuterol", "Albuterol", "Albuterol Sulfate", "Short-Acting Beta Agonist", 0.91);
    idrug.run("drug-prednisone", "Prednisone", "Prednisone", "Corticosteroid", 0.85);
    idrug.run("drug-azithromycin", "Azithromycin", "Azithromycin", "Macrolide Antibiotic", 0.87);
    idrug.run("drug-heparin", "Heparin", "Heparin Sodium", "Anticoagulant", 0.90);
    idrug.run("drug-furosemide", "Furosemide", "Furosemide", "Loop Diuretic", 0.88);
    idrug.run("drug-sertraline", "Sertraline", "Sertraline HCl", "SSRI", 0.84);
    idrug.run("drug-folic-acid", "Folic Acid", "Folic Acid", "Vitamin", 0.95);
    idrug.run("drug-pantoprazole", "Pantoprazole", "Pantoprazole Sodium", "Proton Pump Inhibitor", 0.89);
    idrug.run("drug-tiotropium", "Tiotropium", "Tiotropium Bromide", "Long-Acting Anticholinergic", 0.86);

    // Patient medications
    const im = db.prepare("INSERT OR IGNORE INTO patient_medications (id, patient_id, drug_id, dose, frequency, route, start_date, prescriber, status, instructions, next_due) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)");
    // Anita — DKA patient
    im.run("pm-30", "patient-anita", "drug-insulin-lispro", "Sliding scale", "Before meals + bedtime", "Subcutaneous", "2026-03-29", "Dr. Gupta", "Check blood sugar before each dose. See sliding scale chart.", "2026-03-31T18:00:00Z");
    im.run("pm-31", "patient-anita", "drug-metformin", "500mg", "Twice daily with meals", "Oral", "2026-03-29", "Dr. Gupta", "HOLD if creatinine > 1.5. Currently CKD3 — monitor closely.", "2026-03-31T18:00:00Z");
    im.run("pm-32", "patient-anita", "drug-lisinopril", "5mg", "Once daily", "Oral", "2026-03-29", "Dr. Brown", "Renal protection. Monitor potassium.", "2026-04-01T06:00:00Z");
    im.run("pm-33", "patient-anita", "drug-furosemide", "20mg", "Once daily AM", "Oral", "2026-03-29", "Dr. Brown", "Monitor daily weight. I&O.", "2026-04-01T06:00:00Z");
    // David — Anxiety + R/O ACS
    im.run("pm-34", "patient-david", "drug-lorazepam", "0.5mg", "Every 8 hours as needed", "Oral", "2026-03-30", "Dr. Park", "For acute anxiety. Max 3 doses/day. Monitor sedation.", "2026-03-31T22:00:00Z");
    im.run("pm-35", "patient-david", "drug-sertraline", "50mg", "Once daily AM", "Oral", "2026-03-30", "Dr. Park", "Starting dose. Monitor for activation in first 2 weeks.", "2026-04-01T06:00:00Z");
    im.run("pm-36", "patient-david", "drug-pantoprazole", "40mg", "Once daily before breakfast", "Oral", "2026-03-30", "Dr. Park", "Stress ulcer prophylaxis.", "2026-04-01T06:00:00Z");
    // Grace — Seizure + Pregnant
    im.run("pm-37", "patient-grace", "drug-levetiracetam", "500mg", "Twice daily", "Oral", "2026-03-30", "Dr. Brown", "PREGNANCY SAFE. Titrate to 1000mg BID if seizures recur.", "2026-03-31T18:00:00Z");
    im.run("pm-38", "patient-grace", "drug-folic-acid", "4mg", "Once daily", "Oral", "2026-03-30", "Dr. Brown", "High-dose folic acid — anticonvulsant + pregnancy.", "2026-04-01T06:00:00Z");
    im.run("pm-39", "patient-grace", "drug-levothyroxine", "75mcg", "Once daily AM empty stomach", "Oral", "2026-03-30", "Dr. Adams", "Existing hypothyroidism. Separate from prenatal vitamins by 4h.", "2026-04-01T06:00:00Z");
    // Harold — COPD + Pneumonia ICU
    im.run("pm-40", "patient-harold", "drug-azithromycin", "500mg", "Once daily", "IV", "2026-03-28", "Dr. Chen", "Day 3 of 5. Switch to PO when tolerating.", "2026-04-01T06:00:00Z");
    im.run("pm-41", "patient-harold", "drug-prednisone", "40mg", "Once daily", "Oral", "2026-03-28", "Dr. Chen", "5-day burst for COPD. Check blood sugar — steroids raise glucose.", "2026-04-01T06:00:00Z");
    im.run("pm-42", "patient-harold", "drug-albuterol", "2.5mg", "Every 4 hours + PRN", "Nebulizer", "2026-03-28", "Dr. Chen", "Standing Q4H plus PRN for SOB. Monitor HR after nebs.", "2026-03-31T18:00:00Z");
    im.run("pm-43", "patient-harold", "drug-tiotropium", "18mcg", "Once daily", "Inhaled", "2026-03-28", "Dr. Chen", "Long-acting maintenance. Give in AM.", "2026-04-01T06:00:00Z");
    im.run("pm-44", "patient-harold", "drug-heparin", "5000 units", "Every 8 hours", "Subcutaneous", "2026-03-28", "Dr. Chen", "DVT prophylaxis. Hold if platelets < 100K.", "2026-03-31T18:00:00Z");
    im.run("pm-45", "patient-harold", "drug-furosemide", "40mg", "Twice daily", "IV", "2026-03-28", "Dr. Chen", "Fluid overload. Strict I&O. Daily weights.", "2026-03-31T18:00:00Z");
    im.run("pm-46", "patient-harold", "drug-pantoprazole", "40mg", "Once daily", "IV", "2026-03-28", "Dr. Singh", "Stress ulcer prophylaxis. On steroids.", "2026-04-01T06:00:00Z");

    // Conditions
    const ic = db.prepare("INSERT OR IGNORE INTO conditions (id, name, category, icd_code) VALUES (?, ?, ?, ?)");
    ic.run("cond-dka", "Diabetic Ketoacidosis", "Endocrine", "E11.10");
    ic.run("cond-ckd3", "CKD Stage 3", "Renal", "N18.3");
    ic.run("cond-gad", "Generalized Anxiety Disorder", "Psychiatric", "F41.1");
    ic.run("cond-epilepsy", "Epilepsy", "Neurological", "G40.909");
    ic.run("cond-pregnancy", "Pregnancy (14 weeks)", "Obstetric", "Z33.1");
    ic.run("cond-copd", "COPD", "Pulmonary", "J44.1");
    ic.run("cond-pneumonia", "Community-Acquired Pneumonia", "Infectious", "J18.9");
    ic.run("cond-chf", "Congestive Heart Failure", "Cardiovascular", "I50.9");

    const ipc = db.prepare("INSERT OR IGNORE INTO patient_conditions (id, patient_id, condition_id, severity, diagnosed_date) VALUES (?, ?, ?, ?, ?)");
    ipc.run("pc-20", "patient-anita", "cond-dka", "severe", "2026-03-29");
    ipc.run("pc-21", "patient-anita", "cond-t2d", "severe", "2015-03-10");
    ipc.run("pc-22", "patient-anita", "cond-ckd3", "moderate", "2024-06-15");
    ipc.run("pc-23", "patient-anita", "cond-hypertension", "moderate", "2018-11-01");
    ipc.run("pc-24", "patient-david", "cond-gad", "severe", "2023-08-20");
    ipc.run("pc-25", "patient-david", "cond-gerd", "mild", "2025-01-10");
    ipc.run("pc-26", "patient-grace", "cond-epilepsy", "moderate", "2026-03-30");
    ipc.run("pc-27", "patient-grace", "cond-pregnancy", "normal", "2026-01-01");
    ipc.run("pc-28", "patient-grace", "cond-hypothyroid", "mild", "2024-05-15");
    ipc.run("pc-29", "patient-harold", "cond-copd", "severe", "2016-02-10");
    ipc.run("pc-30", "patient-harold", "cond-pneumonia", "severe", "2026-03-28");
    ipc.run("pc-31", "patient-harold", "cond-chf", "moderate", "2020-09-15");
    ipc.run("pc-32", "patient-harold", "cond-hypertension", "moderate", "2010-04-01");
    ipc.run("pc-33", "patient-harold", "cond-t2d", "mild", "2019-07-20");

    // Allergies
    const ial = db.prepare("INSERT OR IGNORE INTO allergies (id, patient_id, allergen, allergen_type, reaction, severity, reported_date, verified_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
    ial.run("alg-10", "patient-anita", "Metoclopramide", "drug", "Dystonic reaction", "severe", "2020-05-10", "Dr. Gupta");
    ial.run("alg-11", "patient-david", "Benzodiazepines (paradoxical)", "drug", "Paradoxical agitation", "moderate", "2024-01-15", "Dr. Park");
    ial.run("alg-12", "patient-harold", "Penicillin", "drug", "Anaphylaxis", "severe", "1995-03-20", "Dr. Chen");
    ial.run("alg-13", "patient-harold", "ACE Inhibitors", "drug", "Angioedema", "severe", "2018-08-10", "Dr. Chen");
    ial.run("alg-14", "patient-grace", "Valproic Acid", "drug", "Teratogenic — contraindicated in pregnancy", "severe", "2026-03-30", "Dr. Brown");

    // Vitals
    const iv = db.prepare("INSERT OR IGNORE INTO vital_signs (id, patient_id, recorded_at, recorded_by, heart_rate, blood_pressure_sys, blood_pressure_dia, temperature, spo2, respiratory_rate, blood_sugar, weight, pain_level, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    // Anita — DKA recovering
    iv.run("v-a1", "patient-anita", "2026-03-31T06:00:00Z", "Carol Singh", 102, 148, 92, 99.4, 97, 24, 320, 75, 3, "Kussmaul breathing resolved. Still tachycardic. Sugar coming down.");
    iv.run("v-a2", "patient-anita", "2026-03-31T10:00:00Z", "Amy Rodriguez", 94, 140, 88, 98.8, 98, 20, 245, 75, 2, "Improving. Tolerating sips of water.");
    iv.run("v-a3", "patient-anita", "2026-03-31T14:00:00Z", "Carol Singh", 88, 135, 84, 98.6, 98, 18, 198, 75, 1, "Much improved. Ate lunch. Transitioning to SC insulin.");
    // David — Anxiety
    iv.run("v-d1", "patient-david", "2026-03-31T08:00:00Z", "Amy Rodriguez", 95, 142, 90, 98.4, 99, 20, 105, 82, 2, "Anxious but cooperative. Slept poorly.");
    iv.run("v-d2", "patient-david", "2026-03-31T14:00:00Z", "Carol Singh", 78, 128, 82, 98.6, 99, 16, 98, 82, 0, "Calmer after lorazepam. Engaged in therapy session.");
    // Grace — Post-seizure, pregnant
    iv.run("v-g1", "patient-grace", "2026-03-31T06:00:00Z", "Ben Thompson", 82, 118, 72, 98.2, 99, 16, 88, 58, 1, "Alert, oriented x4. No further seizure activity. Fetal HR 155 on doppler.");
    iv.run("v-g2", "patient-grace", "2026-03-31T12:00:00Z", "Amy Rodriguez", 76, 115, 70, 98.4, 99, 15, 92, 58, 0, "Stable. Ambulating. MRI scheduled for tomorrow.");
    // Harold — ICU COPD
    iv.run("v-h1", "patient-harold", "2026-03-31T02:00:00Z", "Ben Thompson", 110, 155, 95, 101.2, 88, 28, 210, 92, 5, "Febrile. SpO2 dropping on BiPAP. Increased FiO2 to 60%.");
    iv.run("v-h2", "patient-harold", "2026-03-31T06:00:00Z", "Ben Thompson", 105, 150, 92, 100.8, 90, 26, 195, 92, 4, "Slight improvement after neb treatment. Still febrile.");
    iv.run("v-h3", "patient-harold", "2026-03-31T10:00:00Z", "Amy Rodriguez", 98, 145, 88, 100.1, 91, 24, 180, 92, 3, "Temp trending down. SpO2 improving. Tolerated sitting up.");
    iv.run("v-h4", "patient-harold", "2026-03-31T14:00:00Z", "Carol Singh", 92, 140, 85, 99.6, 93, 22, 165, 92, 3, "Best SpO2 today. Weaning BiPAP settings. Ate small meal.");

    // Doctor instructions
    const ii = db.prepare("INSERT OR IGNORE INTO doctor_instructions (id, patient_id, doctor_id, instruction, category, priority, created_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
    ii.run("ins-20", "patient-anita", "doc-gupta", "Blood sugar Q2H until <250, then QID (AC+HS). Call if >350 or <70.", "monitoring", "stat", "2026-03-31T06:00:00Z", "in_progress");
    ii.run("ins-21", "patient-anita", "doc-gupta", "Transition insulin drip to SC insulin lispro when eating. Use sliding scale.", "medication", "urgent", "2026-03-31T10:00:00Z", "pending");
    ii.run("ins-22", "patient-anita", "doc-brown", "Basic metabolic panel in AM. Monitor creatinine and potassium closely.", "monitoring", "routine", "2026-03-29T09:00:00Z", "in_progress");
    ii.run("ins-23", "patient-david", "doc-park", "Anxiety assessment Q4H. Use PHQ-9 and GAD-7 scales daily.", "monitoring", "routine", "2026-03-31T08:00:00Z", "in_progress");
    ii.run("ins-24", "patient-david", "doc-chen", "Serial troponins Q6H x3. ECG if chest pain recurs.", "monitoring", "urgent", "2026-03-30T16:00:00Z", "in_progress");
    ii.run("ins-25", "patient-grace", "doc-brown", "Seizure precautions: padded side rails, suction at bedside, O2 ready.", "activity", "stat", "2026-03-30T22:00:00Z", "in_progress");
    ii.run("ins-26", "patient-grace", "doc-brown", "Fetal heart rate monitoring Q shift. Report any changes.", "monitoring", "urgent", "2026-03-31T06:00:00Z", "in_progress");
    ii.run("ins-27", "patient-grace", "doc-brown", "NO VALPROIC ACID — patient is pregnant. All meds must be pregnancy-safe.", "medication", "stat", "2026-03-30T22:00:00Z", "in_progress");
    ii.run("ins-28", "patient-harold", "doc-chen", "SpO2 continuous monitoring. Titrate O2 to maintain >90%. Call if <88%.", "monitoring", "stat", "2026-03-31T02:00:00Z", "in_progress");
    ii.run("ins-29", "patient-harold", "doc-chen", "Strict I&O. Daily weights. Target negative 500mL/day fluid balance.", "monitoring", "urgent", "2026-03-28T06:00:00Z", "in_progress");
    ii.run("ins-30", "patient-harold", "doc-chen", "Sputum culture if able to produce sample. Blood cultures x2 if temp >101.", "procedure", "routine", "2026-03-28T06:00:00Z", "pending");

    // Nurse notes
    const inn = db.prepare("INSERT OR IGNORE INTO nurse_notes (id, patient_id, author, note_type, content, created_at, shift) VALUES (?, ?, ?, ?, ?, ?, ?)");
    inn.run("nn-20", "patient-anita", "Carol Singh", "assessment", "Patient drowsy but arousable. Blood sugar 320 — started on insulin sliding scale. IV NS running at 200mL/hr. Monitoring for signs of cerebral edema.", "2026-03-31T06:30:00Z", "night");
    inn.run("nn-21", "patient-anita", "Amy Rodriguez", "intervention", "Blood sugar 245 at 10:00. Gave 4 units insulin lispro per sliding scale. Patient tolerating clear liquids. No nausea.", "2026-03-31T10:15:00Z", "day");
    inn.run("nn-22", "patient-david", "Amy Rodriguez", "assessment", "Patient pacing in room, reports racing thoughts and chest tightness. Denies SI/HI. Administered lorazepam 0.5mg PO per order. Stayed with patient 15 min.", "2026-03-31T08:15:00Z", "day");
    inn.run("nn-23", "patient-grace", "Ben Thompson", "assessment", "Post-ictal assessment: patient alert, oriented x4, no focal deficits. Denies headache. Fetal heart tones 155 via doppler — reassuring. Seizure precautions in place.", "2026-03-31T06:30:00Z", "night");
    inn.run("nn-24", "patient-harold", "Ben Thompson", "assessment", "ICU admission assessment: Patient in respiratory distress on BiPAP. Accessory muscle use noted. Bilateral crackles with wheezing. SpO2 88% on arrival, improved to 90% with increased FiO2. Alert but fatigued.", "2026-03-31T02:30:00Z", "night");
    inn.run("nn-25", "patient-harold", "Amy Rodriguez", "intervention", "Nebulizer treatment given: albuterol 2.5mg. HR increased to 115 during neb, returned to 98 after 20 min. SpO2 improved from 90% to 93%. Patient reports easier breathing.", "2026-03-31T10:15:00Z", "day");

    // Lab results
    const il = db.prepare("INSERT OR IGNORE INTO lab_results (id, patient_id, test_name, value, unit, reference_low, reference_high, status, ordered_by, collected_at, resulted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    // Anita
    il.run("lab-a1", "patient-anita", "Blood Glucose", 320, "mg/dL", 70, 100, "critical", "Dr. Gupta", "2026-03-31T05:30:00Z", "2026-03-31T06:00:00Z");
    il.run("lab-a2", "patient-anita", "HbA1c", 10.2, "%", 4.0, 5.7, "critical", "Dr. Gupta", "2026-03-29T08:00:00Z", "2026-03-30T10:00:00Z");
    il.run("lab-a3", "patient-anita", "Creatinine", 1.8, "mg/dL", 0.6, 1.1, "abnormal", "Dr. Brown", "2026-03-31T05:30:00Z", "2026-03-31T06:00:00Z");
    il.run("lab-a4", "patient-anita", "Potassium", 5.6, "mEq/L", 3.5, 5.0, "abnormal", "Dr. Brown", "2026-03-31T05:30:00Z", "2026-03-31T06:00:00Z");
    il.run("lab-a5", "patient-anita", "Bicarbonate", 14, "mEq/L", 22, 29, "critical", "Dr. Gupta", "2026-03-31T05:30:00Z", "2026-03-31T06:00:00Z");
    il.run("lab-a6", "patient-anita", "Anion Gap", 22, "mEq/L", 8, 12, "critical", "Dr. Gupta", "2026-03-31T05:30:00Z", "2026-03-31T06:00:00Z");
    // David
    il.run("lab-d1", "patient-david", "Troponin I", 0.01, "ng/mL", 0, 0.04, "normal", "Dr. Chen", "2026-03-31T06:00:00Z", "2026-03-31T07:00:00Z");
    il.run("lab-d2", "patient-david", "Troponin I (6h)", 0.01, "ng/mL", 0, 0.04, "normal", "Dr. Chen", "2026-03-31T12:00:00Z", "2026-03-31T13:00:00Z");
    il.run("lab-d3", "patient-david", "TSH", 2.1, "mIU/L", 0.4, 4.0, "normal", "Dr. Park", "2026-03-31T06:00:00Z", "2026-03-31T07:00:00Z");
    // Grace
    il.run("lab-g1", "patient-grace", "Prolactin", 42, "ng/mL", 2, 29, "abnormal", "Dr. Brown", "2026-03-31T06:00:00Z", "2026-03-31T07:00:00Z");
    il.run("lab-g2", "patient-grace", "TSH", 6.8, "mIU/L", 0.4, 4.0, "abnormal", "Dr. Adams", "2026-03-31T06:00:00Z", "2026-03-31T07:00:00Z");
    il.run("lab-g3", "patient-grace", "hCG", 45000, "mIU/mL", 0, 0, "normal", "Dr. Brown", "2026-03-31T06:00:00Z", "2026-03-31T07:00:00Z");
    il.run("lab-g4", "patient-grace", "Hemoglobin", 10.8, "g/dL", 12.0, 16.0, "abnormal", "Dr. Brown", "2026-03-31T06:00:00Z", "2026-03-31T07:00:00Z");
    // Harold
    il.run("lab-h1", "patient-harold", "WBC", 18.5, "K/uL", 4.5, 11.0, "abnormal", "Dr. Chen", "2026-03-31T05:00:00Z", "2026-03-31T06:00:00Z");
    il.run("lab-h2", "patient-harold", "Procalcitonin", 2.8, "ng/mL", 0, 0.5, "critical", "Dr. Chen", "2026-03-31T05:00:00Z", "2026-03-31T06:00:00Z");
    il.run("lab-h3", "patient-harold", "BNP", 890, "pg/mL", 0, 100, "critical", "Dr. Chen", "2026-03-31T05:00:00Z", "2026-03-31T06:00:00Z");
    il.run("lab-h4", "patient-harold", "ABG pH", 7.32, "", 7.35, 7.45, "abnormal", "Dr. Chen", "2026-03-31T05:00:00Z", "2026-03-31T06:00:00Z");
    il.run("lab-h5", "patient-harold", "ABG pCO2", 52, "mmHg", 35, 45, "abnormal", "Dr. Chen", "2026-03-31T05:00:00Z", "2026-03-31T06:00:00Z");
    il.run("lab-h6", "patient-harold", "Blood Glucose", 210, "mg/dL", 70, 100, "abnormal", "Dr. Chen", "2026-03-31T05:00:00Z", "2026-03-31T06:00:00Z");

    // Med admin
    const ima = db.prepare("INSERT OR IGNORE INTO medication_administration (id, patient_id, medication_id, administered_at, administered_by, dose_given, status, reason, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
    ima.run("ma-20", "patient-anita", "pm-30", "2026-03-31T06:00:00Z", "Carol Singh", "8 units", "given", null, "Blood sugar 320. Per sliding scale.");
    ima.run("ma-21", "patient-anita", "pm-30", "2026-03-31T10:00:00Z", "Amy Rodriguez", "4 units", "given", null, "Blood sugar 245.");
    ima.run("ma-22", "patient-david", "pm-34", "2026-03-31T08:30:00Z", "Amy Rodriguez", "0.5mg", "given", null, "For acute anxiety. Patient calmed within 20 min.");
    ima.run("ma-23", "patient-harold", "pm-42", "2026-03-31T06:00:00Z", "Ben Thompson", "2.5mg", "given", null, "Nebulizer treatment. HR 115 during, 98 after.");
    ima.run("ma-24", "patient-harold", "pm-42", "2026-03-31T10:00:00Z", "Amy Rodriguez", "2.5mg", "given", null, "Scheduled neb. SpO2 improved 90->93%.");
    ima.run("ma-25", "patient-harold", "pm-44", "2026-03-31T06:00:00Z", "Ben Thompson", "5000 units", "given", null, "SQ abdomen. Platelets 180K — OK to give.");
  });
  tx();
}
