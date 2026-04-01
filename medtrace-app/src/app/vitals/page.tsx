"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Save, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/layout/PageHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import { useAuth } from "@/lib/auth-context";
import { apiClient } from "@/lib/api";

interface PatientOption {
  id: string;
  name: string;
  room?: { room_number: string };
}

export default function VitalsPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <VitalsContent />
    </Suspense>
  );
}

function VitalsContent() {
  const searchParams = useSearchParams();
  const preselected = searchParams.get("patient");
  const { user } = useAuth();

  const [patients, setPatients] = useState<PatientOption[]>([]);
  const [selectedPatient, setSelectedPatient] = useState(preselected ?? "");
  const [saved, setSaved] = useState(false);
  const [vitals, setVitals] = useState({
    heart_rate: "",
    blood_pressure_sys: "",
    blood_pressure_dia: "",
    temperature: "",
    spo2: "",
    respiratory_rate: "",
    blood_sugar: "",
    weight: "",
    pain_level: "",
    notes: "",
  });

  useEffect(() => {
    apiClient<PatientOption[]>("/api/patients").then((res) => {
      if (res.success && res.data) setPatients(res.data);
    });
  }, []);

  function handleChange(field: string, value: string) {
    setVitals((prev) => ({ ...prev, [field]: value }));
    setSaved(false);
  }

  async function handleSave() {
    if (!user) return;
    const payload = {
      patient_id: selectedPatient,
      recorded_by: user.name,
      heart_rate: vitals.heart_rate ? Number(vitals.heart_rate) : null,
      blood_pressure_sys: vitals.blood_pressure_sys ? Number(vitals.blood_pressure_sys) : null,
      blood_pressure_dia: vitals.blood_pressure_dia ? Number(vitals.blood_pressure_dia) : null,
      temperature: vitals.temperature ? Number(vitals.temperature) : null,
      spo2: vitals.spo2 ? Number(vitals.spo2) : null,
      respiratory_rate: vitals.respiratory_rate ? Number(vitals.respiratory_rate) : null,
      blood_sugar: vitals.blood_sugar ? Number(vitals.blood_sugar) : null,
      weight: vitals.weight ? Number(vitals.weight) : null,
      pain_level: vitals.pain_level ? Number(vitals.pain_level) : null,
      notes: vitals.notes || null,
    };
    const res = await apiClient("/api/vitals", { method: "POST", body: JSON.stringify(payload) });
    if (res.success) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
  }

  const selectedName = patients.find((p) => p.id === selectedPatient)?.name;
  const selectedRoom = patients.find((p) => p.id === selectedPatient)?.room?.room_number;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Record Vitals"
        description={user ? `Recording as ${user.name}` : "Login to record vitals"}
      />

      <Card>
        <div className="mb-6">
          <label className="block text-sm font-medium text-[#D1D5DB] mb-2">Select Patient</label>
          <select
            value={selectedPatient}
            onChange={(e) => setSelectedPatient(e.target.value)}
            className="h-10 w-full max-w-md rounded-lg border border-white/[0.06] bg-white/[0.04] px-3 text-sm text-[#D1D5DB] focus:border-emerald-500 focus:outline-none"
          >
            <option value="">Select a patient...</option>
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — Room {p.room?.room_number ?? "—"}
              </option>
            ))}
          </select>
        </div>

        {selectedPatient && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="rounded-lg bg-white/[0.04] px-4 py-3">
              <p className="text-sm text-[#D1D5DB]">Recording vitals for <strong>{selectedName}</strong> — Room {selectedRoom}</p>
              <p className="text-xs text-[#6B7280]">{new Date().toLocaleString()}</p>
            </div>

            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
              {[
                { key: "heart_rate", label: "Heart Rate", unit: "bpm", placeholder: "72" },
                { key: "blood_pressure_sys", label: "BP Systolic", unit: "mmHg", placeholder: "120" },
                { key: "blood_pressure_dia", label: "BP Diastolic", unit: "mmHg", placeholder: "80" },
                { key: "temperature", label: "Temperature", unit: "°F", placeholder: "98.6" },
                { key: "spo2", label: "SpO2", unit: "%", placeholder: "98" },
                { key: "respiratory_rate", label: "Resp Rate", unit: "/min", placeholder: "16" },
                { key: "blood_sugar", label: "Blood Sugar", unit: "mg/dL", placeholder: "100" },
                { key: "weight", label: "Weight", unit: "kg", placeholder: "70" },
              ].map((field) => (
                <div key={field.key}>
                  <label className="block text-xs font-medium text-[#6B7280] mb-1">
                    {field.label} <span className="text-[#6B7280]">({field.unit})</span>
                  </label>
                  <Input
                    type="number"
                    placeholder={field.placeholder}
                    value={vitals[field.key as keyof typeof vitals]}
                    onChange={(e) => handleChange(field.key, e.target.value)}
                  />
                </div>
              ))}
            </div>

            {/* Pain Level */}
            <div>
              <label className="block text-xs font-medium text-[#6B7280] mb-2">Pain Level (0-10)</label>
              <div className="flex gap-2">
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((level) => (
                  <button
                    key={level}
                    onClick={() => handleChange("pain_level", String(level))}
                    className={`h-10 w-10 rounded-lg text-sm font-bold transition-colors ${
                      vitals.pain_level === String(level)
                        ? level >= 8 ? "bg-red-500 text-white" : level >= 5 ? "bg-amber-500 text-white" : "bg-green-500 text-white"
                        : "bg-white/[0.04] text-[#6B7280] hover:bg-white/[0.06]"
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-medium text-[#6B7280] mb-1">Notes</label>
              <textarea
                value={vitals.notes}
                onChange={(e) => handleChange("notes", e.target.value)}
                placeholder="Any observations..."
                className="w-full rounded-lg border border-white/[0.06] bg-white/[0.04] px-3 py-2 text-sm text-[#D1D5DB] placeholder:text-[#6B7280] focus:border-emerald-500 focus:outline-none min-h-20 resize-y"
              />
            </div>

            <div className="flex items-center gap-3">
              <Button onClick={handleSave} disabled={!user}>
                {saved ? <><CheckCircle2 className="h-4 w-4" /> Saved!</> : <><Save className="h-4 w-4" /> Save Vitals</>}
              </Button>
              {!user && <p className="text-xs text-amber-400">Please login to save vitals</p>}
              {saved && <p className="text-xs text-green-400">Vitals recorded successfully and saved to database</p>}
            </div>
          </motion.div>
        )}
      </Card>
    </div>
  );
}
