import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ drug: string }> }
) {
  const { drug: drugName } = await params;
  const startTime = Date.now();
  const db = getDb();

  const drugRow = db.prepare("SELECT id FROM drugs WHERE LOWER(name) = LOWER(?)").get(drugName) as { id: string } | undefined;
  if (!drugRow) {
    return NextResponse.json({ success: true, data: { recall: null, affected_patients: [] }, error: null, meta: {} });
  }

  const recall = db.prepare("SELECT * FROM drug_recalls WHERE drug_id = ?").get(drugRow.id);
  const affected = db.prepare(`
    SELECT DISTINCT p.* FROM patients p
    JOIN patient_medications pm ON pm.patient_id = p.id
    WHERE pm.drug_id = ? AND pm.status = 'active'
  `).all(drugRow.id);

  return NextResponse.json({
    success: true, data: { recall, affected_patients: affected }, error: null,
    meta: { query_time_ms: Date.now() - startTime, source: "sqlite" },
  });
}
