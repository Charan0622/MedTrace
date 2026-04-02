"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  AlertTriangle, Activity, BedDouble, Phone,
  Stethoscope, Pill, ChevronRight, Heart,
  Droplets, Thermometer, Wind, Brain, Info,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { apiClient } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { RiskLevel, Room, Admission, Doctor, EmergencyContact, VitalSigns } from "@/lib/types";

interface NursingPatient {
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
function acuityColor(score: number): string { return score > 60 ? "#EF4444" : score > 35 ? "#F59E0B" : "#22C55E"; }
const vitalDot = { normal: "vital-normal", warning: "vital-warning", critical: "vital-critical" };

const vitalTooltips: Record<string, string> = {
  hr: "Heart Rate: Normal 60-100 bpm",
  bp: "Blood Pressure: Normal <140/90 mmHg",
  spo2: "Oxygen Saturation: Normal 95-100%",
  sugar: "Blood Sugar: Normal 70-140 mg/dL",
  temp: "Temperature: Normal 97-99\u00B0F",
  pain: "Pain Level: 0 = none, 10 = worst",
};

function AnimatedCounter({ value, suffix = "" }: { value: number | string; suffix?: string }) {
  const [display, setDisplay] = useState(0);
  const numValue = typeof value === "string" ? parseInt(value) || 0 : value;
  useEffect(() => {
    let start = 0;
    const duration = 800;
    const startTime = Date.now();
    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      start = Math.round(numValue * eased);
      setDisplay(start);
      if (progress >= 1) clearInterval(timer);
    }, 16);
    return () => clearInterval(timer);
  }, [numValue]);
  return <>{display}{suffix}</>;
}

export default function NursingStationPage() {
  const [patients, setPatients] = useState<NursingPatient[]>([]);
  const [loading, setLoading] = useState(true);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [analytics, setAnalytics] = useState<any>(null);
  const { user } = useAuth();

  useEffect(() => {
    apiClient<NursingPatient[]>("/api/patients").then((res) => {
      if (res.success && res.data) setPatients(res.data);
      setLoading(false);
    });
    apiClient("/api/analytics").then((res) => {
      if (res.success && res.data) setAnalytics(res.data);
    });
  }, []);

  const occupied = patients.filter((p) => p.room).length;
  const criticalCount = patients.filter((p) => {
    const v = p.latest_vitals;
    if (!v) return false;
    return (v.heart_rate && (v.heart_rate > 120 || v.heart_rate < 50)) ||
      (v.spo2 && v.spo2 < 90) || (v.blood_sugar && (v.blood_sugar > 300 || v.blood_sugar < 60)) ||
      p.alert_count >= 3;
  }).length;
  const totalAlerts = patients.reduce((s, p) => s + p.alert_count, 0);
  const pendingTasks = patients.reduce((s, p) => s + p.pending_instructions, 0);

  return (
    <div className="space-y-8">
      {/* Keyframes for ticker animations */}
      <style>{`
        @keyframes scroll-left { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        @keyframes scroll-right { from { transform: translateX(-50%); } to { transform: translateX(0); } }
      `}</style>

      {/* Scrolling Tickers */}
      <div className="space-y-2 -mt-4 mb-2">
        {/* Health Tips & Achievements — scrolls left */}
        <div className="overflow-hidden rounded-xl bg-white/[0.02] border border-white/[0.04]">
          <div className="flex whitespace-nowrap py-2" style={{ animation: "scroll-left 30s linear infinite" }}>
            {[...Array(2)].map((_, dup) => (
              <div key={dup} className="flex items-center gap-8 px-4">
                {[
                  "\u{1F3E5} MedTrace Hospital \u2014 99.7% Patient Satisfaction Rate",
                  "\u{1F3C6} Awarded Best Digital Health Platform 2026",
                  "\u{1F48A} 5-Layer Drug Safety Architecture Active",
                  "\u{1F4CA} Real-time vitals monitoring for all admitted patients",
                  "\u{1FA7A} AI-powered clinical decision support",
                  "\u2764\uFE0F Zero medication errors this quarter",
                  "\u{1F52C} Pharmacogenomic profiling available for all patients",
                  "\u{1F31F} Joint Commission Gold Seal of Approval",
                ].map((tip, i) => (
                  <span key={`${dup}-${i}`} className="text-xs text-[#6B7280] flex items-center gap-2">
                    <span className="h-1 w-1 rounded-full bg-emerald-500/50" />
                    {tip}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Doctors on Duty — scrolls right */}
        <div className="overflow-hidden rounded-xl bg-white/[0.02] border border-white/[0.04]">
          <div className="flex whitespace-nowrap py-2" style={{ animation: "scroll-right 30s linear infinite" }}>
            {[...Array(2)].map((_, dup) => (
              <div key={dup} className="flex items-center gap-6 px-4">
                {patients.filter(p => p.doctor?.name).reduce((unique: {name: string; spec: string}[], p) => {
                  const name = String(p.doctor?.name ?? "");
                  if (name && !unique.find(u => u.name === name)) unique.push({ name, spec: String(p.doctor?.specialization ?? "") });
                  return unique;
                }, []).length > 0 ?
                  patients.filter(p => p.doctor?.name).reduce((unique: {name: string; spec: string}[], p) => {
                    const name = String(p.doctor?.name ?? "");
                    if (name && !unique.find(u => u.name === name)) unique.push({ name, spec: String(p.doctor?.specialization ?? "") });
                    return unique;
                  }, []).map((doc, i) => (
                    <span key={`${dup}-${i}`} className="text-xs text-[#D1D5DB] flex items-center gap-2">
                      <span className="h-5 w-5 rounded-full bg-sky-500/15 text-sky-400 flex items-center justify-center text-[8px] font-bold">{doc.name.split(" ").map(n => n[0]).join("").slice(0,2)}</span>
                      <span className="font-medium">{doc.name}</span>
                      <span className="text-[#6B7280]">({doc.spec})</span>
                    </span>
                  )) : (
                    <span className="text-xs text-[#6B7280]">Loading doctors on duty...</span>
                  )
                }
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#F0FDF4] tracking-tight">
          {user ? `Good ${new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening"}, ${user.name}` : "MedTrace"}
        </h1>
        <p className="text-sm text-[#6B7280] mt-1">
          {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })} — {occupied} patients admitted
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: "Admitted", value: occupied, icon: BedDouble, color: "text-sky-400", bg: "from-sky-500/10 to-sky-600/5" },
          { label: "Critical", value: criticalCount, icon: AlertTriangle, color: "text-red-400", bg: "from-red-500/10 to-red-600/5" },
          { label: "Drug Alerts", value: totalAlerts, icon: Pill, color: "text-amber-400", bg: "from-amber-500/10 to-amber-600/5" },
          { label: "Pending Tasks", value: pendingTasks, icon: Activity, color: "text-emerald-400", bg: "from-emerald-500/10 to-emerald-600/5" },
        ].map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
            <Card variant="glass" className="flex items-center gap-4 py-5">
              <div className={`rounded-xl bg-gradient-to-br ${stat.bg} p-3 ${stat.color}`}>
                <stat.icon className="h-5 w-5" />
              </div>
              <div>
                {loading ? <Skeleton className="h-7 w-10" /> : (
                  <p className="text-2xl font-bold text-[#F0FDF4] tabular-nums"><AnimatedCounter value={stat.value} /></p>
                )}
                <p className="text-xs text-[#6B7280] font-medium">{stat.label}</p>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* === Ward Floor Map — Visual Command Center === */}
      {analytics?.roomData && (
        <div>
          <div className="flex items-start gap-3 mb-4">
            <div>
              <h2 className="text-lg font-bold text-[#F0FDF4]">Ward Floor Map</h2>
              <div className="flex items-start gap-1.5 mt-1">
                <Info className="h-3.5 w-3.5 text-[#6B7280] mt-0.5 shrink-0" />
                <p className="text-xs text-[#6B7280]">Live room occupancy with patient acuity indicators. Click any occupied room to view the patient. Grey rooms are available for new admissions.</p>
              </div>
            </div>
          </div>
          {[2, 3].map((floor) => {
            const floorRooms = analytics.roomData.filter((r: { floor: number }) => r.floor === floor);
            if (floorRooms.length === 0) return null;
            return (
              <div key={floor} className="mb-4">
                <p className="text-xs font-semibold text-[#6B7280] mb-2 uppercase tracking-wider">Floor {floor} — {floor === 2 ? "ICU" : "General Ward"}</p>
                <div className="grid grid-cols-3 gap-2 md:grid-cols-5">
                  {floorRooms.map((room: { id: string; room_number: string; room_type: string; status: string; patient: { id?: string; name: string; acuity: number } | null }) => {
                    const roomCard = (
                      <Card key={room.id} variant="glass" className={`py-3 px-4 relative overflow-hidden ${room.status === "maintenance" ? "opacity-30" : ""} ${room.patient ? "glass-hover card-hover-lift cursor-pointer" : ""}`}>
                        {room.patient && <div className="absolute top-0 left-0 w-full h-0.5" style={{ backgroundColor: acuityColor(room.patient.acuity) }} />}
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-bold font-mono text-[#F0FDF4]">{room.room_number}</p>
                          {room.room_type === "icu" && <span className="text-[8px] font-bold text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded">ICU</span>}
                        </div>
                        {room.patient ? (
                          <div className="mt-1">
                            <p className="text-[11px] text-[#D1D5DB] truncate">{room.patient.name}</p>
                            <div className="flex items-center gap-1 mt-0.5">
                              <div className="vital-dot" style={{ backgroundColor: acuityColor(room.patient.acuity), boxShadow: `0 0 4px ${acuityColor(room.patient.acuity)}60` }} />
                              <span className="text-[9px] font-mono" style={{ color: acuityColor(room.patient.acuity) }}>{room.patient.acuity}%</span>
                            </div>
                          </div>
                        ) : (
                          <p className="text-[10px] text-[#6B7280] mt-1">{room.status === "maintenance" ? "Maintenance" : "Available"}</p>
                        )}
                      </Card>
                    );
                    if (room.patient?.id) {
                      return <Link key={room.id} href={`/patients/${room.patient.id}`}>{roomCard}</Link>;
                    }
                    return roomCard;
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Patient Grid */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-64 w-full rounded-2xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {patients.map((patient, i) => {
            const v = patient.latest_vitals;
            const riskLevel: RiskLevel = patient.alert_count >= 3 ? "critical" : patient.alert_count >= 2 ? "high" : patient.alert_count >= 1 ? "moderate" : "safe";
            const isICU = patient.room?.room_type === "icu";
            const hasCriticalVital = v && (
              vitalStatus("hr", v.heart_rate) === "critical" ||
              vitalStatus("spo2", v.spo2) === "critical" ||
              vitalStatus("sugar", v.blood_sugar) === "critical"
            );

            return (
              <motion.div key={patient.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.06 }}>
                <Link href={`/patients/${patient.id}`}>
                  <Card
                    variant="glass"
                    className={`glass-hover card-hover-lift cursor-pointer transition-all duration-300 hover:shadow-lg ${hasCriticalVital ? "border-gradient-critical glow-red" : isICU ? "border-amber-500/10" : ""}`}
                  >
                    {/* Top: Room + Name + Doctor */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-12 w-12 items-center justify-center rounded-xl text-sm font-bold tracking-tight ${isICU ? "bg-gradient-to-br from-red-500/15 to-red-600/10 text-red-400 border border-red-500/20" : "bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 text-emerald-400 border border-emerald-500/10"}`}>
                          {patient.room?.room_number ?? "—"}
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
                              <span className="tooltip-content">{vitalTooltips[vital.key]}</span>
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

                    {/* Footer */}
                    <div className="flex items-center justify-between text-[11px] text-[#6B7280] pt-3 border-t border-white/[0.04]">
                      <div className="flex items-center gap-1.5">
                        <Stethoscope className="h-3 w-3" />
                        <span>{patient.doctor?.name ?? "Unassigned"}</span>
                      </div>
                      {patient.emergency_contact && (
                        <div className="flex items-center gap-1.5">
                          <Phone className="h-3 w-3" />
                          <span>{patient.emergency_contact.name}</span>
                        </div>
                      )}
                      <ChevronRight className="h-3.5 w-3.5 text-[#6B7280]/50" />
                    </div>
                  </Card>
                </Link>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
