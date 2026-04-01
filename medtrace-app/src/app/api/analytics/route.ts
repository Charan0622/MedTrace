import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

type Row = Record<string, unknown>;

export async function GET() {
  const startTime = Date.now();
  const db = getDb();

  // === Patient Acuity Data (for Radar Charts) ===
  const patients = db.prepare(`
    SELECT p.*, r.room_number, r.room_type, a.diagnosis, a.admission_date
    FROM patients p
    LEFT JOIN admissions a ON a.patient_id = p.id AND a.status = 'admitted'
    LEFT JOIN rooms r ON r.id = a.room_id
  `).all() as Row[];

  const acuityData = patients.map((p) => {
    const pid = p.id as string;
    const v = db.prepare("SELECT * FROM vital_signs WHERE patient_id = ? ORDER BY recorded_at DESC LIMIT 1").get(pid) as Row | undefined;
    const medCount = (db.prepare("SELECT COUNT(*) as cnt FROM patient_medications WHERE patient_id = ? AND status = 'active'").get(pid) as { cnt: number }).cnt;
    const condCount = (db.prepare("SELECT COUNT(*) as cnt FROM patient_conditions WHERE patient_id = ?").get(pid) as { cnt: number }).cnt;
    const allergyCount = (db.prepare("SELECT COUNT(*) as cnt FROM allergies WHERE patient_id = ?").get(pid) as { cnt: number }).cnt;

    // Drug interaction count
    const drugIds = (db.prepare("SELECT drug_id FROM patient_medications WHERE patient_id = ? AND status = 'active'").all(pid) as { drug_id: string }[]).map((r) => r.drug_id);
    let interactionCount = 0;
    if (drugIds.length > 1) {
      const ph = drugIds.map(() => "?").join(",");
      interactionCount = (db.prepare(`SELECT COUNT(*) as cnt FROM drug_interactions WHERE drug_a_id IN (${ph}) AND drug_b_id IN (${ph})`).get(...drugIds, ...drugIds) as { cnt: number }).cnt;
    }

    // Abnormal labs
    const abnormalLabs = (db.prepare("SELECT COUNT(*) as cnt FROM lab_results WHERE patient_id = ? AND status != 'normal'").get(pid) as { cnt: number }).cnt;

    // Calculate acuity scores (0-100)
    const hr = Number(v?.heart_rate) || 75;
    const sys = Number(v?.blood_pressure_sys) || 120;
    const spo2 = Number(v?.spo2) || 98;
    const sugar = Number(v?.blood_sugar) || 100;
    const pain = Number(v?.pain_level) || 0;

    const heartScore = Math.min(100, Math.abs(hr - 75) * 2 + (hr > 100 ? 30 : 0) + (hr < 60 ? 30 : 0));
    const bpScore = Math.min(100, Math.abs(sys - 120) * 1.5 + (sys > 160 ? 40 : 0) + (sys < 90 ? 40 : 0));
    const oxygenScore = Math.min(100, (100 - spo2) * 10);
    const glucoseScore = Math.min(100, Math.abs(sugar - 100) * 0.5 + (sugar > 200 ? 30 : 0) + (sugar < 70 ? 40 : 0));
    const painScore = pain * 10;
    const interactionScore = Math.min(100, interactionCount * 20);
    const overallAcuity = Math.round((heartScore + bpScore + oxygenScore + glucoseScore + painScore + interactionScore) / 6);

    return {
      id: pid, name: p.name, age: p.age, sex: p.sex,
      room: p.room_number, roomType: p.room_type,
      diagnosis: p.diagnosis, admissionDate: p.admission_date,
      medCount, condCount, allergyCount, interactionCount, abnormalLabs,
      vitals: v ? { hr, sys, dia: Number(v.blood_pressure_dia), spo2, sugar, temp: Number(v.temperature), pain, respRate: Number(v.respiratory_rate) } : null,
      acuity: { heart: heartScore, bp: bpScore, oxygen: oxygenScore, glucose: glucoseScore, pain: painScore, interactions: interactionScore, overall: overallAcuity },
    };
  });

  // === Room Data (for Ward Map) ===
  const rooms = db.prepare("SELECT * FROM rooms ORDER BY floor, room_number").all() as Row[];
  const roomData = rooms.map((r) => {
    const patientInRoom = acuityData.find((p) => p.room === r.room_number);
    return {
      ...r,
      patient: patientInRoom ? { name: patientInRoom.name, acuity: patientInRoom.acuity.overall } : null,
    };
  });

  // === Medication Administration Timeline ===
  const medAdminTimeline = db.prepare(`
    SELECT ma.*, d.name as drug_name, p.name as patient_name, d.drug_class
    FROM medication_administration ma
    LEFT JOIN patient_medications pm ON pm.id = ma.medication_id
    LEFT JOIN drugs d ON d.id = pm.drug_id
    LEFT JOIN patients p ON p.id = ma.patient_id
    ORDER BY ma.administered_at DESC LIMIT 50
  `).all() as Row[];

  // === Drug Usage Analytics ===
  const drugUsage = db.prepare(`
    SELECT d.name, d.drug_class, COUNT(*) as prescriptions
    FROM patient_medications pm JOIN drugs d ON d.id = pm.drug_id
    WHERE pm.status = 'active'
    GROUP BY d.name ORDER BY prescriptions DESC
  `).all() as Row[];

  const drugClassDist = db.prepare(`
    SELECT d.drug_class, COUNT(*) as count
    FROM patient_medications pm JOIN drugs d ON d.id = pm.drug_id
    WHERE pm.status = 'active' AND d.drug_class IS NOT NULL
    GROUP BY d.drug_class ORDER BY count DESC
  `).all() as Row[];

  // === Condition Distribution ===
  const conditionDist = db.prepare(`
    SELECT c.name, c.category, COUNT(*) as count
    FROM patient_conditions pc JOIN conditions c ON c.id = pc.condition_id
    GROUP BY c.name ORDER BY count DESC
  `).all() as Row[];

  // === Alert Summary ===
  const alertsByPriority = db.prepare(`
    SELECT priority, COUNT(*) as count
    FROM doctor_instructions WHERE status != 'completed' AND status != 'cancelled'
    GROUP BY priority
  `).all() as Row[];

  // === Vitals Sparkline Data (all patients, last readings) ===
  const sparklines = acuityData.map((p) => {
    const vHistory = db.prepare("SELECT heart_rate, blood_pressure_sys, spo2, blood_sugar, recorded_at FROM vital_signs WHERE patient_id = ? ORDER BY recorded_at ASC").all(p.id) as Row[];
    return { name: p.name, room: p.room, vitals: vHistory };
  });

  // === Drug Interactions Network ===
  const interactionNetwork = db.prepare(`
    SELECT di.severity, da.name as drug_a, db.name as drug_b, di.mechanism
    FROM drug_interactions di
    JOIN drugs da ON da.id = di.drug_a_id
    JOIN drugs db ON db.id = di.drug_b_id
    WHERE di.drug_a_id IN (SELECT drug_id FROM patient_medications WHERE status = 'active')
      OR di.drug_b_id IN (SELECT drug_id FROM patient_medications WHERE status = 'active')
    ORDER BY di.severity DESC
  `).all() as Row[];

  // === Lab Results Summary ===
  const labSummary = db.prepare(`
    SELECT lr.test_name, lr.value, lr.unit, lr.reference_low, lr.reference_high, lr.status,
           p.name as patient_name
    FROM lab_results lr JOIN patients p ON p.id = lr.patient_id
    ORDER BY CASE lr.status WHEN 'critical' THEN 0 WHEN 'abnormal' THEN 1 ELSE 2 END, lr.resulted_at DESC
    LIMIT 30
  `).all() as Row[];

  // === Summary Stats ===
  const totalPatients = patients.length;
  const avgAcuity = Math.round(acuityData.reduce((s, p) => s + p.acuity.overall, 0) / (totalPatients || 1));
  const criticalPatients = acuityData.filter((p) => p.acuity.overall > 60).length;
  const totalMeds = (db.prepare("SELECT COUNT(*) as cnt FROM patient_medications WHERE status = 'active'").get() as { cnt: number }).cnt;
  const totalInteractions = (db.prepare("SELECT COUNT(*) as cnt FROM drug_interactions").get() as { cnt: number }).cnt;
  const pendingInstructions = (db.prepare("SELECT COUNT(*) as cnt FROM doctor_instructions WHERE status IN ('pending','in_progress')").get() as { cnt: number }).cnt;

  return NextResponse.json({
    success: true,
    data: {
      acuityData, roomData, medAdminTimeline, drugUsage, drugClassDist,
      conditionDist, alertsByPriority, sparklines, interactionNetwork, labSummary,
      stats: { totalPatients, avgAcuity, criticalPatients, totalMeds, totalInteractions, pendingInstructions },
    },
    error: null,
    meta: { query_time_ms: Date.now() - startTime },
  });
}
