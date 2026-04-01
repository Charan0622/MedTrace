import { NextResponse } from "next/server";
import { getProviderAndKey, generateAiResponse, formatAiError } from "@/lib/ai-client";
import { getDb } from "@/lib/db";

export async function POST(request: Request) {
  const startTime = Date.now();
  const { provider, key } = getProviderAndKey(request);
  const body = await request.json();
  const { patient_id } = body as { patient_id: string };

  if (!patient_id) return NextResponse.json({ success: false, data: null, error: { code: "INVALID_INPUT", message: "patient_id required" }, meta: {} }, { status: 400 });

  const db = getDb();
  const patient = db.prepare("SELECT * FROM patients WHERE id = ?").get(patient_id) as { name: string } | undefined;
  const vitals = db.prepare("SELECT * FROM vital_signs WHERE patient_id = ? ORDER BY recorded_at DESC LIMIT 10").all(patient_id) as Record<string, unknown>[];

  if (!patient || vitals.length === 0) return NextResponse.json({ success: false, data: null, error: { code: "NO_DATA", message: "No vitals data" }, meta: {} }, { status: 404 });

  // Rule-based analysis (always runs as baseline)
  const latest = vitals[0];
  const anomalies: string[] = [];
  const recommendations: string[] = [];
  const hr = latest.heart_rate as number | null;
  const sys = latest.blood_pressure_sys as number | null;
  const dia = latest.blood_pressure_dia as number | null;
  const spo2 = latest.spo2 as number | null;
  const sugar = latest.blood_sugar as number | null;
  const temp = latest.temperature as number | null;
  const pain = latest.pain_level as number | null;

  if (hr && hr > 100) anomalies.push(`Tachycardia: HR ${hr} bpm`);
  if (hr && hr < 60) anomalies.push(`Bradycardia: HR ${hr} bpm`);
  if (sys && sys > 160) anomalies.push(`Hypertension: BP ${sys}/${dia}`);
  if (sys && sys < 90) anomalies.push(`Hypotension: BP ${sys}/${dia}`);
  if (spo2 && spo2 < 95) anomalies.push(`Low SpO2: ${spo2}%`);
  if (sugar && sugar > 200) anomalies.push(`Hyperglycemia: ${sugar} mg/dL`);
  if (sugar && sugar < 70) anomalies.push(`Hypoglycemia: ${sugar} mg/dL`);
  if (temp && temp > 100.4) anomalies.push(`Fever: ${temp}°F`);
  if (pain && pain >= 7) anomalies.push(`Severe pain: ${pain}/10`);
  if (anomalies.length > 0) recommendations.push("Notify attending physician");
  if (hr && hr > 100) recommendations.push("Continue cardiac monitoring");
  if (sugar && sugar > 200) recommendations.push("Check insulin orders");

  if (!provider || !key) {
    return NextResponse.json({ success: true, data: { patient_id, summary: anomalies.length > 0 ? `${anomalies.length} abnormal finding(s). ${anomalies[0]}.` : "All vitals within normal limits.", anomalies, recommendations, risk_level: anomalies.length >= 3 ? "critical" : anomalies.length >= 1 ? "moderate" : "safe", ai_model: "rule-based" }, error: null, meta: { ai_powered: false, query_time_ms: Date.now() - startTime } });
  }

  try {
    const vitalsText = vitals.map((v) => `[${v.recorded_at}] by ${v.recorded_by}: HR=${v.heart_rate}bpm BP=${v.blood_pressure_sys}/${v.blood_pressure_dia}mmHg SpO2=${v.spo2}% RR=${v.respiratory_rate}/min Temp=${v.temperature}°F Sugar=${v.blood_sugar}mg/dL Pain=${v.pain_level}/10 ${v.notes ? `(Note: ${v.notes})` : ""}`).join("\n");
    const text = await generateAiResponse(provider, key,
      `You are a clinical vital signs analysis AI. Analyze the patient's vital sign trends and return a JSON object with exactly these fields:
{"summary":"2-3 sentence clinical assessment referencing actual numbers and trends","anomalies":["specific finding 1 with actual values","finding 2"],"recommendations":["specific action 1","action 2"]}

Look for: trending changes between readings, correlations between vitals (e.g., rising HR with dropping BP = possible hemorrhage), values outside normal ranges, and improvement/deterioration patterns. Reference the actual numbers in your analysis. Return ONLY valid JSON, no other text.`,
      `Patient: ${patient.name}\nVitals history (${vitals.length} readings, most recent first):\n${vitalsText}`);
    const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    let result;
    try { result = JSON.parse(cleaned); } catch { result = { summary: text, anomalies, recommendations }; }
    return NextResponse.json({ success: true, data: { patient_id, ...result, risk_level: (result.anomalies?.length ?? 0) >= 2 ? "high" : (result.anomalies?.length ?? 0) >= 1 ? "moderate" : "safe", ai_model: provider }, error: null, meta: { ai_powered: true, query_time_ms: Date.now() - startTime } });
  } catch (error) {
    return NextResponse.json({ success: true, data: { patient_id, summary: `${anomalies.length > 0 ? anomalies[0] : "Vitals normal."} (AI: ${formatAiError(error)})`, anomalies, recommendations, risk_level: anomalies.length >= 2 ? "high" : anomalies.length >= 1 ? "moderate" : "safe", ai_model: "rule-based-fallback" }, error: null, meta: { ai_powered: false, query_time_ms: Date.now() - startTime } });
  }
}
