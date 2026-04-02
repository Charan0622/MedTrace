import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function POST(request: Request) {
  const db = getDb();
  const body = await request.json();
  const { email, password } = body;

  if (!email || !password) {
    return NextResponse.json(
      { success: false, data: null, error: { code: "INVALID_INPUT", message: "Email and password are required" }, meta: {} },
      { status: 400 }
    );
  }

  const user = db.prepare(
    "SELECT id, name, role, department, employee_id, email FROM users WHERE email = ? AND password = ?"
  ).get(email, password) as Record<string, unknown> | undefined;

  if (!user) {
    return NextResponse.json(
      { success: false, data: null, error: { code: "INVALID_CREDENTIALS", message: "Invalid email or password" }, meta: {} },
      { status: 401 }
    );
  }

  return NextResponse.json({ success: true, data: user, error: null, meta: {} });
}
