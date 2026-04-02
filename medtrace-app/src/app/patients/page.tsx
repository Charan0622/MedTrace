"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Heart, Activity, Wind, Droplets, Thermometer, Brain,
  Stethoscope, Phone, ChevronRight, BedDouble, Pill,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/layout/PageHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import { apiClient } from "@/lib/api";
import type { RiskLevel, Room, Admission, Doctor, EmergencyContact, VitalSigns } from "@/lib/types";

interface PatientListItem {
  id: string; name: string; age: number; sex: string; blood_group: string;
  room?: Room; admission?: Admission; doctor?: Doctor; emergency_contact?: EmergencyContact;
  latest_vitals?: VitalSigns; medication_count: number; pending_instructions: number; alert_count: number;
}

function vitalStatus(vital: string, value: number | null): "normal" | "warning" | "critical" {
  if (value === null) return "normal";
  switch (vital) {
    case "hr": return value > 120 || value < 50 ? "critical" : value > 100 || value < 60 ? "warning" : "normal";
    case "bp": return value > 180 || value < 90 ? "critical" : value > 140 || value < 100 ? "warning" : "normal";
    case "spo2": return value < 90 ? "critical" : value < 95 ? "warning" : "normal";
    case "sugar": return value > 300 || value < 60 ? "critical" : value > 200 || value < 70 ? "warning" : "normal";
    case "temp": return value > 103 || value < 95 ? "critical" : value > 100.4 || value < 96.8 ? "warning" : "normal";
    case "pain": return value >= 8 ? "critical" : value >= 5 ? "warning" : "normal";
    default: return "normal";
  }
}

const vitalColor = { normal: "text-emerald-400", warning: "text-amber-400", critical: "text-red-400" };
const vitalDot = { normal: "vital-normal", warning: "vital-warning", critical: "vital-critical" };

const vitalNormalRange: Record<string, string> = {
  hr: "Normal: 60–100 bpm",
  bp: "Normal: 90/60–140/90 mmHg",
  spo2: "Normal: 95–100%",
  sugar: "Normal: 70–200 mg/dL",
  temp: "Normal: 96.8–100.4 °F",
  pain: "Normal: 0–4 / 10",
};

export default function PatientsPage() {
  const [patients, setPatients] = useState<PatientListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    apiClient<PatientListItem[]>("/api/patients").then((res) => {
      if (res.success && res.data) setPatients(res.data);
      setLoading(false);
    });
  }, []);

  const filtered = patients.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Patients"
        description={`${patients.length} patients in system — ${patients.filter((p) => p.room).length} currently admitted`}
      />

      <Input
        placeholder="Search patients..."
        icon={<Search className="h-4 w-4" />}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-md"
      />

      {search && (
        <p className="text-xs text-[#6B7280]">
          {filtered.length} patient{filtered.length !== 1 ? "s" : ""} found
        </p>
      )}

      {loading ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-56 w-full rounded-2xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <AnimatePresence mode="popLayout">
          {filtered.map((patient, i) => {
            const v = patient.latest_vitals;
            const riskLevel: RiskLevel = patient.alert_count >= 3 ? "critical" : patient.alert_count >= 2 ? "high" : patient.alert_count >= 1 ? "moderate" : "safe";
            const isICU = patient.room?.room_type === "icu";
            const hasCriticalVital = v && (
              vitalStatus("hr", v.heart_rate) === "critical" ||
              vitalStatus("spo2", v.spo2) === "critical" ||
              vitalStatus("sugar", v.blood_sugar) === "critical"
            );

            return (
              <motion.div key={patient.id} layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ delay: i * 0.04 }}>
                <Link href={`/patients/${patient.id}`}>
                  <Card
                    variant="glass"
                    className={`glass-hover card-hover-lift cursor-pointer transition-all duration-300 hover:shadow-lg ${hasCriticalVital ? "border-gradient-critical glow-red" : isICU ? "border-amber-500/10" : ""}`}
                  >
                    {/* Top: Room + Name + Doctor */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-12 w-12 items-center justify-center rounded-xl text-sm font-bold tracking-tight ${isICU ? "bg-gradient-to-br from-red-500/15 to-red-600/10 text-red-400 border border-red-500/20" : "bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 text-emerald-400 border border-emerald-500/10"}`}>
                          {patient.room?.room_number ?? <BedDouble className="h-5 w-5 text-[#6B7280]" />}
                        </div>
                        <div>
                          <p className="font-semibold text-[#F0FDF4] text-[15px]">{patient.name}</p>
                          <p className="text-xs text-[#6B7280]">
                            {patient.age}y {patient.sex} &middot; {patient.blood_group} &middot; {patient.medication_count} meds
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {patient.alert_count > 0 && (
                          <Badge variant="risk" riskLevel={riskLevel}>
                            {patient.alert_count}
                          </Badge>
                        )}
                        {patient.pending_instructions > 0 && (
                          <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-emerald-500/10 text-[10px] font-bold text-emerald-400 px-1.5">
                            {patient.pending_instructions}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Diagnosis */}
                    {patient.admission && (
                      <div className="rounded-xl bg-white/[0.02] px-3 py-2 mb-4">
                        <p className="text-[11px] text-[#6B7280] uppercase tracking-wider font-medium">Diagnosis</p>
                        <p className="text-[13px] text-[#D1D5DB] line-clamp-1 mt-0.5">{patient.admission.diagnosis}</p>
                      </div>
                    )}

                    {/* Vitals */}
                    {v && (
                      <div className="grid grid-cols-6 gap-1.5 mb-4">
                        {[
                          { icon: Heart, val: v.heart_rate, key: "hr", label: "HR" },
                          { icon: Activity, val: v.blood_pressure_sys, key: "bp", label: "BP", extra: `/${v.blood_pressure_dia ?? "—"}` },
                          { icon: Wind, val: v.spo2, key: "spo2", label: "SpO2", suffix: "%" },
                          { icon: Droplets, val: v.blood_sugar, key: "sugar", label: "Sugar" },
                          { icon: Thermometer, val: v.temperature, key: "temp", label: "Temp" },
                          { icon: Brain, val: v.pain_level, key: "pain", label: "Pain" },
                        ].map((vital) => {
                          const status = vitalStatus(vital.key, vital.val);
                          return (
                            <div key={vital.key} className="tooltip-trigger rounded-xl bg-white/[0.02] p-2 text-center">
                              <span className="tooltip-content">{vitalNormalRange[vital.key]}</span>
                              <div className="flex items-center justify-center gap-1 mb-0.5">
                                <div className={`vital-dot ${vitalDot[status]}`} />
                              </div>
                              <p className={`text-sm font-mono font-bold ${vitalColor[status]}`}>
                                {vital.val ?? "—"}{vital.extra ?? ""}{vital.suffix ?? ""}
                              </p>
                              <p className="text-[9px] text-[#6B7280] uppercase tracking-wider">{vital.label}</p>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* No vitals fallback */}
                    {!v && (
                      <div className="rounded-xl bg-white/[0.02] px-3 py-3 mb-4 text-center">
                        <p className="text-xs text-[#6B7280]">No vitals recorded yet</p>
                      </div>
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-between text-[11px] text-[#6B7280] pt-3 border-t border-white/[0.04]">
                      <div className="flex items-center gap-1.5">
                        <Stethoscope className="h-3 w-3" />
                        <span>{patient.doctor?.name ?? "Unassigned"}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        {patient.emergency_contact && (
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            <span>{patient.emergency_contact.name}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <Pill className="h-3 w-3" />
                          <span>{patient.medication_count} meds</span>
                        </div>
                      </div>
                      <ChevronRight className="h-3.5 w-3.5 text-[#6B7280]/50" />
                    </div>
                  </Card>
                </Link>
              </motion.div>
            );
          })}
          </AnimatePresence>
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <p className="text-center text-[#6B7280] py-8">No patients found</p>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
