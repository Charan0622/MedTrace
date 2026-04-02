import { NextResponse } from "next/server";
import { getProviderAndKey, generateAiResponse, formatAiError } from "@/lib/ai-client";
import { getDb } from "@/lib/db";

type Row = Record<string, unknown>;

export async function POST(request: Request) {
  const startTime = Date.now();
  const { key } = getProviderAndKey(request);
  const body = await request.json();
  const { patient_id, question, user_role } = body as { patient_id: string; question: string; user_role: string };

  if (!patient_id || !question) {
    return NextResponse.json({ success: false, data: null, error: { code: "INVALID_INPUT", message: "patient_id and question required" }, meta: {} }, { status: 400 });
  }

  if (!key) {
    return NextResponse.json({ success: true, data: { answer: "AI key required for the Clinical Copilot. Please add your API key at login.", ai_model: "none" }, error: null, meta: { ai_powered: false, query_time_ms: Date.now() - startTime } });
  }

  const db = getDb();
  const patient = db.prepare("SELECT * FROM patients WHERE id = ?").get(patient_id) as Row | undefined;
  if (!patient) return NextResponse.json({ success: false, data: null, error: { code: "NOT_FOUND", message: "Patient not found" }, meta: {} }, { status: 404 });

  const admission = db.prepare("SELECT * FROM admissions WHERE patient_id = ? AND status = 'admitted'").get(patient_id) as Row | undefined;
  const meds = db.prepare("SELECT pm.*, d.name as drug_name, d.drug_class FROM patient_medications pm JOIN drugs d ON d.id = pm.drug_id WHERE pm.patient_id = ?").all(patient_id) as Row[];
  const conditions = db.prepare("SELECT c.name, c.category, pc.severity FROM patient_conditions pc JOIN conditions c ON c.id = pc.condition_id WHERE pc.patient_id = ?").all(patient_id) as Row[];
  const allergies = db.prepare("SELECT * FROM allergies WHERE patient_id = ?").all(patient_id) as Row[];
  const genotypes = db.prepare("SELECT gv.gene, gv.variant, gv.type FROM patient_genotypes pg JOIN gene_variants gv ON gv.id = pg.gene_variant_id WHERE pg.patient_id = ?").all(patient_id) as Row[];
  const vitals = db.prepare("SELECT * FROM vital_signs WHERE patient_id = ? ORDER BY recorded_at DESC LIMIT 5").all(patient_id) as Row[];
  const labs = db.prepare("SELECT test_name, value, unit, status FROM lab_results WHERE patient_id = ? ORDER BY resulted_at DESC LIMIT 10").all(patient_id) as Row[];
  const recentNotes = db.prepare("SELECT * FROM nurse_notes WHERE patient_id = ? ORDER BY created_at DESC LIMIT 5").all(patient_id) as Row[];
  const instructions = db.prepare("SELECT di.*, d.name as doctor_name FROM doctor_instructions di LEFT JOIN doctors d ON d.id = di.doctor_id WHERE di.patient_id = ? AND di.status != 'cancelled' ORDER BY di.created_at DESC LIMIT 10").all(patient_id) as Row[];

  const context = `PATIENT: ${patient.name}, ${patient.age}y ${patient.sex}, Blood: ${patient.blood_group}
DIAGNOSIS: ${admission?.diagnosis ?? "N/A"} | REASON: ${admission?.reason ?? "N/A"}
ALLERGIES: ${allergies.length > 0 ? allergies.map((a) => `${a.allergen} (${a.severity}: ${a.reaction})`).join(", ") : "NKDA"}
MEDICATIONS: ${meds.map((m) => `${m.drug_name} ${m.dose} ${m.frequency} [${m.status}]`).join("; ") || "None"}
CONDITIONS: ${conditions.map((c) => `${c.name} (${c.severity})`).join(", ") || "None"}
PHARMACOGENOMICS: ${genotypes.map((g) => `${g.gene} ${g.variant} (${g.type})`).join(", ") || "None"}
VITALS (recent): ${vitals.map((v) => `[${v.recorded_at}] HR:${v.heart_rate} BP:${v.blood_pressure_sys}/${v.blood_pressure_dia} SpO2:${v.spo2}% Sugar:${v.blood_sugar} Pain:${v.pain_level}/10`).join(" | ") || "None"}
LABS: ${labs.map((l) => `${l.test_name}: ${l.value} ${l.unit} [${l.status}]`).join("; ") || "None"}
NOTES: ${recentNotes.map((n) => `[${n.author}] ${n.content}`).join("; ") || "None"}
INSTRUCTIONS: ${instructions.filter((i) => i.status !== "completed").map((i) => `[${i.priority}] ${i.instruction}`).join("; ") || "None"}`;

  const systemPrompt = `You are MedTrace Clinical Copilot — an expert AI clinical assistant embedded in a hospital nursing station. You have deep knowledge of pharmacology, pathophysiology, drug interactions, and evidence-based nursing practice.

${user_role === "doctor" ? "You are speaking to a PHYSICIAN — use clinical terminology, cite evidence levels, suggest differential diagnoses, reference specific lab values and vital trends, and provide medication adjustment reasoning with pharmacokinetic considerations. Consider the patient's pharmacogenomic profile when discussing drug metabolism." : "You are speaking to a NURSE — focus on bedside assessment priorities, what to monitor and how often, specific parameters that should trigger a call to the physician (with exact numbers), medication administration considerations (timing, food interactions, hold parameters), patient comfort measures, and documentation reminders."}

RULES:
- Answer using ONLY the patient data provided — never fabricate values or medications
- Reference actual numbers from their vitals, labs, and medication doses
- Always cross-check recommendations against the patient's allergy list
- If a question involves medications, consider their pharmacogenomic profile for metabolism concerns
- Be concise but thorough — every sentence should be clinically actionable
- If you're unsure about something, say so rather than guessing
- Format responses with markdown for readability (bold key values, use bullet points for lists)`;

  try {
    const answer = await generateAiResponse(key, systemPrompt, `PATIENT DATA:\n${context}\n\nQUESTION: ${question}`);
    return NextResponse.json({ success: true, data: { answer, ai_model: "nvidia" }, error: null, meta: { ai_powered: true, query_time_ms: Date.now() - startTime } });
  } catch (error) {
    return NextResponse.json({ success: false, data: null, error: { code: "AI_ERROR", message: formatAiError(error) }, meta: { query_time_ms: Date.now() - startTime } }, { status: 500 });
  }
}
