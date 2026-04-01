import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET() {
  const db = getDb();
  const patientCount = (db.prepare("SELECT COUNT(*) as cnt FROM patients").get() as { cnt: number }).cnt;
  const drugCount = (db.prepare("SELECT COUNT(*) as cnt FROM drugs").get() as { cnt: number }).cnt;

  return NextResponse.json({
    success: true,
    data: {
      status: "healthy",
      database: `SQLite — ${patientCount} patients, ${drugCount} drugs`,
      ai_engine: "User-provided at login (NVIDIA/Gemini)",
      timestamp: new Date().toISOString(),
    },
    error: null,
    meta: {},
  });
}
