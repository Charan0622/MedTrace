import { NextResponse } from "next/server";
import { getProviderAndKey, generateAiResponse, formatAiError } from "@/lib/ai-client";
import { getDb } from "@/lib/db";

type Row = Record<string, unknown>;

export async function POST(request: Request) {
  const startTime = Date.now();
  const { provider, key } = getProviderAndKey(request);
  const db = getDb();

  // Build comprehensive patient data for each admitted patient
  const patients = db.prepare(`
    SELECT p.*, r.room_number, r.room_type, a.diagnosis, a.reason, a.admission_date, a.notes as admission_notes,
      d.name as doctor_name, d.specialization
    FROM patients p
    LEFT JOIN admissions a ON a.patient_id = p.id AND a.status = 'admitted'
    LEFT JOIN rooms r ON r.id = a.room_id
    LEFT JOIN doctor_assignments da ON da.patient_id = p.id AND da.is_primary = 1
    LEFT JOIN doctors d ON d.id = da.doctor_id
    WHERE a.status = 'admitted'
  `).all() as Row[];

  const patientDetails = patients.map((p) => {
    const pid = p.id as string;
    const vitals = db.prepare("SELECT * FROM vital_signs WHERE patient_id = ? ORDER BY recorded_at DESC LIMIT 3").all(pid) as Row[];
    const meds = db.prepare("SELECT pm.*, d.name as drug_name FROM patient_medications pm JOIN drugs d ON d.id = pm.drug_id WHERE pm.patient_id = ? AND pm.status = 'active'").all(pid) as Row[];
    const allergies = db.prepare("SELECT allergen, severity FROM allergies WHERE patient_id = ?").all(pid) as Row[];
    const pendingIns = db.prepare("SELECT instruction, priority, category FROM doctor_instructions WHERE patient_id = ? AND status IN ('pending','in_progress') ORDER BY CASE priority WHEN 'stat' THEN 0 WHEN 'urgent' THEN 1 ELSE 2 END").all(pid) as Row[];
    const recentNotes = db.prepare("SELECT author, note_type, content, created_at FROM nurse_notes WHERE patient_id = ? ORDER BY created_at DESC LIMIT 3").all(pid) as Row[];
    const abnormalLabs = db.prepare("SELECT test_name, value, unit, status FROM lab_results WHERE patient_id = ? AND status != 'normal' ORDER BY resulted_at DESC LIMIT 5").all(pid) as Row[];
    const medAdmin = db.prepare("SELECT ma.administered_at, ma.status, ma.dose_given, ma.reason, d.name as drug_name FROM medication_administration ma LEFT JOIN patient_medications pm ON pm.id = ma.medication_id LEFT JOIN drugs d ON d.id = pm.drug_id WHERE ma.patient_id = ? ORDER BY ma.administered_at DESC LIMIT 5").all(pid) as Row[];

    const v = vitals[0];
    return {
      name: p.name, age: p.age, sex: p.sex, bloodGroup: p.blood_group,
      room: p.room_number, roomType: p.room_type,
      diagnosis: p.diagnosis, reason: p.reason, admissionDate: p.admission_date,
      doctor: p.doctor_name, specialization: p.specialization,
      allergies: allergies.map((a) => `${a.allergen} (${a.severity})`),
      vitals: v ? `HR:${v.heart_rate} BP:${v.blood_pressure_sys}/${v.blood_pressure_dia} SpO2:${v.spo2}% Sugar:${v.blood_sugar} Temp:${v.temperature}°F Pain:${v.pain_level}/10 (by ${v.recorded_by} at ${v.recorded_at})` : "No vitals",
      vitalsTrend: vitals.length > 1 ? vitals.map((vt) => `[${vt.recorded_at}] HR:${vt.heart_rate} BP:${vt.blood_pressure_sys}/${vt.blood_pressure_dia} SpO2:${vt.spo2}%`).join(" → ") : "Single reading only",
      meds: meds.map((m) => `${m.drug_name} ${m.dose} ${m.frequency}`),
      pendingTasks: pendingIns.map((i) => `[${String(i.priority).toUpperCase()}] ${i.instruction}`),
      recentNotes: recentNotes.map((n) => `${n.author} (${n.note_type}): ${String(n.content).slice(0, 100)}`),
      abnormalLabs: abnormalLabs.map((l) => `${l.test_name}: ${l.value} ${l.unit} [${l.status}]`),
      heldMeds: medAdmin.filter((m) => m.status === "held").map((m) => `${m.drug_name} — ${m.reason}`),
    };
  });

  // Build structured context
  const context = patientDetails.map((p) => `
--- ${p.name} | Room ${p.room} (${p.roomType}) ---
Age: ${p.age}y ${p.sex} | Blood: ${p.bloodGroup}
Dx: ${p.diagnosis}
Admitted: ${p.admissionDate} for ${p.reason}
Attending: ${p.doctor} (${p.specialization})
Allergies: ${p.allergies.length > 0 ? p.allergies.join(", ") : "NKDA"}

VITALS: ${p.vitals}
TREND: ${p.vitalsTrend}

MEDS (${p.meds.length}): ${p.meds.join("; ")}
${p.heldMeds.length > 0 ? `HELD MEDS: ${p.heldMeds.join("; ")}` : ""}

ABNORMAL LABS: ${p.abnormalLabs.length > 0 ? p.abnormalLabs.join("; ") : "All normal"}

PENDING TASKS (${p.pendingTasks.length}):
${p.pendingTasks.join("\n") || "None"}

RECENT NOTES: ${p.recentNotes.join(" | ") || "None"}
`).join("\n========================================\n");

  if (!provider || !key) {
    // Rule-based handoff
    const report = patientDetails.map((p) => `## ${p.name} — Room ${p.room} (${p.roomType})
**Diagnosis:** ${p.diagnosis}
**Attending:** ${p.doctor} (${p.specialization})
**Allergies:** ${p.allergies.length > 0 ? p.allergies.join(", ") : "NKDA"}

**Vitals:** ${p.vitals}

**Active Medications:** ${p.meds.join("; ") || "None"}
${p.heldMeds.length > 0 ? `\n**HELD Medications:** ${p.heldMeds.join("; ")}` : ""}

**Abnormal Labs:** ${p.abnormalLabs.length > 0 ? p.abnormalLabs.join("; ") : "All normal"}

**Pending Tasks:**
${p.pendingTasks.map((t) => `- ${t}`).join("\n") || "- None"}

**Recent Notes:** ${p.recentNotes.join("; ") || "None"}`
    ).join("\n\n---\n\n");

    return NextResponse.json({
      success: true,
      data: { report: `# Shift Handoff Report\n*Generated: ${new Date().toLocaleString()} — Rule-based*\n*Add AI key at login for enhanced clinical handoff*\n\n---\n\n${report}`, ai_model: "rule-based" },
      error: null, meta: { ai_powered: false, query_time_ms: Date.now() - startTime },
    });
  }

  try {
    const report = await generateAiResponse(provider, key,
      `You are a senior clinical AI generating a SHIFT HANDOFF REPORT (SBAR format) for the incoming duty doctor and nursing team. This report must be thorough, clinically precise, and actionable.

IMPORTANT RULES:
- Reference ACTUAL patient data — real vital sign numbers, real lab values, medication doses
- Prioritize patients by acuity — sickest patients FIRST
- For each patient, clearly state what the incoming team needs to DO
- Flag any concerning trends in vitals
- Highlight held/skipped medications and WHY
- Use clinical language appropriate for physicians

Structure the report with these sections:

# Shift Handoff Report
Include date/time and unit name.

For EACH patient (ordered by acuity — most critical first), create:

## [Patient Name] — Room [Number] ([Room Type])
### Situation
One-line current status. Is the patient stable, improving, or deteriorating?

### Background
Diagnosis, admission date, reason, relevant history, allergies, genetics.

### Assessment
- Current vitals (with actual numbers) and whether they're trending better/worse
- Abnormal labs (with values and clinical significance)
- Active medications and any that were held/skipped with reasons
- Pain status and management effectiveness

### Recommendation
- Specific actions for the incoming team (numbered list)
- Pending tasks that need completion
- Medications due in the next 4 hours
- Lab draws or tests needed
- Thresholds for calling the attending

After all patients, add:

## Unit Summary
- Total patients and beds available
- Patients requiring close monitoring
- Any pending admissions or discharges
- Critical items for the incoming shift

CRITICAL RULES: Do NOT repeat patient information across sections. Each patient section should be concise (SBAR = 4 focused paragraphs). Complete the ENTIRE report for ALL patients. Do not stop mid-report.`,

      `Generate a comprehensive shift handoff report for the incoming medical team. There are ${patientDetails.length} patients currently admitted.\n\n${context}`
    );

    return NextResponse.json({
      success: true,
      data: { report, ai_model: provider },
      error: null, meta: { ai_powered: true, query_time_ms: Date.now() - startTime },
    });
  } catch (error) {
    // Fallback to structured report
    const report = patientDetails.map((p) => `## ${p.name} — Room ${p.room}\n**Dx:** ${p.diagnosis}\n**Vitals:** ${p.vitals}\n**Pending:** ${p.pendingTasks.length > 0 ? p.pendingTasks.map((t) => `- ${t}`).join("\n") : "None"}`).join("\n\n---\n\n");
    return NextResponse.json({
      success: true,
      data: { report: `# Shift Handoff Report\n*AI error: ${formatAiError(error)}*\n\n---\n\n${report}`, ai_model: "rule-based-fallback" },
      error: null, meta: { ai_powered: false, query_time_ms: Date.now() - startTime },
    });
  }
}
