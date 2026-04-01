"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { UserPlus, BedDouble, Phone, FileText, Loader2 } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/layout/PageHeader";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/lib/auth-context";
import { apiClient } from "@/lib/api";

interface RoomOption { id: string; room_number: string; ward: string; room_type: string; status: string }
interface DoctorOption { id: string; name: string; specialization: string }

export default function AdmitPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const [rooms, setRooms] = useState<RoomOption[]>([]);
  const [doctors, setDoctors] = useState<DoctorOption[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState(1);

  const [form, setForm] = useState({
    name: "", age: "", sex: "M", date_of_birth: "", blood_group: "O+",
    room_id: "", doctor_id: "", reason: "", diagnosis: "", notes: "",
    ec_name: "", ec_relationship: "", ec_phone: "", ec_alt_phone: "",
  });

  useEffect(() => {
    apiClient<RoomOption[]>("/api/rooms").then((res) => {
      if (res.data) setRooms(res.data.filter((r) => r.status === "available"));
    });
    // Load doctors from users API
    fetch("/api/health").then(() => {
      // Load doctors from DB
      fetch("/api/doctors").then((r) => r.json()).then((d) => {
        if (d.data) setDoctors(d.data);
      }).catch(() => {});
    });
  }, []);

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit() {
    if (!form.name || !form.room_id || !form.doctor_id || !form.reason) {
      toast("Please fill in all required fields", "error");
      return;
    }
    setSubmitting(true);
    const res = await apiClient("/api/admit", {
      method: "POST",
      body: JSON.stringify({
        patient: { name: form.name, age: parseInt(form.age) || 0, sex: form.sex, date_of_birth: form.date_of_birth || null, blood_group: form.blood_group },
        room_id: form.room_id,
        doctor_id: form.doctor_id,
        reason: form.reason,
        diagnosis: form.diagnosis || null,
        notes: form.notes || null,
        emergency_contact: form.ec_name ? { name: form.ec_name, relationship: form.ec_relationship, phone: form.ec_phone, alt_phone: form.ec_alt_phone || null } : null,
      }),
    });

    if (res.success) {
      toast("Patient admitted successfully", "success");
      router.push("/");
    } else {
      toast(res.error?.message ?? "Failed to admit patient", "error");
    }
    setSubmitting(false);
  }

  const availableRooms = rooms;

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader title="Admit New Patient" description="Complete the admission form to register a new patient" />

      {!user && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <p className="text-sm text-amber-400">Please login first to admit a patient.</p>
        </Card>
      )}

      {/* Step indicators */}
      <div className="flex items-center gap-2">
        {[{ n: 1, label: "Patient Info" }, { n: 2, label: "Admission" }, { n: 3, label: "Emergency Contact" }].map((s) => (
          <button key={s.n} onClick={() => setStep(s.n)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${step === s.n ? "bg-emerald-600 text-white" : step > s.n ? "bg-green-500/10 text-green-400 border border-green-500/30" : "bg-white/[0.04] text-[#6B7280]"}`}>
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/[0.06] text-xs">{s.n}</span>
            {s.label}
          </button>
        ))}
      </div>

      {/* Step 1: Patient Info */}
      {step === 1 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Card>
            <div className="flex items-center gap-2 mb-6"><UserPlus className="h-5 w-5 text-emerald-400" /><CardTitle>Patient Information</CardTitle></div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-[#6B7280] mb-1">Full Name *</label>
                <Input placeholder="e.g. Jane Smith" value={form.name} onChange={(e) => update("name", e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#6B7280] mb-1">Age *</label>
                <Input type="number" placeholder="45" value={form.age} onChange={(e) => update("age", e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#6B7280] mb-1">Sex *</label>
                <select value={form.sex} onChange={(e) => update("sex", e.target.value)} className="h-10 w-full rounded-lg border border-white/[0.06] bg-white/[0.04] px-3 text-sm text-[#D1D5DB] focus:border-emerald-500 focus:outline-none">
                  <option value="M">Male</option>
                  <option value="F">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#6B7280] mb-1">Date of Birth</label>
                <Input type="date" value={form.date_of_birth} onChange={(e) => update("date_of_birth", e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#6B7280] mb-1">Blood Group</label>
                <select value={form.blood_group} onChange={(e) => update("blood_group", e.target.value)} className="h-10 w-full rounded-lg border border-white/[0.06] bg-white/[0.04] px-3 text-sm text-[#D1D5DB] focus:border-emerald-500 focus:outline-none">
                  {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((bg) => <option key={bg} value={bg}>{bg}</option>)}
                </select>
              </div>
            </div>
            <div className="flex justify-end mt-6">
              <Button onClick={() => setStep(2)} disabled={!form.name || !form.age}>Next: Admission Details</Button>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Step 2: Admission Details */}
      {step === 2 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Card>
            <div className="flex items-center gap-2 mb-6"><BedDouble className="h-5 w-5 text-blue-400" /><CardTitle>Admission Details</CardTitle></div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-[#6B7280] mb-1">Room *</label>
                <select value={form.room_id} onChange={(e) => update("room_id", e.target.value)} className="h-10 w-full rounded-lg border border-white/[0.06] bg-white/[0.04] px-3 text-sm text-[#D1D5DB] focus:border-emerald-500 focus:outline-none">
                  <option value="">Select room...</option>
                  {availableRooms.map((r) => <option key={r.id} value={r.id}>Room {r.room_number} — {r.ward} ({r.room_type})</option>)}
                </select>
                {availableRooms.length === 0 && <p className="text-xs text-amber-400 mt-1">No rooms available</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-[#6B7280] mb-1">Attending Doctor *</label>
                <select value={form.doctor_id} onChange={(e) => update("doctor_id", e.target.value)} className="h-10 w-full rounded-lg border border-white/[0.06] bg-white/[0.04] px-3 text-sm text-[#D1D5DB] focus:border-emerald-500 focus:outline-none">
                  <option value="">Select doctor...</option>
                  {doctors.map((d) => <option key={d.id} value={d.id}>{d.name} — {d.specialization}</option>)}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-[#6B7280] mb-1">Reason for Admission *</label>
                <Input placeholder="e.g. Chest pain with shortness of breath" value={form.reason} onChange={(e) => update("reason", e.target.value)} />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-[#6B7280] mb-1">Diagnosis</label>
                <Input placeholder="e.g. Acute myocardial infarction" value={form.diagnosis} onChange={(e) => update("diagnosis", e.target.value)} />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-[#6B7280] mb-1">Notes</label>
                <textarea value={form.notes} onChange={(e) => update("notes", e.target.value)} placeholder="Any relevant clinical notes..." className="w-full rounded-lg border border-white/[0.06] bg-white/[0.04] px-3 py-2 text-sm text-[#D1D5DB] placeholder:text-[#6B7280] focus:border-emerald-500 focus:outline-none min-h-20 resize-y" />
              </div>
            </div>
            <div className="flex justify-between mt-6">
              <Button variant="ghost" onClick={() => setStep(1)}>Back</Button>
              <Button onClick={() => setStep(3)} disabled={!form.room_id || !form.doctor_id || !form.reason}>Next: Emergency Contact</Button>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Step 3: Emergency Contact + Submit */}
      {step === 3 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Card>
            <div className="flex items-center gap-2 mb-6"><Phone className="h-5 w-5 text-green-400" /><CardTitle>Emergency Contact</CardTitle></div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-[#6B7280] mb-1">Contact Name</label>
                <Input placeholder="e.g. John Smith" value={form.ec_name} onChange={(e) => update("ec_name", e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#6B7280] mb-1">Relationship</label>
                <select value={form.ec_relationship} onChange={(e) => update("ec_relationship", e.target.value)} className="h-10 w-full rounded-lg border border-white/[0.06] bg-white/[0.04] px-3 text-sm text-[#D1D5DB] focus:border-emerald-500 focus:outline-none">
                  <option value="">Select...</option>
                  {["Spouse", "Parent", "Child", "Sibling", "Friend", "Other"].map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#6B7280] mb-1">Phone</label>
                <Input type="tel" placeholder="555-1234" value={form.ec_phone} onChange={(e) => update("ec_phone", e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#6B7280] mb-1">Alternate Phone</label>
                <Input type="tel" placeholder="555-5678" value={form.ec_alt_phone} onChange={(e) => update("ec_alt_phone", e.target.value)} />
              </div>
            </div>

            {/* Summary */}
            <div className="mt-6 rounded-lg bg-white/[0.04] p-4">
              <div className="flex items-center gap-2 mb-3"><FileText className="h-4 w-4 text-[#6B7280]" /><span className="text-sm font-medium text-[#D1D5DB]">Admission Summary</span></div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <p className="text-[#6B7280]">Patient:</p><p className="text-[#D1D5DB]">{form.name}, {form.age}y {form.sex}</p>
                <p className="text-[#6B7280]">Blood Group:</p><p className="text-[#D1D5DB]">{form.blood_group}</p>
                <p className="text-[#6B7280]">Room:</p><p className="text-[#D1D5DB]">{rooms.find((r) => r.id === form.room_id)?.room_number ?? "—"}</p>
                <p className="text-[#6B7280]">Doctor:</p><p className="text-[#D1D5DB]">{doctors.find((d) => d.id === form.doctor_id)?.name ?? "—"}</p>
                <p className="text-[#6B7280]">Reason:</p><p className="text-[#D1D5DB]">{form.reason}</p>
                {form.diagnosis && <><p className="text-[#6B7280]">Diagnosis:</p><p className="text-[#D1D5DB]">{form.diagnosis}</p></>}
                {form.ec_name && <><p className="text-[#6B7280]">Emergency:</p><p className="text-[#D1D5DB]">{form.ec_name} ({form.ec_relationship}) — {form.ec_phone}</p></>}
              </div>
            </div>

            <div className="flex justify-between mt-6">
              <Button variant="ghost" onClick={() => setStep(2)}>Back</Button>
              <Button onClick={handleSubmit} disabled={submitting || !user}>
                {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Admitting...</> : <><UserPlus className="h-4 w-4" /> Admit Patient</>}
              </Button>
            </div>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
