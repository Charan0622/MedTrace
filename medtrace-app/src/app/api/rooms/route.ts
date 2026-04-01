import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET() {
  const db = getDb();
  const rooms = db.prepare("SELECT * FROM rooms ORDER BY floor, room_number").all();
  return NextResponse.json({ success: true, data: rooms, error: null, meta: {} });
}
