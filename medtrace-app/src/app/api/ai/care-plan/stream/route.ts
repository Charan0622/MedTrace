import { getProviderAndKey } from "@/lib/ai-client";
import { getDb } from "@/lib/db";
import { getCarePlanSystemPrompt } from "@/lib/care-plan-prompts";
import OpenAI from "openai";

type Row = Record<string, unknown>;

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(request: Request) {
  const { key } = getProviderAndKey(request);
  const body = await request.json();
  const { patient_id, plan_type } = body as { patient_id: string; plan_type: "current" | "discharge" };

  if (!patient_id || !key) {
    return new Response(JSON.stringify({ error: "Missing patient_id or key" }), { status: 400 });
  }

  const db = getDb();
  const patient = db.prepare("SELECT * FROM patients WHERE id = ?").get(patient_id) as Row | undefined;
  if (!patient) return new Response(JSON.stringify({ error: "Patient not found" }), { status: 404 });

  const admission = db.prepare("SELECT * FROM admissions WHERE patient_id = ? AND status = 'admitted'").get(patient_id) as Row | undefined;
  const meds = db.prepare("SELECT pm.*, d.name as drug_name, d.drug_class FROM patient_medications pm JOIN drugs d ON d.id = pm.drug_id WHERE pm.patient_id = ? AND pm.status = 'active'").all(patient_id) as Row[];
  const conditions = db.prepare("SELECT c.name, c.category, pc.severity FROM patient_conditions pc JOIN conditions c ON c.id = pc.condition_id WHERE pc.patient_id = ?").all(patient_id) as Row[];
  const allergies = db.prepare("SELECT allergen, reaction, severity FROM allergies WHERE patient_id = ?").all(patient_id) as Row[];
  const vitals = db.prepare("SELECT * FROM vital_signs WHERE patient_id = ? ORDER BY recorded_at DESC LIMIT 5").all(patient_id) as Row[];
  const labs = db.prepare("SELECT test_name, value, unit, reference_low, reference_high, status FROM lab_results WHERE patient_id = ? ORDER BY resulted_at DESC LIMIT 15").all(patient_id) as Row[];
  const genotypes = db.prepare("SELECT gv.gene, gv.variant, gv.type FROM patient_genotypes pg JOIN gene_variants gv ON gv.id = pg.gene_variant_id WHERE pg.patient_id = ?").all(patient_id) as Row[];
  const notes = db.prepare("SELECT author, note_type, content, created_at FROM nurse_notes WHERE patient_id = ? ORDER BY created_at DESC LIMIT 5").all(patient_id) as Row[];

  const context = `PATIENT: ${patient.name}, ${patient.age}y ${patient.sex}, Blood: ${patient.blood_group}
ADMISSION: ${admission?.admission_date ?? "N/A"} | Reason: ${admission?.reason ?? "N/A"} | Dx: ${admission?.diagnosis ?? "N/A"}
ALLERGIES: ${allergies.length > 0 ? allergies.map((a) => `${a.allergen} (${a.severity}: ${a.reaction})`).join(", ") : "NKDA"}
CONDITIONS: ${conditions.map((c) => `${c.name} (${c.category}, ${c.severity})`).join(", ") || "None"}
GENETICS: ${genotypes.length > 0 ? genotypes.map((g) => `${g.gene} ${g.variant}: ${String(g.type).replace("_", " ")}`).join(", ") : "No genetic testing"}
MEDICATIONS (${meds.length}): ${meds.map((m) => `${m.drug_name} ${m.dose} ${m.frequency} via ${m.route} (${m.drug_class})`).join("; ") || "None"}
VITALS: ${vitals.map((v) => `[${v.recorded_at}] HR:${v.heart_rate} BP:${v.blood_pressure_sys}/${v.blood_pressure_dia} SpO2:${v.spo2}% Sugar:${v.blood_sugar} Temp:${v.temperature}°F Pain:${v.pain_level}/10`).join(" | ") || "None"}
LABS: ${labs.map((l) => `${l.test_name}: ${l.value} ${l.unit} (${l.reference_low}-${l.reference_high}) [${String(l.status).toUpperCase()}]`).join("; ") || "None"}
NOTES: ${notes.map((n) => `[${n.created_at}] ${n.author}: ${n.content}`).join("; ") || "None"}`;

  const systemPrompt = getCarePlanSystemPrompt(plan_type);
  const userPrompt = `Generate a detailed ${plan_type === "discharge" ? "DISCHARGE" : "CURRENT"} care plan using the ACTUAL patient data below.\n\n${context}`;

  const encoder = new TextEncoder();

  async function* generateChunks() {
    try {
      const client = new OpenAI({
        apiKey: key!,
        baseURL: "https://integrate.api.nvidia.com/v1",
        timeout: 120000,
      });
      const stream = await client.chat.completions.create({
        model: "nvidia/llama-3.3-nemotron-super-49b-v1",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.4,
        max_tokens: 4096,
        stream: true,
      });
      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content;
        if (text) yield encoder.encode(text);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "AI stream failed";
      yield encoder.encode(`\n\n---\n*AI Error: ${msg}*`);
    }
  }

  const iter = generateChunks();
  const readable = new ReadableStream({
    async pull(controller) {
      const { value, done } = await iter.next();
      if (done) {
        controller.close();
      } else {
        controller.enqueue(value);
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache, no-store, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
