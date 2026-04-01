"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import {
  Activity, Users, Pill, AlertTriangle, Zap, TrendingUp, Info, BedDouble,
} from "lucide-react";
import { Card, CardTitle } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { apiClient } from "@/lib/api";

type Row = Record<string, unknown>;

interface Stats { totalPatients: number; avgAcuity: number; criticalPatients: number; totalMeds: number; totalInteractions: number; pendingInstructions: number }
interface AnalyticsData {
  drugUsage: { name: string; prescriptions: number }[];
  drugClassDist: { drug_class: string; count: number }[];
  conditionDist: { name: string; category: string; count: number }[];
  alertsByPriority: { priority: string; count: number }[];
  interactionNetwork: { severity: number; drug_a: string; drug_b: string; mechanism: string }[];
  medAdminTimeline: Row[];
  stats: Stats;
}

const COLORS = ["#22C55E", "#3B82F6", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#06B6D4", "#F97316"];

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient<AnalyticsData>("/api/analytics").then((res) => {
      if (res.success && res.data) setData(res.data);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="space-y-4"><Skeleton className="h-10 w-48" /><div className="grid grid-cols-6 gap-3">{[1,2,3,4,5,6].map(i=><Skeleton key={i} className="h-24"/>)}</div><div className="grid grid-cols-2 gap-4"><Skeleton className="h-72" /><Skeleton className="h-72" /></div></div>;
  if (!data) return <div className="text-[#6B7280]">Failed to load analytics</div>;

  const { stats } = data;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#F0FDF4] tracking-tight flex items-center gap-3">
          <div className="rounded-xl bg-gradient-to-br from-emerald-500/15 to-emerald-600/5 p-2.5">
            <TrendingUp className="h-6 w-6 text-emerald-400" />
          </div>
          Clinical Analytics Dashboard
        </h1>
        <p className="text-sm text-[#6B7280] mt-2 max-w-2xl">
          Real-time overview of hospital operations, drug utilization, patient conditions, and clinical alerts.
          All data updates automatically when new patients are admitted, medications prescribed, or vitals recorded.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        {[
          { label: "Total Patients", value: stats.totalPatients, icon: Users, color: "from-sky-500/15 to-sky-600/5", text: "text-sky-400" },
          { label: "Avg Acuity", value: `${stats.avgAcuity}%`, icon: Activity, color: stats.avgAcuity > 50 ? "from-red-500/15 to-red-600/5" : "from-emerald-500/15 to-emerald-600/5", text: stats.avgAcuity > 50 ? "text-red-400" : "text-emerald-400" },
          { label: "Critical", value: stats.criticalPatients, icon: AlertTriangle, color: "from-red-500/15 to-red-600/5", text: "text-red-400" },
          { label: "Active Meds", value: stats.totalMeds, icon: Pill, color: "from-emerald-500/15 to-emerald-600/5", text: "text-emerald-400" },
          { label: "Interactions", value: stats.totalInteractions, icon: Zap, color: "from-amber-500/15 to-amber-600/5", text: "text-amber-400" },
          { label: "Pending Tasks", value: stats.pendingInstructions, icon: BedDouble, color: "from-emerald-500/15 to-emerald-600/5", text: "text-emerald-400" },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
            <Card variant="glass" className="text-center py-5">
              <div className={`rounded-xl bg-gradient-to-br ${s.color} p-2 w-fit mx-auto mb-2`}>
                <s.icon className={`h-5 w-5 ${s.text}`} />
              </div>
              <p className="text-2xl font-bold text-[#F0FDF4] tabular-nums">{s.value}</p>
              <p className="text-[10px] text-[#6B7280] uppercase tracking-wider mt-0.5">{s.label}</p>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Row 1: Drug Usage + Conditions */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card>
            <CardTitle>Most Prescribed Medications</CardTitle>
            <div className="flex items-start gap-1.5 mt-1 mb-4"><Info className="h-3.5 w-3.5 text-[#6B7280] mt-0.5 shrink-0" /><p className="text-xs text-[#6B7280]">Shows active prescriptions across all admitted patients. Higher bars indicate drugs used by multiple patients, helping identify formulary trends and potential bulk ordering needs.</p></div>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={data.drugUsage.slice(0, 10)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis type="number" tick={{ fontSize: 11, fill: "#6B7280" }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "#D1D5DB" }} width={110} />
                <Tooltip contentStyle={{ backgroundColor: "#141918", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, fontSize: 12 }} />
                <Bar dataKey="prescriptions" fill="#22C55E" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card>
            <CardTitle>Patient Conditions Distribution</CardTitle>
            <div className="flex items-start gap-1.5 mt-1 mb-4"><Info className="h-3.5 w-3.5 text-[#6B7280] mt-0.5 shrink-0" /><p className="text-xs text-[#6B7280]">Breakdown of diagnosed conditions across all patients. Helps identify the most common diagnoses in the unit for resource planning and specialist staffing.</p></div>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={data.conditionDist.slice(0, 8)} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={100} innerRadius={50} paddingAngle={3} label={({ name, percent }) => `${String(name).length > 12 ? String(name).slice(0, 12) + "..." : name} ${((percent ?? 0) * 100).toFixed(0)}%`} labelLine={false}>
                  {data.conditionDist.slice(0, 8).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: "#141918", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </motion.div>
      </div>

      {/* Row 2: Drug Classes + Alerts */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <Card>
            <CardTitle>Drug Classes in Use</CardTitle>
            <div className="flex items-start gap-1.5 mt-1 mb-4"><Info className="h-3.5 w-3.5 text-[#6B7280] mt-0.5 shrink-0" /><p className="text-xs text-[#6B7280]">Distribution of active medications by pharmacological class. Helps pharmacists monitor therapeutic categories and identify potential poly-pharmacy risks across the ward.</p></div>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data.drugClassDist.slice(0, 10)}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="drug_class" tick={{ fontSize: 8, fill: "#6B7280" }} angle={-25} textAnchor="end" height={70} />
                <YAxis tick={{ fontSize: 11, fill: "#6B7280" }} />
                <Tooltip contentStyle={{ backgroundColor: "#141918", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, fontSize: 12 }} />
                <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                  {data.drugClassDist.slice(0, 10).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
          <Card>
            <CardTitle>Active Clinical Alerts</CardTitle>
            <div className="flex items-start gap-1.5 mt-1 mb-4"><Info className="h-3.5 w-3.5 text-[#6B7280] mt-0.5 shrink-0" /><p className="text-xs text-[#6B7280]">Outstanding doctor instructions by priority level. STAT orders require immediate action, URGENT within 1 hour, ROUTINE within the shift. High numbers suggest staffing or workflow issues.</p></div>
            <div className="space-y-4 mt-6">
              {data.alertsByPriority.map((a) => {
                const color = a.priority === "stat" ? "#EF4444" : a.priority === "urgent" ? "#F97316" : "#22C55E";
                const max = Math.max(...data.alertsByPriority.map((x) => x.count), 1);
                return (
                  <div key={a.priority}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold text-[#D1D5DB] capitalize">{a.priority}</span>
                      <span className="text-sm font-bold font-mono" style={{ color }}>{a.count}</span>
                    </div>
                    <div className="bg-white/[0.03] rounded-full h-8 overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${(a.count / max) * 100}%` }} transition={{ duration: 1.2, ease: "easeOut" }}
                        className="h-full rounded-full" style={{ backgroundColor: `${color}30`, borderRight: `3px solid ${color}` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Row 3: Drug Interaction Network */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
        <Card>
          <CardTitle>Active Drug Interaction Network</CardTitle>
          <div className="flex items-start gap-1.5 mt-1 mb-4"><Info className="h-3.5 w-3.5 text-[#6B7280] mt-0.5 shrink-0" /><p className="text-xs text-[#6B7280]">All known drug-drug interactions among currently prescribed medications. Severity scale: 1-4 (low), 5-7 (moderate), 8-10 (critical). These interactions are actively monitored and flagged during prescription checks.</p></div>
          <div className="space-y-2">
            {data.interactionNetwork.map((int, i) => {
              const color = int.severity > 7 ? "#EF4444" : int.severity > 4 ? "#F59E0B" : "#22C55E";
              return (
                <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.8 + i * 0.04 }}
                  className="flex items-center gap-3 rounded-xl bg-white/[0.02] border border-white/[0.04] p-3">
                  <p className="text-sm font-mono font-semibold text-[#F0FDF4] flex-1 text-right">{int.drug_a}</p>
                  <div className="w-28 flex flex-col items-center gap-0.5">
                    <div className="w-full h-2 bg-white/[0.03] rounded-full overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${(int.severity / 10) * 100}%` }} transition={{ duration: 1, delay: 0.9 + i * 0.05 }}
                        className="h-full rounded-full" style={{ backgroundColor: color }} />
                    </div>
                    <span className="text-[9px] font-bold" style={{ color }}>{int.severity}/10</span>
                  </div>
                  <p className="text-sm font-mono font-semibold text-[#F0FDF4] flex-1">{int.drug_b}</p>
                  <p className="text-[10px] text-[#6B7280] max-w-52 truncate hidden lg:block">{int.mechanism}</p>
                </motion.div>
              );
            })}
          </div>
        </Card>
      </motion.div>

      {/* Row 4: Medication Administration Timeline */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}>
        <Card>
          <CardTitle>Today&apos;s Medication Administration Log</CardTitle>
          <div className="flex items-start gap-1.5 mt-1 mb-4"><Info className="h-3.5 w-3.5 text-[#6B7280] mt-0.5 shrink-0" /><p className="text-xs text-[#6B7280]">Timeline of all medication administrations today. Green = given on time, Amber = held (pending doctor review), Red = skipped or refused. Gaps in the timeline may indicate missed doses requiring follow-up.</p></div>
          <div className="space-y-1.5">
            {data.medAdminTimeline.map((ma, i) => {
              const time = ma.administered_at ? new Date(ma.administered_at as string) : new Date();
              const statusColor = ma.status === "given" ? "#22C55E" : ma.status === "held" ? "#F59E0B" : "#EF4444";
              return (
                <motion.div key={i} initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.9 + i * 0.03 }}
                  className="flex items-center gap-3">
                  <span className="text-[10px] font-mono text-[#6B7280] w-12 shrink-0">{time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  <div className="h-6 flex-1 bg-white/[0.02] rounded-lg overflow-hidden flex items-center" style={{ borderLeft: `3px solid ${statusColor}` }}>
                    <span className="text-[11px] text-[#D1D5DB] px-2 truncate">{ma.drug_name as string} {ma.dose_given as string} — {ma.patient_name as string}</span>
                  </div>
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: statusColor, boxShadow: `0 0 4px ${statusColor}60` }} />
                </motion.div>
              );
            })}
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
