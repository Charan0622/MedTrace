import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET() {
  const db = getDb();
  const doctors = db.prepare("SELECT * FROM doctors ORDER BY name").all();
  return NextResponse.json({ success: true, data: doctors, error: null, meta: {} });
}
