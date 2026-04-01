"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  AlertTriangle, Activity, BedDouble, Phone,
  Stethoscope, Pill, ChevronRight, Heart,
  Droplets, Thermometer, Wind, Brain, Info,
} from "lucide-react";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
} from "recharts";
import { Card, CardTitle } from "@/components/ui/Card";
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
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#F0FDF4] tracking-tight">
          {user ? `Good ${new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening"}, ${user.name}` : "Nursing Station"}
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
                  <p className="text-2xl font-bold text-[#F0FDF4] tabular-nums">{stat.value}</p>
                )}
                <p className="text-xs text-[#6B7280] font-medium">{stat.label}</p>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

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
                    className={`glass-hover cursor-pointer transition-all duration-300 hover:shadow-lg ${hasCriticalVital ? "border-red-500/20 glow-red" : isICU ? "border-amber-500/10" : ""}`}
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
                            <div key={vital.key} className="rounded-xl bg-white/[0.02] p-2 text-center">
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

      {/* === Patient Acuity Radar Charts === */}
      {analytics?.acuityData && (
        <div>
          <div className="flex items-start gap-3 mb-4">
            <div>
              <h2 className="text-lg font-bold text-[#F0FDF4]">Patient Acuity Overview</h2>
              <div className="flex items-start gap-1.5 mt-1">
                <Info className="h-3.5 w-3.5 text-[#6B7280] mt-0.5 shrink-0" />
                <p className="text-xs text-[#6B7280]">Each radar shows a patient&apos;s risk across 6 clinical dimensions. Larger shapes mean higher acuity. Red (&gt;60%) = critical, Amber (35-60%) = moderate, Green (&lt;35%) = stable. Click any chart to view the patient.</p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {analytics.acuityData.map((p: { id: string; name: string; room: string; medCount: number; acuity: { heart: number; bp: number; oxygen: number; glucose: number; pain: number; interactions: number; overall: number } }, i: number) => (
              <motion.div key={p.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}>
                <Link href={`/patients/${p.id}`}>
                  <Card variant="glass" className="glass-hover cursor-pointer py-4">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs font-semibold text-[#D1D5DB] truncate">{p.name}</p>
                      <span className="text-sm font-bold font-mono" style={{ color: acuityColor(p.acuity.overall) }}>{p.acuity.overall}%</span>
                    </div>
                    <p className="text-[9px] text-[#6B7280] mb-1">Room {p.room ?? "—"} &middot; {p.medCount} meds</p>
                    <ResponsiveContainer width="100%" height={120}>
                      <RadarChart data={[
                        { s: "Heart", v: p.acuity.heart }, { s: "BP", v: p.acuity.bp }, { s: "O₂", v: p.acuity.oxygen },
                        { s: "Sugar", v: p.acuity.glucose }, { s: "Pain", v: p.acuity.pain }, { s: "Drugs", v: p.acuity.interactions },
                      ]}>
                        <PolarGrid stroke="rgba(255,255,255,0.05)" />
                        <PolarAngleAxis dataKey="s" tick={{ fontSize: 8, fill: "#6B7280" }} />
                        <PolarRadiusAxis tick={false} domain={[0, 100]} />
                        <Radar dataKey="v" stroke={acuityColor(p.acuity.overall)} fill={acuityColor(p.acuity.overall)} fillOpacity={0.15} strokeWidth={1.5} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* === Ward Floor Map === */}
      {analytics?.roomData && (
        <div>
          <div className="flex items-start gap-3 mb-4">
            <div>
              <h2 className="text-lg font-bold text-[#F0FDF4]">Ward Floor Map</h2>
              <div className="flex items-start gap-1.5 mt-1">
                <Info className="h-3.5 w-3.5 text-[#6B7280] mt-0.5 shrink-0" />
                <p className="text-xs text-[#6B7280]">Live room occupancy with patient acuity indicators. The colored bar at the top of each room shows risk level. Grey rooms are available for new admissions.</p>
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
                  {floorRooms.map((room: { id: string; room_number: string; room_type: string; status: string; patient: { name: string; acuity: number } | null }) => (
                    <Card key={room.id} variant="glass" className={`py-3 px-4 relative overflow-hidden ${room.status === "maintenance" ? "opacity-30" : ""}`}>
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
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
