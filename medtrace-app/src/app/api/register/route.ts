import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function POST(request: Request) {
  const db = getDb();
  const body = await request.json();
  const { name, role, department, email, password } = body;

  if (!name || !role || !department || !email || !password) {
    return NextResponse.json({ success: false, data: null, error: { code: "INVALID_INPUT", message: "All fields are required" }, meta: {} }, { status: 400 });
  }

  if (role !== "doctor" && role !== "nurse") {
    return NextResponse.json({ success: false, data: null, error: { code: "INVALID_ROLE", message: "Role must be doctor or nurse" }, meta: {} }, { status: 400 });
  }

  // Check if email already exists
  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
  if (existing) {
    return NextResponse.json({ success: false, data: null, error: { code: "EMAIL_EXISTS", message: "An account with this email already exists" }, meta: {} }, { status: 409 });
  }

  const id = `user-${Date.now()}`;
  const employeeId = `${role === "doctor" ? "DOC" : "NUR"}-${Math.floor(1000 + Math.random() * 9000)}`;

  db.prepare("INSERT INTO users (id, name, role, department, employee_id, email, password) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .run(id, name, role, department, employeeId, email, password);

  // If doctor, also add to doctors table
  if (role === "doctor") {
    db.prepare("INSERT INTO doctors (id, name, specialization, department, phone, employee_id) VALUES (?, ?, ?, ?, ?, ?)")
      .run(`doc-${Date.now()}`, name, department, department, "", employeeId);
  }

  return NextResponse.json({
    success: true,
    data: { id, name, role, department, employee_id: employeeId, email },
    error: null, meta: {},
  }, { status: 201 });
}

// GET — fetch all registered users for login
export async function GET() {
  const db = getDb();
  const users = db.prepare("SELECT id, name, role, department, employee_id, email FROM users ORDER BY name").all();
  return NextResponse.json({ success: true, data: users, error: null, meta: {} });
}
