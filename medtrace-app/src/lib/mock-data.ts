// ============================================================
// MedTrace — Mock Data (AI-Powered Care Intelligence Platform)
// ============================================================

import type {
  Patient,
  Drug,
  Enzyme,
  Condition,
  GeneVariant,
  Manufacturer,
  PatientMedication,
  DrugInteraction,
  DrugEnzymeEffect,
  EnzymeMetabolism,
  DrugTreatment,
  DrugContraindication,
  PatientCondition,
  PatientGenotype,
  GeneEnzymeEffect,
  DrugRecall,
  AlternativeDrug,
  InteractionChain,
  Room,
  Doctor,
  DoctorAssignment,
  Admission,
  EmergencyContact,
  VitalSigns,
  MedicationAdministration,
  DoctorInstruction,
  User,
} from "./types";

// ============================================================
// HOSPITAL INFRASTRUCTURE
// ============================================================

export const MOCK_USERS: User[] = [
  { id: "user-doc-chen", name: "Dr. Sarah Chen", role: "doctor", department: "Cardiology", employee_id: "DOC-1001", email: "s.chen@hospital.org" },
  { id: "user-doc-park", name: "Dr. James Park", role: "doctor", department: "Psychiatry", employee_id: "DOC-1002", email: "j.park@hospital.org" },
  { id: "user-doc-gupta", name: "Dr. Priya Gupta", role: "doctor", department: "Endocrinology", employee_id: "DOC-1003", email: "p.gupta@hospital.org" },
  { id: "user-doc-brown", name: "Dr. Michael Brown", role: "doctor", department: "Internal Medicine", employee_id: "DOC-1004", email: "m.brown@hospital.org" },
  { id: "user-nurse-amy", name: "Amy Rodriguez", role: "nurse", department: "General Ward", employee_id: "NUR-2001", email: "a.rodriguez@hospital.org" },
  { id: "user-nurse-ben", name: "Ben Thompson", role: "nurse", department: "ICU", employee_id: "NUR-2002", email: "b.thompson@hospital.org" },
  { id: "user-nurse-carol", name: "Carol Singh", role: "nurse", department: "General Ward", employee_id: "NUR-2003", email: "c.singh@hospital.org" },
];

export const MOCK_ROOMS: Room[] = [
  { id: "room-301a", room_number: "301-A", floor: 3, ward: "General Ward", bed_count: 2, room_type: "semi-private", status: "occupied" },
  { id: "room-302", room_number: "302", floor: 3, ward: "General Ward", bed_count: 1, room_type: "private", status: "occupied" },
  { id: "room-305", room_number: "305", floor: 3, ward: "General Ward", bed_count: 2, room_type: "semi-private", status: "occupied" },
  { id: "room-icu-1", room_number: "ICU-1", floor: 2, ward: "ICU", bed_count: 1, room_type: "icu", status: "occupied" },
  { id: "room-306", room_number: "306", floor: 3, ward: "General Ward", bed_count: 1, room_type: "private", status: "available" },
  { id: "room-307", room_number: "307", floor: 3, ward: "General Ward", bed_count: 2, room_type: "general", status: "maintenance" },
];

export const MOCK_DOCTORS: Doctor[] = [
  { id: "doc-chen", name: "Dr. Sarah Chen", specialization: "Cardiology", department: "Cardiology", phone: "555-0101", employee_id: "DOC-1001" },
  { id: "doc-park", name: "Dr. James Park", specialization: "Psychiatry", department: "Psychiatry", phone: "555-0102", employee_id: "DOC-1002" },
  { id: "doc-gupta", name: "Dr. Priya Gupta", specialization: "Endocrinology", department: "Endocrinology", phone: "555-0103", employee_id: "DOC-1003" },
  { id: "doc-brown", name: "Dr. Michael Brown", specialization: "Internal Medicine", department: "Internal Medicine", phone: "555-0104", employee_id: "DOC-1004" },
  { id: "doc-adams", name: "Dr. Lisa Adams", specialization: "General Medicine", department: "General", phone: "555-0105", employee_id: "DOC-1005" },
  { id: "doc-singh", name: "Dr. Raj Singh", specialization: "Gastroenterology", department: "GI", phone: "555-0106", employee_id: "DOC-1006" },
];

// ============================================================
// PATIENTS (expanded with hospital fields)
// ============================================================

export const MOCK_PATIENTS: Patient[] = [
  { id: "patient-raj", name: "Raj Patel", age: 72, sex: "M", date_of_birth: "1954-03-15", blood_group: "A+", created_at: "2025-01-15T08:00:00Z" },
  { id: "patient-maria", name: "Maria Lopez", age: 54, sex: "F", date_of_birth: "1972-07-22", blood_group: "O+", created_at: "2025-02-20T10:30:00Z" },
  { id: "patient-john", name: "John Doe", age: 67, sex: "M", date_of_birth: "1959-11-08", blood_group: "B-", created_at: "2025-03-01T14:00:00Z" },
  { id: "patient-emma", name: "Emma Wilson", age: 41, sex: "F", date_of_birth: "1985-05-30", blood_group: "AB+", created_at: "2025-03-10T09:15:00Z" },
];

export const MOCK_EMERGENCY_CONTACTS: EmergencyContact[] = [
  { id: "ec-1", patient_id: "patient-raj", name: "Anita Patel", relationship: "Wife", phone: "555-1001", alt_phone: "555-1002" },
  { id: "ec-2", patient_id: "patient-maria", name: "Carlos Lopez", relationship: "Husband", phone: "555-2001", alt_phone: null },
  { id: "ec-3", patient_id: "patient-john", name: "Sarah Doe", relationship: "Daughter", phone: "555-3001", alt_phone: "555-3002" },
  { id: "ec-4", patient_id: "patient-emma", name: "Tom Wilson", relationship: "Husband", phone: "555-4001", alt_phone: null },
];

export const MOCK_ADMISSIONS: Admission[] = [
  { id: "adm-1", patient_id: "patient-raj", room_id: "room-icu-1", admission_date: "2026-03-25T10:30:00Z", discharge_date: null, reason: "Chest pain with irregular heartbeat", diagnosis: "Atrial fibrillation with rapid ventricular response", status: "admitted", admitted_by: "doc-chen", notes: "History of polypharmacy — monitor drug interactions closely. CYP2C9 poor metabolizer." },
  { id: "adm-2", patient_id: "patient-maria", room_id: "room-302", admission_date: "2026-03-28T14:00:00Z", discharge_date: null, reason: "Routine monitoring for diabetes management", diagnosis: "Type 2 Diabetes — insulin adjustment needed", status: "admitted", admitted_by: "doc-gupta", notes: "Stable patient. Adjusting Metformin dosage." },
  { id: "adm-3", patient_id: "patient-john", room_id: "room-301a", admission_date: "2026-03-27T08:00:00Z", discharge_date: null, reason: "Severe hypertension — BP 190/110", diagnosis: "Hypertensive crisis, monitoring for end-organ damage", status: "admitted", admitted_by: "doc-brown", notes: "CYP2C19 poor metabolizer — clopidogrel may be less effective." },
  { id: "adm-4", patient_id: "patient-emma", room_id: "room-305", admission_date: "2026-03-29T11:00:00Z", discharge_date: null, reason: "Severe joint pain with suspected flare-up", diagnosis: "Osteoarthritis flare with depression management", status: "admitted", admitted_by: "doc-park", notes: "CYP2D6 ultra-rapid metabolizer — monitor SSRI efficacy." },
];

export const MOCK_DOCTOR_ASSIGNMENTS: DoctorAssignment[] = [
  { id: "da-1", patient_id: "patient-raj", doctor_id: "doc-chen", condition: "Atrial Fibrillation", assigned_date: "2026-03-25", is_primary: true, notes: "Primary attending" },
  { id: "da-2", patient_id: "patient-raj", doctor_id: "doc-gupta", condition: "Type 2 Diabetes", assigned_date: "2026-03-25", is_primary: false, notes: "Endocrine consult" },
  { id: "da-3", patient_id: "patient-raj", doctor_id: "doc-park", condition: "Depression", assigned_date: "2026-03-26", is_primary: false, notes: "Psychiatric consult" },
  { id: "da-4", patient_id: "patient-maria", doctor_id: "doc-gupta", condition: "Type 2 Diabetes", assigned_date: "2026-03-28", is_primary: true, notes: null },
  { id: "da-5", patient_id: "patient-maria", doctor_id: "doc-adams", condition: "Hypothyroidism", assigned_date: "2026-03-28", is_primary: false, notes: null },
  { id: "da-6", patient_id: "patient-john", doctor_id: "doc-brown", condition: "Hypertension", assigned_date: "2026-03-27", is_primary: true, notes: "Acute management" },
  { id: "da-7", patient_id: "patient-john", doctor_id: "doc-singh", condition: "GERD", assigned_date: "2026-03-27", is_primary: false, notes: "GI consult" },
  { id: "da-8", patient_id: "patient-emma", doctor_id: "doc-park", condition: "Depression + Pain Management", assigned_date: "2026-03-29", is_primary: true, notes: null },
  { id: "da-9", patient_id: "patient-emma", doctor_id: "doc-brown", condition: "Hypertension", assigned_date: "2026-03-29", is_primary: false, notes: null },
];

// ============================================================
// VITALS — Manual entry by nurses
// ============================================================

export const MOCK_VITALS: VitalSigns[] = [
  // Raj Patel — ICU (critical)
  { id: "v-r1", patient_id: "patient-raj", recorded_at: "2026-03-31T06:00:00Z", recorded_by: "Ben Thompson", heart_rate: 112, blood_pressure_sys: 145, blood_pressure_dia: 88, temperature: 99.1, spo2: 94, respiratory_rate: 22, blood_sugar: 185, weight: 78, pain_level: 4, notes: "HR elevated, irregular rhythm noted" },
  { id: "v-r2", patient_id: "patient-raj", recorded_at: "2026-03-31T10:00:00Z", recorded_by: "Ben Thompson", heart_rate: 105, blood_pressure_sys: 138, blood_pressure_dia: 85, temperature: 98.8, spo2: 95, respiratory_rate: 20, blood_sugar: 172, weight: 78, pain_level: 3, notes: "Slight improvement after medication" },
  { id: "v-r3", patient_id: "patient-raj", recorded_at: "2026-03-31T14:00:00Z", recorded_by: "Amy Rodriguez", heart_rate: 98, blood_pressure_sys: 132, blood_pressure_dia: 82, temperature: 98.6, spo2: 96, respiratory_rate: 18, blood_sugar: 160, weight: 78, pain_level: 2, notes: "Stable, rhythm improving" },
  // Maria Lopez — Stable
  { id: "v-m1", patient_id: "patient-maria", recorded_at: "2026-03-31T07:00:00Z", recorded_by: "Amy Rodriguez", heart_rate: 72, blood_pressure_sys: 125, blood_pressure_dia: 78, temperature: 98.4, spo2: 98, respiratory_rate: 16, blood_sugar: 210, weight: 68, pain_level: 0, notes: "Fasting blood sugar elevated" },
  { id: "v-m2", patient_id: "patient-maria", recorded_at: "2026-03-31T12:00:00Z", recorded_by: "Carol Singh", heart_rate: 75, blood_pressure_sys: 122, blood_pressure_dia: 76, temperature: 98.6, spo2: 99, respiratory_rate: 15, blood_sugar: 165, weight: 68, pain_level: 0, notes: "Post-meal sugar still elevated" },
  // John Doe — Hypertensive
  { id: "v-j1", patient_id: "patient-john", recorded_at: "2026-03-31T06:30:00Z", recorded_by: "Carol Singh", heart_rate: 88, blood_pressure_sys: 178, blood_pressure_dia: 105, temperature: 98.9, spo2: 96, respiratory_rate: 19, blood_sugar: 130, weight: 85, pain_level: 6, notes: "Headache reported, BP still high" },
  { id: "v-j2", patient_id: "patient-john", recorded_at: "2026-03-31T12:00:00Z", recorded_by: "Amy Rodriguez", heart_rate: 82, blood_pressure_sys: 162, blood_pressure_dia: 98, temperature: 98.6, spo2: 97, respiratory_rate: 17, blood_sugar: 125, weight: 85, pain_level: 4, notes: "BP reducing slowly with meds" },
  // Emma Wilson — Moderate
  { id: "v-e1", patient_id: "patient-emma", recorded_at: "2026-03-31T07:30:00Z", recorded_by: "Amy Rodriguez", heart_rate: 78, blood_pressure_sys: 135, blood_pressure_dia: 85, temperature: 98.5, spo2: 98, respiratory_rate: 16, blood_sugar: 95, weight: 62, pain_level: 7, notes: "Joint pain severe this morning" },
  { id: "v-e2", patient_id: "patient-emma", recorded_at: "2026-03-31T13:00:00Z", recorded_by: "Carol Singh", heart_rate: 74, blood_pressure_sys: 128, blood_pressure_dia: 80, temperature: 98.4, spo2: 99, respiratory_rate: 15, blood_sugar: 92, weight: 62, pain_level: 5, notes: "Pain reduced after medication" },
];

// ============================================================
// DOCTOR INSTRUCTIONS
// ============================================================

export const MOCK_INSTRUCTIONS: DoctorInstruction[] = [
  { id: "ins-1", patient_id: "patient-raj", doctor_id: "doc-chen", instruction: "Monitor heart rhythm every 2 hours. Report any HR > 120 or new arrhythmia immediately.", category: "monitoring", priority: "urgent", created_at: "2026-03-31T08:00:00Z", completed_at: null, completed_by: null, status: "in_progress" },
  { id: "ins-2", patient_id: "patient-raj", doctor_id: "doc-chen", instruction: "Administer Warfarin 5mg at 18:00. Check INR before administration.", category: "medication", priority: "urgent", created_at: "2026-03-31T08:00:00Z", completed_at: null, completed_by: null, status: "pending" },
  { id: "ins-3", patient_id: "patient-raj", doctor_id: "doc-gupta", instruction: "Check blood sugar before meals and at bedtime. Target: 140-180 mg/dL.", category: "monitoring", priority: "routine", created_at: "2026-03-31T09:00:00Z", completed_at: null, completed_by: null, status: "in_progress" },
  { id: "ins-4", patient_id: "patient-raj", doctor_id: "doc-chen", instruction: "Restrict fluid intake to 1500mL/day.", category: "diet", priority: "routine", created_at: "2026-03-25T10:00:00Z", completed_at: null, completed_by: null, status: "in_progress" },
  { id: "ins-5", patient_id: "patient-maria", doctor_id: "doc-gupta", instruction: "Adjust Metformin to 1000mg twice daily starting tomorrow.", category: "medication", priority: "routine", created_at: "2026-03-31T10:00:00Z", completed_at: null, completed_by: null, status: "pending" },
  { id: "ins-6", patient_id: "patient-maria", doctor_id: "doc-gupta", instruction: "Diabetic diet — no added sugars. Monitor blood sugar QID.", category: "diet", priority: "routine", created_at: "2026-03-28T14:00:00Z", completed_at: null, completed_by: null, status: "in_progress" },
  { id: "ins-7", patient_id: "patient-john", doctor_id: "doc-brown", instruction: "BP check every 1 hour until < 150/90. Call if not responding to meds.", category: "monitoring", priority: "stat", created_at: "2026-03-31T07:00:00Z", completed_at: null, completed_by: null, status: "in_progress" },
  { id: "ins-8", patient_id: "patient-john", doctor_id: "doc-brown", instruction: "Bed rest — no ambulation until BP stabilized.", category: "activity", priority: "urgent", created_at: "2026-03-27T08:00:00Z", completed_at: null, completed_by: null, status: "in_progress" },
  { id: "ins-9", patient_id: "patient-emma", doctor_id: "doc-park", instruction: "Administer Ibuprofen 400mg every 6h for pain. Do not exceed 1600mg/day.", category: "medication", priority: "routine", created_at: "2026-03-31T08:00:00Z", completed_at: "2026-03-31T08:15:00Z", completed_by: "Amy Rodriguez", status: "completed" },
  { id: "ins-10", patient_id: "patient-emma", doctor_id: "doc-park", instruction: "Assess pain level every 4 hours. Report if pain > 8/10.", category: "monitoring", priority: "routine", created_at: "2026-03-29T11:00:00Z", completed_at: null, completed_by: null, status: "in_progress" },
];

// ============================================================
// MEDICATION ADMINISTRATION LOG
// ============================================================

export const MOCK_MED_ADMIN: MedicationAdministration[] = [
  { id: "ma-1", patient_id: "patient-raj", medication_id: "pm-1", administered_at: "2026-03-31T06:00:00Z", administered_by: "Ben Thompson", dose_given: "5mg", status: "given", notes: "INR checked: 2.4" },
  { id: "ma-2", patient_id: "patient-raj", medication_id: "pm-4", administered_at: "2026-03-31T06:00:00Z", administered_by: "Ben Thompson", dose_given: "50mg", status: "given", notes: null },
  { id: "ma-3", patient_id: "patient-raj", medication_id: "pm-8", administered_at: "2026-03-31T07:00:00Z", administered_by: "Ben Thompson", dose_given: "500mg", status: "given", notes: "Given with breakfast" },
  { id: "ma-4", patient_id: "patient-raj", medication_id: "pm-5", administered_at: "2026-03-31T06:30:00Z", administered_by: "Ben Thompson", dose_given: "20mg", status: "given", notes: "30 min before breakfast" },
  { id: "ma-5", patient_id: "patient-maria", medication_id: "pm-10", administered_at: "2026-03-31T06:00:00Z", administered_by: "Amy Rodriguez", dose_given: "75mcg", status: "given", notes: "Empty stomach" },
  { id: "ma-6", patient_id: "patient-maria", medication_id: "pm-11", administered_at: "2026-03-31T07:30:00Z", administered_by: "Amy Rodriguez", dose_given: "500mg", status: "given", notes: null },
  { id: "ma-7", patient_id: "patient-john", medication_id: "pm-13", administered_at: "2026-03-31T06:00:00Z", administered_by: "Carol Singh", dose_given: "100mg", status: "given", notes: null },
  { id: "ma-8", patient_id: "patient-john", medication_id: "pm-16", administered_at: "2026-03-31T06:00:00Z", administered_by: "Carol Singh", dose_given: "40mg", status: "held", reason: "Omeprazole may reduce clopidogrel efficacy — awaiting doctor confirmation", notes: "Notified Dr. Brown" },
  { id: "ma-9", patient_id: "patient-emma", medication_id: "pm-21", administered_at: "2026-03-31T08:15:00Z", administered_by: "Amy Rodriguez", dose_given: "400mg", status: "given", notes: "For joint pain" },
  { id: "ma-10", patient_id: "patient-emma", medication_id: "pm-18", administered_at: "2026-03-31T07:00:00Z", administered_by: "Amy Rodriguez", dose_given: "40mg", status: "given", notes: null },
];

// ============================================================
// DRUGS (kept from original)
// ============================================================

export const MOCK_DRUGS: Drug[] = [
  { id: "drug-warfarin", name: "Warfarin", generic_name: "Warfarin Sodium", drug_class: "Anticoagulant", efficacy_score: 0.85 },
  { id: "drug-aspirin", name: "Aspirin", generic_name: "Acetylsalicylic Acid", drug_class: "NSAID/Antiplatelet", efficacy_score: 0.78 },
  { id: "drug-fluoxetine", name: "Fluoxetine", generic_name: "Fluoxetine HCl", drug_class: "SSRI", efficacy_score: 0.82 },
  { id: "drug-metoprolol", name: "Metoprolol", generic_name: "Metoprolol Tartrate", drug_class: "Beta-Blocker", efficacy_score: 0.88 },
  { id: "drug-omeprazole", name: "Omeprazole", generic_name: "Omeprazole", drug_class: "Proton Pump Inhibitor", efficacy_score: 0.90 },
  { id: "drug-simvastatin", name: "Simvastatin", generic_name: "Simvastatin", drug_class: "Statin", efficacy_score: 0.87 },
  { id: "drug-lisinopril", name: "Lisinopril", generic_name: "Lisinopril", drug_class: "ACE Inhibitor", efficacy_score: 0.86 },
  { id: "drug-metformin", name: "Metformin", generic_name: "Metformin HCl", drug_class: "Biguanide", efficacy_score: 0.91 },
  { id: "drug-amlodipine", name: "Amlodipine", generic_name: "Amlodipine Besylate", drug_class: "Calcium Channel Blocker", efficacy_score: 0.84 },
  { id: "drug-ibuprofen", name: "Ibuprofen", generic_name: "Ibuprofen", drug_class: "NSAID", efficacy_score: 0.75 },
  { id: "drug-acetaminophen", name: "Acetaminophen", generic_name: "Paracetamol", drug_class: "Analgesic", efficacy_score: 0.72 },
  { id: "drug-diclofenac-topical", name: "Topical Diclofenac", generic_name: "Diclofenac Sodium Gel", drug_class: "Topical NSAID", efficacy_score: 0.68 },
  { id: "drug-clopidogrel", name: "Clopidogrel", generic_name: "Clopidogrel Bisulfate", drug_class: "Antiplatelet", efficacy_score: 0.83 },
  { id: "drug-gabapentin", name: "Gabapentin", generic_name: "Gabapentin", drug_class: "Anticonvulsant", efficacy_score: 0.76 },
  { id: "drug-levothyroxine", name: "Levothyroxine", generic_name: "Levothyroxine Sodium", drug_class: "Thyroid Hormone", efficacy_score: 0.92 },
  { id: "drug-valsartan", name: "Valsartan", generic_name: "Valsartan", drug_class: "ARB", efficacy_score: 0.85 },
  { id: "drug-losartan", name: "Losartan", generic_name: "Losartan Potassium", drug_class: "ARB", efficacy_score: 0.84 },
];

export const MOCK_ENZYMES: Enzyme[] = [
  { id: "enz-cyp2c9", name: "CYP2C9", gene: "CYP2C9", function: "Metabolizes warfarin, NSAIDs, losartan" },
  { id: "enz-cyp2d6", name: "CYP2D6", gene: "CYP2D6", function: "Metabolizes beta-blockers, SSRIs, opioids" },
  { id: "enz-cyp3a4", name: "CYP3A4", gene: "CYP3A4", function: "Major drug metabolizer — statins, CCBs" },
  { id: "enz-cyp2c19", name: "CYP2C19", gene: "CYP2C19", function: "Metabolizes PPIs, clopidogrel, SSRIs" },
  { id: "enz-cyp1a2", name: "CYP1A2", gene: "CYP1A2", function: "Metabolizes caffeine, theophylline" },
];

export const MOCK_CONDITIONS: Condition[] = [
  { id: "cond-afib", name: "Atrial Fibrillation", category: "Cardiovascular", icd_code: "I48.91" },
  { id: "cond-hypertension", name: "Hypertension", category: "Cardiovascular", icd_code: "I10" },
  { id: "cond-t2d", name: "Type 2 Diabetes", category: "Endocrine", icd_code: "E11.9" },
  { id: "cond-depression", name: "Major Depression", category: "Psychiatric", icd_code: "F33.1" },
  { id: "cond-gerd", name: "GERD", category: "Gastrointestinal", icd_code: "K21.0" },
  { id: "cond-osteoarthritis", name: "Osteoarthritis", category: "Musculoskeletal", icd_code: "M19.90" },
  { id: "cond-hyperlipidemia", name: "Hyperlipidemia", category: "Metabolic", icd_code: "E78.5" },
  { id: "cond-hypothyroid", name: "Hypothyroidism", category: "Endocrine", icd_code: "E03.9" },
  { id: "cond-gi-bleeding", name: "GI Bleeding Risk", category: "Gastrointestinal", icd_code: "K92.2" },
];

export const MOCK_GENE_VARIANTS: GeneVariant[] = [
  { id: "gv-cyp2c9-pm", gene: "CYP2C9", variant: "*2/*3", type: "poor_metabolizer", frequency: 0.03 },
  { id: "gv-cyp2d6-um", gene: "CYP2D6", variant: "*1/*1xN", type: "ultra_rapid", frequency: 0.05 },
  { id: "gv-cyp2c19-pm", gene: "CYP2C19", variant: "*2/*2", type: "poor_metabolizer", frequency: 0.02 },
];

export const MOCK_MANUFACTURERS: Manufacturer[] = [
  { id: "mfr-novartis", name: "Novartis", country: "Switzerland" },
  { id: "mfr-zhejiang", name: "Zhejiang Huahai Pharmaceutical", country: "China" },
  { id: "mfr-mylan", name: "Mylan Pharmaceuticals", country: "USA" },
];

// ============================================================
// PATIENT MEDICATIONS (expanded with route, status, instructions)
// ============================================================

export const MOCK_PATIENT_MEDICATIONS: PatientMedication[] = [
  // Raj Patel — 9 meds
  { id: "pm-1", patient_id: "patient-raj", drug_id: "drug-warfarin", dose: "5mg", frequency: "Once daily at 18:00", route: "Oral", start_date: "2024-06-01", end_date: null, prescriber: "Dr. Chen", status: "active", instructions: "Check INR before each dose. Hold if INR > 3.5", next_due: "2026-03-31T18:00:00Z" },
  { id: "pm-2", patient_id: "patient-raj", drug_id: "drug-aspirin", dose: "81mg", frequency: "Once daily", route: "Oral", start_date: "2024-06-01", end_date: null, prescriber: "Dr. Chen", status: "active", instructions: "Take with food", next_due: "2026-04-01T06:00:00Z" },
  { id: "pm-3", patient_id: "patient-raj", drug_id: "drug-fluoxetine", dose: "20mg", frequency: "Once daily AM", route: "Oral", start_date: "2024-08-15", end_date: null, prescriber: "Dr. Park", status: "active", instructions: null, next_due: "2026-04-01T06:00:00Z" },
  { id: "pm-4", patient_id: "patient-raj", drug_id: "drug-metoprolol", dose: "50mg", frequency: "Twice daily", route: "Oral", start_date: "2024-03-10", end_date: null, prescriber: "Dr. Chen", status: "active", instructions: "Check HR before giving. Hold if HR < 60", next_due: "2026-03-31T18:00:00Z" },
  { id: "pm-5", patient_id: "patient-raj", drug_id: "drug-omeprazole", dose: "20mg", frequency: "Once daily before breakfast", route: "Oral", start_date: "2024-07-20", end_date: null, prescriber: "Dr. Singh", status: "active", instructions: "30 min before first meal", next_due: "2026-04-01T06:00:00Z" },
  { id: "pm-6", patient_id: "patient-raj", drug_id: "drug-simvastatin", dose: "40mg", frequency: "Once daily at bedtime", route: "Oral", start_date: "2024-01-05", end_date: null, prescriber: "Dr. Chen", status: "active", instructions: null, next_due: "2026-03-31T21:00:00Z" },
  { id: "pm-7", patient_id: "patient-raj", drug_id: "drug-lisinopril", dose: "10mg", frequency: "Once daily", route: "Oral", start_date: "2024-02-14", end_date: null, prescriber: "Dr. Chen", status: "active", instructions: "Check BP before giving", next_due: "2026-04-01T06:00:00Z" },
  { id: "pm-8", patient_id: "patient-raj", drug_id: "drug-metformin", dose: "500mg", frequency: "Twice daily with meals", route: "Oral", start_date: "2023-11-20", end_date: null, prescriber: "Dr. Gupta", status: "active", instructions: "Give with meals to reduce GI side effects", next_due: "2026-03-31T18:00:00Z" },
  { id: "pm-9", patient_id: "patient-raj", drug_id: "drug-amlodipine", dose: "5mg", frequency: "Once daily", route: "Oral", start_date: "2024-04-01", end_date: null, prescriber: "Dr. Chen", status: "active", instructions: null, next_due: "2026-04-01T06:00:00Z" },
  // Maria Lopez — 3 meds
  { id: "pm-10", patient_id: "patient-maria", drug_id: "drug-levothyroxine", dose: "75mcg", frequency: "Once daily on empty stomach", route: "Oral", start_date: "2024-01-10", end_date: null, prescriber: "Dr. Adams", status: "active", instructions: "Give 30-60 min before breakfast. No calcium/iron within 4h", next_due: "2026-04-01T06:00:00Z" },
  { id: "pm-11", patient_id: "patient-maria", drug_id: "drug-metformin", dose: "500mg", frequency: "Once daily with dinner", route: "Oral", start_date: "2024-03-05", end_date: null, prescriber: "Dr. Gupta", status: "active", instructions: "Increasing to 1000mg BID per new order", next_due: "2026-03-31T18:00:00Z" },
  { id: "pm-12", patient_id: "patient-maria", drug_id: "drug-lisinopril", dose: "5mg", frequency: "Once daily", route: "Oral", start_date: "2024-05-15", end_date: null, prescriber: "Dr. Adams", status: "active", instructions: null, next_due: "2026-04-01T06:00:00Z" },
  // John Doe — 5 meds
  { id: "pm-13", patient_id: "patient-john", drug_id: "drug-metoprolol", dose: "100mg", frequency: "Twice daily", route: "Oral", start_date: "2023-09-01", end_date: null, prescriber: "Dr. Brown", status: "active", instructions: "Hold if HR < 55 or SBP < 100", next_due: "2026-03-31T18:00:00Z" },
  { id: "pm-14", patient_id: "patient-john", drug_id: "drug-simvastatin", dose: "20mg", frequency: "Once daily at bedtime", route: "Oral", start_date: "2023-10-15", end_date: null, prescriber: "Dr. Brown", status: "active", instructions: null, next_due: "2026-03-31T21:00:00Z" },
  { id: "pm-15", patient_id: "patient-john", drug_id: "drug-clopidogrel", dose: "75mg", frequency: "Once daily", route: "Oral", start_date: "2024-01-20", end_date: null, prescriber: "Dr. Brown", status: "active", instructions: "Do not give with omeprazole — use pantoprazole if PPI needed", next_due: "2026-04-01T06:00:00Z" },
  { id: "pm-16", patient_id: "patient-john", drug_id: "drug-omeprazole", dose: "40mg", frequency: "Once daily", route: "Oral", start_date: "2024-02-01", end_date: null, prescriber: "Dr. Singh", status: "active", instructions: "CAUTION: Interacts with clopidogrel — pending review", next_due: "2026-04-01T06:00:00Z" },
  { id: "pm-17", patient_id: "patient-john", drug_id: "drug-lisinopril", dose: "20mg", frequency: "Once daily", route: "Oral", start_date: "2023-08-10", end_date: null, prescriber: "Dr. Brown", status: "active", instructions: null, next_due: "2026-04-01T06:00:00Z" },
  // Emma Wilson — 6 meds
  { id: "pm-18", patient_id: "patient-emma", drug_id: "drug-fluoxetine", dose: "40mg", frequency: "Once daily AM", route: "Oral", start_date: "2024-04-01", end_date: null, prescriber: "Dr. Park", status: "active", instructions: "CYP2D6 ultra-rapid metabolizer — monitor efficacy", next_due: "2026-04-01T06:00:00Z" },
  { id: "pm-19", patient_id: "patient-emma", drug_id: "drug-gabapentin", dose: "300mg", frequency: "Three times daily", route: "Oral", start_date: "2024-05-10", end_date: null, prescriber: "Dr. Park", status: "active", instructions: null, next_due: "2026-03-31T18:00:00Z" },
  { id: "pm-20", patient_id: "patient-emma", drug_id: "drug-omeprazole", dose: "20mg", frequency: "Once daily before breakfast", route: "Oral", start_date: "2024-06-01", end_date: null, prescriber: "Dr. Singh", status: "active", instructions: null, next_due: "2026-04-01T06:00:00Z" },
  { id: "pm-21", patient_id: "patient-emma", drug_id: "drug-ibuprofen", dose: "400mg", frequency: "Every 6 hours as needed", route: "Oral", start_date: "2024-07-15", end_date: null, prescriber: "Dr. Park", status: "active", instructions: "Max 1600mg/day. Give with food.", next_due: "2026-03-31T14:15:00Z" },
  { id: "pm-22", patient_id: "patient-emma", drug_id: "drug-levothyroxine", dose: "50mcg", frequency: "Once daily AM empty stomach", route: "Oral", start_date: "2023-12-01", end_date: null, prescriber: "Dr. Adams", status: "active", instructions: null, next_due: "2026-04-01T06:00:00Z" },
  { id: "pm-23", patient_id: "patient-emma", drug_id: "drug-amlodipine", dose: "2.5mg", frequency: "Once daily", route: "Oral", start_date: "2024-08-01", end_date: null, prescriber: "Dr. Brown", status: "active", instructions: null, next_due: "2026-04-01T06:00:00Z" },
];

// Remaining drug safety data (interactions, enzyme effects, etc.) — kept from original
export const MOCK_DRUG_INTERACTIONS: DrugInteraction[] = [
  { id: "di-1", drug_a_id: "drug-warfarin", drug_b_id: "drug-aspirin", severity: 8, mechanism: "Additive anticoagulant effect — increased bleeding risk", evidence_level: "High" },
  { id: "di-2", drug_a_id: "drug-warfarin", drug_b_id: "drug-fluoxetine", severity: 7, mechanism: "SSRI inhibits platelet aggregation, potentiating warfarin", evidence_level: "Moderate" },
  { id: "di-3", drug_a_id: "drug-warfarin", drug_b_id: "drug-omeprazole", severity: 5, mechanism: "CYP2C19 competition may alter warfarin metabolism", evidence_level: "Moderate" },
  { id: "di-4", drug_a_id: "drug-simvastatin", drug_b_id: "drug-amlodipine", severity: 6, mechanism: "Amlodipine inhibits CYP3A4, increasing simvastatin levels — rhabdomyolysis risk", evidence_level: "High" },
  { id: "di-5", drug_a_id: "drug-clopidogrel", drug_b_id: "drug-omeprazole", severity: 7, mechanism: "Omeprazole inhibits CYP2C19, reducing clopidogrel activation", evidence_level: "High" },
  { id: "di-6", drug_a_id: "drug-fluoxetine", drug_b_id: "drug-metoprolol", severity: 6, mechanism: "Fluoxetine inhibits CYP2D6, increasing metoprolol levels", evidence_level: "High" },
  { id: "di-7", drug_a_id: "drug-ibuprofen", drug_b_id: "drug-warfarin", severity: 9, mechanism: "NSAID + anticoagulant — high GI bleeding risk", evidence_level: "High" },
  { id: "di-8", drug_a_id: "drug-ibuprofen", drug_b_id: "drug-aspirin", severity: 7, mechanism: "Ibuprofen blocks aspirin's antiplatelet effect", evidence_level: "High" },
  { id: "di-9", drug_a_id: "drug-ibuprofen", drug_b_id: "drug-lisinopril", severity: 5, mechanism: "NSAIDs reduce ACE inhibitor efficacy and increase nephrotoxicity risk", evidence_level: "High" },
];

export const MOCK_DRUG_ENZYME_EFFECTS: DrugEnzymeEffect[] = [
  { id: "dee-1", drug_id: "drug-fluoxetine", enzyme_id: "enz-cyp2d6", effect: "inhibits", potency: 0.9 },
  { id: "dee-2", drug_id: "drug-fluoxetine", enzyme_id: "enz-cyp2c19", effect: "inhibits", potency: 0.6 },
  { id: "dee-3", drug_id: "drug-omeprazole", enzyme_id: "enz-cyp2c19", effect: "inhibits", potency: 0.7 },
  { id: "dee-4", drug_id: "drug-amlodipine", enzyme_id: "enz-cyp3a4", effect: "inhibits", potency: 0.4 },
];

export const MOCK_ENZYME_METABOLISMS: EnzymeMetabolism[] = [
  { id: "em-1", enzyme_id: "enz-cyp2c9", drug_id: "drug-warfarin", rate: "normal" },
  { id: "em-2", enzyme_id: "enz-cyp2d6", drug_id: "drug-metoprolol", rate: "normal" },
  { id: "em-3", enzyme_id: "enz-cyp3a4", drug_id: "drug-simvastatin", rate: "fast" },
  { id: "em-4", enzyme_id: "enz-cyp2c19", drug_id: "drug-clopidogrel", rate: "normal" },
  { id: "em-5", enzyme_id: "enz-cyp2c19", drug_id: "drug-omeprazole", rate: "normal" },
  { id: "em-6", enzyme_id: "enz-cyp2c9", drug_id: "drug-ibuprofen", rate: "normal" },
  { id: "em-7", enzyme_id: "enz-cyp3a4", drug_id: "drug-amlodipine", rate: "normal" },
];

export const MOCK_DRUG_TREATMENTS: DrugTreatment[] = [
  { id: "dt-1", drug_id: "drug-warfarin", condition_id: "cond-afib" },
  { id: "dt-2", drug_id: "drug-metoprolol", condition_id: "cond-hypertension" },
  { id: "dt-3", drug_id: "drug-metoprolol", condition_id: "cond-afib" },
  { id: "dt-4", drug_id: "drug-lisinopril", condition_id: "cond-hypertension" },
  { id: "dt-5", drug_id: "drug-metformin", condition_id: "cond-t2d" },
  { id: "dt-6", drug_id: "drug-fluoxetine", condition_id: "cond-depression" },
  { id: "dt-7", drug_id: "drug-omeprazole", condition_id: "cond-gerd" },
  { id: "dt-8", drug_id: "drug-simvastatin", condition_id: "cond-hyperlipidemia" },
  { id: "dt-9", drug_id: "drug-ibuprofen", condition_id: "cond-osteoarthritis" },
  { id: "dt-10", drug_id: "drug-amlodipine", condition_id: "cond-hypertension" },
  { id: "dt-11", drug_id: "drug-levothyroxine", condition_id: "cond-hypothyroid" },
  { id: "dt-12", drug_id: "drug-valsartan", condition_id: "cond-hypertension" },
  { id: "dt-13", drug_id: "drug-losartan", condition_id: "cond-hypertension" },
];

export const MOCK_DRUG_CONTRAINDICATIONS: DrugContraindication[] = [
  { id: "dc-1", drug_id: "drug-ibuprofen", condition_id: "cond-gi-bleeding", reason: "NSAIDs increase GI bleeding risk" },
  { id: "dc-2", drug_id: "drug-aspirin", condition_id: "cond-gi-bleeding", reason: "Aspirin increases GI bleeding risk" },
  { id: "dc-3", drug_id: "drug-metformin", condition_id: "cond-gi-bleeding", reason: "May exacerbate GI symptoms" },
];

export const MOCK_PATIENT_CONDITIONS: PatientCondition[] = [
  { id: "pc-1", patient_id: "patient-raj", condition_id: "cond-afib", severity: "moderate", diagnosed_date: "2022-03-15" },
  { id: "pc-2", patient_id: "patient-raj", condition_id: "cond-hypertension", severity: "moderate", diagnosed_date: "2019-06-20" },
  { id: "pc-3", patient_id: "patient-raj", condition_id: "cond-t2d", severity: "mild", diagnosed_date: "2020-11-01" },
  { id: "pc-4", patient_id: "patient-raj", condition_id: "cond-depression", severity: "mild", diagnosed_date: "2024-07-01" },
  { id: "pc-5", patient_id: "patient-raj", condition_id: "cond-gerd", severity: "moderate", diagnosed_date: "2023-05-10" },
  { id: "pc-6", patient_id: "patient-raj", condition_id: "cond-hyperlipidemia", severity: "moderate", diagnosed_date: "2018-09-15" },
  { id: "pc-7", patient_id: "patient-maria", condition_id: "cond-hypothyroid", severity: "mild", diagnosed_date: "2023-01-10" },
  { id: "pc-8", patient_id: "patient-maria", condition_id: "cond-t2d", severity: "mild", diagnosed_date: "2023-12-05" },
  { id: "pc-9", patient_id: "patient-maria", condition_id: "cond-hypertension", severity: "mild", diagnosed_date: "2024-04-20" },
  { id: "pc-10", patient_id: "patient-john", condition_id: "cond-hypertension", severity: "severe", diagnosed_date: "2018-05-01" },
  { id: "pc-11", patient_id: "patient-john", condition_id: "cond-hyperlipidemia", severity: "moderate", diagnosed_date: "2019-03-15" },
  { id: "pc-12", patient_id: "patient-john", condition_id: "cond-gerd", severity: "mild", diagnosed_date: "2023-08-01" },
  { id: "pc-13", patient_id: "patient-emma", condition_id: "cond-depression", severity: "moderate", diagnosed_date: "2023-06-15" },
  { id: "pc-14", patient_id: "patient-emma", condition_id: "cond-hypothyroid", severity: "mild", diagnosed_date: "2023-11-01" },
  { id: "pc-15", patient_id: "patient-emma", condition_id: "cond-osteoarthritis", severity: "moderate", diagnosed_date: "2024-02-10" },
  { id: "pc-16", patient_id: "patient-emma", condition_id: "cond-gerd", severity: "mild", diagnosed_date: "2024-05-20" },
  { id: "pc-17", patient_id: "patient-emma", condition_id: "cond-hypertension", severity: "mild", diagnosed_date: "2024-07-01" },
];

export const MOCK_PATIENT_GENOTYPES: PatientGenotype[] = [
  { id: "pg-1", patient_id: "patient-raj", gene_variant_id: "gv-cyp2c9-pm" },
  { id: "pg-2", patient_id: "patient-john", gene_variant_id: "gv-cyp2c19-pm" },
  { id: "pg-3", patient_id: "patient-emma", gene_variant_id: "gv-cyp2d6-um" },
];

export const MOCK_GENE_ENZYME_EFFECTS: GeneEnzymeEffect[] = [
  { id: "gee-1", gene_variant_id: "gv-cyp2c9-pm", enzyme_id: "enz-cyp2c9", effect: "reduced_activity" },
  { id: "gee-2", gene_variant_id: "gv-cyp2d6-um", enzyme_id: "enz-cyp2d6", effect: "increased_activity" },
  { id: "gee-3", gene_variant_id: "gv-cyp2c19-pm", enzyme_id: "enz-cyp2c19", effect: "no_activity" },
];

export const MOCK_DRUG_RECALLS: DrugRecall[] = [
  { id: "recall-1", drug_id: "drug-valsartan", manufacturer_id: "mfr-zhejiang", recall_date: "2025-11-15", reason: "NDMA contamination above acceptable intake limits", fda_id: "FDA-2025-RC-0847" },
];

// ============================================================
// HELPER FUNCTIONS
// ============================================================

export function getMockPatientFull(patientId: string): Patient | null {
  const patient = MOCK_PATIENTS.find((p) => p.id === patientId);
  if (!patient) return null;

  const admission = MOCK_ADMISSIONS.find((a) => a.patient_id === patientId && a.status === "admitted");
  const room = admission ? MOCK_ROOMS.find((r) => r.id === admission.room_id) : undefined;
  const emergency_contact = MOCK_EMERGENCY_CONTACTS.find((ec) => ec.patient_id === patientId);

  const assignments = MOCK_DOCTOR_ASSIGNMENTS.filter((da) => da.patient_id === patientId);
  const primaryAssignment = assignments.find((a) => a.is_primary);
  const assigned_doctor = primaryAssignment ? MOCK_DOCTORS.find((d) => d.id === primaryAssignment.doctor_id) : undefined;

  const medications = MOCK_PATIENT_MEDICATIONS
    .filter((pm) => pm.patient_id === patientId)
    .map((pm) => ({ ...pm, drug: MOCK_DRUGS.find((d) => d.id === pm.drug_id) }));

  const conditions = MOCK_PATIENT_CONDITIONS
    .filter((pc) => pc.patient_id === patientId)
    .map((pc) => ({ ...pc, condition: MOCK_CONDITIONS.find((c) => c.id === pc.condition_id) }));

  const genotypes = MOCK_PATIENT_GENOTYPES
    .filter((pg) => pg.patient_id === patientId)
    .map((pg) => ({ ...pg, gene_variant: MOCK_GENE_VARIANTS.find((gv) => gv.id === pg.gene_variant_id) }));

  const patientVitals = MOCK_VITALS.filter((v) => v.patient_id === patientId).sort((a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime());

  return {
    ...patient,
    room_id: room?.id,
    room,
    admission: admission ? { ...admission, room } : undefined,
    emergency_contact,
    assigned_doctor,
    medications,
    conditions,
    genotypes,
    latest_vitals: patientVitals[0] ?? undefined,
    vitals_history: patientVitals,
  };
}

export function getMockNursingStation() {
  return MOCK_PATIENTS.map((p) => {
    const admission = MOCK_ADMISSIONS.find((a) => a.patient_id === p.id && a.status === "admitted");
    const room = admission ? MOCK_ROOMS.find((r) => r.id === admission.room_id) : undefined;
    const primaryDoc = MOCK_DOCTOR_ASSIGNMENTS.find((da) => da.patient_id === p.id && da.is_primary);
    const doctor = primaryDoc ? MOCK_DOCTORS.find((d) => d.id === primaryDoc.doctor_id) : undefined;
    const latestVitals = MOCK_VITALS
      .filter((v) => v.patient_id === p.id)
      .sort((a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime())[0];
    const medCount = MOCK_PATIENT_MEDICATIONS.filter((pm) => pm.patient_id === p.id).length;
    const pendingInstructions = MOCK_INSTRUCTIONS.filter((ins) => ins.patient_id === p.id && ins.status !== "completed" && ins.status !== "cancelled").length;
    const emergency_contact = MOCK_EMERGENCY_CONTACTS.find((ec) => ec.patient_id === p.id);

    const patientDrugIds = MOCK_PATIENT_MEDICATIONS.filter((pm) => pm.patient_id === p.id).map((pm) => pm.drug_id);
    const alertCount = MOCK_DRUG_INTERACTIONS.filter(
      (di) => patientDrugIds.includes(di.drug_a_id) && patientDrugIds.includes(di.drug_b_id)
    ).length;

    return {
      ...p,
      room,
      admission,
      doctor,
      emergency_contact,
      latest_vitals: latestVitals,
      medication_count: medCount,
      pending_instructions: pendingInstructions,
      alert_count: alertCount,
    };
  });
}

export function getMockPrescriptionCheck(patientId: string, newDrugName: string): InteractionChain[] {
  if (patientId === "patient-raj" && newDrugName.toLowerCase() === "ibuprofen") {
    return [
      { type: "direct", risk_level: "critical", drugs_involved: ["Ibuprofen", "Warfarin"], mechanism: "NSAID + Anticoagulant → High GI bleeding risk", explanation: "Ibuprofen inhibits COX-1, reducing gastric mucosal protection. Combined with Warfarin's anticoagulant effect, this dramatically increases the risk of gastrointestinal hemorrhage.", evidence_level: "High" },
      { type: "direct", risk_level: "high", drugs_involved: ["Ibuprofen", "Aspirin"], mechanism: "Ibuprofen blocks Aspirin's antiplatelet binding site", explanation: "Ibuprofen competitively binds to COX-1, preventing Aspirin from irreversibly acetylating the enzyme.", evidence_level: "High" },
      { type: "enzyme_cascade", risk_level: "high", drugs_involved: ["Ibuprofen", "Warfarin", "CYP2C9"], mechanism: "Both compete for CYP2C9 → elevated Warfarin levels", explanation: "Both drugs are metabolized by CYP2C9. Raj's CYP2C9 *2/*3 poor metabolizer status further compounds this risk.", evidence_level: "Moderate" },
    ];
  }
  return [];
}

export function getMockRecallImpact(drugName: string) {
  if (drugName.toLowerCase() === "valsartan") {
    const recall = MOCK_DRUG_RECALLS[0];
    const affectedPatients = MOCK_PATIENTS.filter((p) =>
      MOCK_PATIENT_MEDICATIONS.some((pm) => pm.patient_id === p.id && pm.drug_id === "drug-valsartan")
    );
    return { recall, affected_patients: affectedPatients };
  }
  return { recall: null, affected_patients: [] };
}

export function getMockAlternatives(patientId: string, newDrugName: string): AlternativeDrug[] {
  if (patientId === "patient-raj" && newDrugName.toLowerCase() === "ibuprofen") {
    return [
      { drug: MOCK_DRUGS.find((d) => d.id === "drug-acetaminophen")!, risk_level: "low", reason: "Acetaminophen provides analgesic effect without COX inhibition. Safe with Warfarin at recommended doses.", interactions_avoided: 3 },
      { drug: MOCK_DRUGS.find((d) => d.id === "drug-diclofenac-topical")!, risk_level: "low", reason: "Topical Diclofenac delivers local anti-inflammatory action with minimal systemic absorption.", interactions_avoided: 2 },
    ];
  }
  return [];
}
