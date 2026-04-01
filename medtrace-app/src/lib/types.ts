// ============================================================
// MedTrace — App-Wide TypeScript Interfaces
// Hospital Nursing Station + Drug Safety Platform
// ============================================================

// === Auth & Roles ===

export type UserRole = "doctor" | "nurse" | "admin";

export interface User {
  id: string;
  name: string;
  role: UserRole;
  department: string;
  employee_id: string;
  email: string;
}

// === Hospital Infrastructure ===

export interface Room {
  id: string;
  room_number: string;
  floor: number;
  ward: string;
  bed_count: number;
  room_type: "general" | "icu" | "private" | "semi-private";
  status: "occupied" | "available" | "maintenance";
}

// === Core Entities ===

export interface Patient {
  id: string;
  name: string;
  age: number;
  sex: "M" | "F" | "Other";
  date_of_birth: string;
  blood_group: string;
  created_at: string;
  // Nursing station fields
  room_id?: string;
  room?: Room;
  admission?: Admission;
  emergency_contact?: EmergencyContact;
  assigned_doctor?: Doctor;
  medications?: PatientMedication[];
  conditions?: PatientCondition[];
  genotypes?: PatientGenotype[];
  latest_vitals?: VitalSigns;
  vitals_history?: VitalSigns[];
}

export interface EmergencyContact {
  id: string;
  patient_id: string;
  name: string;
  relationship: string;
  phone: string;
  alt_phone?: string | null;
}

export interface Admission {
  id: string;
  patient_id: string;
  room_id: string;
  room?: Room;
  admission_date: string;
  discharge_date: string | null;
  reason: string;
  diagnosis: string;
  status: "admitted" | "discharged" | "transferred";
  admitted_by: string; // doctor ID
  notes: string | null;
}

export interface Doctor {
  id: string;
  name: string;
  specialization: string;
  department: string;
  phone: string;
  employee_id: string;
}

export interface DoctorAssignment {
  id: string;
  patient_id: string;
  doctor_id: string;
  doctor?: Doctor;
  condition: string;
  assigned_date: string;
  is_primary: boolean;
  notes: string | null;
}

// === Vitals & Monitoring ===

export interface VitalSigns {
  id: string;
  patient_id: string;
  recorded_at: string;
  recorded_by: string; // nurse/doctor name
  heart_rate: number | null;       // bpm
  blood_pressure_sys: number | null; // mmHg
  blood_pressure_dia: number | null; // mmHg
  temperature: number | null;       // °F
  spo2: number | null;              // %
  respiratory_rate: number | null;   // breaths/min
  blood_sugar: number | null;        // mg/dL
  weight: number | null;             // kg
  pain_level: number | null;         // 0-10
  notes: string | null;
}

export type VitalType = "heart_rate" | "blood_pressure" | "temperature" | "spo2" | "respiratory_rate" | "blood_sugar" | "pain_level";

export interface VitalThreshold {
  type: VitalType;
  label: string;
  unit: string;
  critical_low?: number;
  low?: number;
  high?: number;
  critical_high?: number;
}

// === Medication Administration ===

export interface MedicationAdministration {
  id: string;
  patient_id: string;
  medication_id: string; // patient_medication ID
  drug?: Drug;
  administered_at: string;
  administered_by: string; // nurse name
  dose_given: string;
  status: "given" | "skipped" | "refused" | "held";
  reason?: string | null; // reason if skipped/refused/held
  notes: string | null;
}

// === Doctor Instructions ===

export interface DoctorInstruction {
  id: string;
  patient_id: string;
  doctor_id: string;
  doctor?: Doctor;
  instruction: string;
  category: "medication" | "diet" | "activity" | "monitoring" | "procedure" | "other";
  priority: "routine" | "urgent" | "stat";
  created_at: string;
  completed_at: string | null;
  completed_by: string | null;
  status: "pending" | "in_progress" | "completed" | "cancelled";
}

// === Existing Drug Safety Types (kept) ===

export interface Drug {
  id: string;
  name: string;
  generic_name: string | null;
  drug_class: string | null;
  efficacy_score: number | null;
}

export interface Enzyme {
  id: string;
  name: string;
  gene: string | null;
  function: string | null;
}

export interface Condition {
  id: string;
  name: string;
  category: string | null;
  icd_code: string | null;
}

export interface GeneVariant {
  id: string;
  gene: string;
  variant: string;
  type: string | null;
  frequency: number | null;
}

export interface Manufacturer {
  id: string;
  name: string;
  country: string | null;
}

export interface PatientMedication {
  id: string;
  patient_id: string;
  drug_id: string;
  drug?: Drug;
  dose: string | null;
  frequency: string | null;
  route: string | null;       // oral, IV, topical, etc.
  start_date: string | null;
  end_date: string | null;
  prescriber: string | null;
  status: "active" | "discontinued" | "completed";
  instructions: string | null;
  next_due?: string | null;
}

export interface DrugInteraction {
  id: string;
  drug_a_id: string;
  drug_b_id: string;
  drug_a?: Drug;
  drug_b?: Drug;
  severity: number;
  mechanism: string | null;
  evidence_level: string | null;
}

export interface DrugEnzymeEffect {
  id: string;
  drug_id: string;
  enzyme_id: string;
  drug?: Drug;
  enzyme?: Enzyme;
  effect: "inhibits" | "induces";
  potency: number | null;
}

export interface EnzymeMetabolism {
  id: string;
  enzyme_id: string;
  drug_id: string;
  enzyme?: Enzyme;
  drug?: Drug;
  rate: string | null;
}

export interface DrugTreatment {
  id: string;
  drug_id: string;
  condition_id: string;
  drug?: Drug;
  condition?: Condition;
}

export interface DrugContraindication {
  id: string;
  drug_id: string;
  condition_id: string;
  drug?: Drug;
  condition?: Condition;
  reason: string | null;
}

export interface PatientCondition {
  id: string;
  patient_id: string;
  condition_id: string;
  condition?: Condition;
  severity: string | null;
  diagnosed_date: string | null;
}

export interface PatientGenotype {
  id: string;
  patient_id: string;
  gene_variant_id: string;
  gene_variant?: GeneVariant;
}

export interface GeneEnzymeEffect {
  id: string;
  gene_variant_id: string;
  enzyme_id: string;
  gene_variant?: GeneVariant;
  enzyme?: Enzyme;
  effect: string | null;
}

export interface DrugRecall {
  id: string;
  drug_id: string;
  manufacturer_id: string;
  drug?: Drug;
  manufacturer?: Manufacturer;
  recall_date: string | null;
  reason: string | null;
  fda_id: string | null;
}

// === Risk & Analysis ===

export type RiskLevel = "critical" | "high" | "moderate" | "low" | "safe";

export interface InteractionChain {
  type: "direct" | "enzyme_cascade" | "contraindication" | "pharmacogenomic";
  risk_level: RiskLevel;
  drugs_involved: string[];
  mechanism: string;
  explanation: string;
  evidence_level?: string;
}

export interface PrescriptionCheckResult {
  patient_id: string;
  new_drug: string;
  overall_risk: RiskLevel;
  interactions: InteractionChain[];
  ai_powered: boolean;
}

export interface AlternativeDrug {
  drug: Drug;
  risk_level: RiskLevel;
  reason: string;
  interactions_avoided: number;
}

// === API Response ===

export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: ApiError | null;
  meta: {
    ai_powered?: boolean;
    query_time_ms?: number;
  };
}

export interface ApiError {
  code: string;
  message: string;
}

// === Voice ===

export interface VoiceExtractionResult {
  raw_text: string;
  entities: {
    drugs: string[];
    conditions: string[];
    dosages: string[];
    patient_name?: string;
  };
  confidence: number;
}

// === AI Analysis ===

export interface AiVitalsAnalysis {
  patient_id: string;
  summary: string;
  anomalies: string[];
  recommendations: string[];
  risk_level: RiskLevel;
  ai_model: string;
}

export interface ShiftHandoffReport {
  generated_at: string;
  patient_summaries: {
    patient_id: string;
    patient_name: string;
    room: string;
    key_events: string[];
    pending_tasks: string[];
    vitals_trend: string;
  }[];
  ai_model: string;
}

// === Recall ===

export interface RecallImpact {
  recall: DrugRecall;
  affected_patients: Patient[];
  total_affected: number;
  alternatives: AlternativeDrug[];
}
