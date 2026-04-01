import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET() {
  const startTime = Date.now();
  const db = getDb();

  const recalls = db.prepare(`
    SELECT dr.*, d.name as drug_name, d.drug_class, d.generic_name,
           m.name as manufacturer_name, m.country
    FROM drug_recalls dr
    LEFT JOIN drugs d ON d.id = dr.drug_id
    LEFT JOIN manufacturers m ON m.id = dr.manufacturer_id
  `).all() as Record<string, unknown>[];

  const result = recalls.map((r) => ({
    id: r.id, drug_id: r.drug_id, manufacturer_id: r.manufacturer_id,
    recall_date: r.recall_date, reason: r.reason, fda_id: r.fda_id,
    drug: { id: r.drug_id, name: r.drug_name, drug_class: r.drug_class, generic_name: r.generic_name },
    manufacturer: { id: r.manufacturer_id, name: r.manufacturer_name, country: r.country },
  }));

  return NextResponse.json({
    success: true, data: result, error: null,
    meta: { query_time_ms: Date.now() - startTime, source: "sqlite" },
  });
}
