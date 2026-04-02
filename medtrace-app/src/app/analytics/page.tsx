"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from "recharts";
import {
  Activity, Users, Pill, AlertTriangle, Zap, TrendingUp, BedDouble,
} from "lucide-react";
import { Card, CardTitle } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { apiClient } from "@/lib/api";

type Row = Record<string, unknown>;

interface Stats { totalPatients: number; avgAcuity: number; criticalPatients: number; totalMeds: number; totalInteractions: number; pendingInstructions: number }
interface AcuityItem { id: string; name: string; room: string; acuity: { heart: number; bp: number; oxygen: number; glucose: number; pain: number; interactions: number; overall: number } }
interface AnalyticsData {
  drugUsage: { name: string; prescriptions: number }[];
  drugClassDist: { drug_class: string; count: number }[];
  conditionDist: { name: string; category: string; count: number }[];
  alertsByPriority: { priority: string; count: number }[];
  interactionNetwork: { severity: number; drug_a: string; drug_b: string; mechanism: string }[];
  medAdminTimeline: Row[];
  acuityData: AcuityItem[];
  stats: Stats;
}

const COLORS = ["#22C55E", "#3B82F6", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#06B6D4", "#F97316"];
const GRADIENTS = [
  ["#22C55E", "#16A34A"],
  ["#3B82F6", "#2563EB"],
  ["#F59E0B", "#D97706"],
  ["#EF4444", "#DC2626"],
  ["#8B5CF6", "#7C3AED"],
  ["#EC4899", "#DB2777"],
  ["#06B6D4", "#0891B2"],
  ["#F97316", "#EA580C"],
];

// Custom dark tooltip for all charts
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function DarkTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#0C0F0E]/95 backdrop-blur-md px-4 py-3 shadow-2xl">
      {label && <p className="text-xs font-semibold text-[#D1D5DB] mb-1.5">{label}</p>}
      {payload.map((p: { name: string; value: number; color: string }, i: number) => (
        <div key={i} className="flex items-center gap-2 text-xs">
          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-[#6B7280]">{p.name}:</span>
          <span className="font-bold font-mono text-[#F0FDF4]">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function PieTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#0C0F0E]/95 backdrop-blur-md px-4 py-3 shadow-2xl">
      <div className="flex items-center gap-2">
        <div className="h-3 w-3 rounded-full" style={{ backgroundColor: d.payload.fill }} />
        <span className="text-sm font-semibold text-[#D1D5DB]">{d.name}</span>
      </div>
      <p className="text-lg font-bold font-mono text-[#F0FDF4] mt-1">{d.value} <span className="text-xs text-[#6B7280] font-normal">patients</span></p>
    </div>
  );
}

function acuityColor(score: number): string { return score > 60 ? "#EF4444" : score > 35 ? "#F59E0B" : "#22C55E"; }

function AnimatedCounter({ value }: { value: number | string }) {
  const [display, setDisplay] = useState(0);
  const numValue = typeof value === "string" ? parseInt(value) || 0 : value;
  useEffect(() => {
    const duration = 800;
    const startTime = Date.now();
    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(numValue * eased));
      if (progress >= 1) clearInterval(timer);
    }, 16);
    return () => clearInterval(timer);
  }, [numValue]);
  const suffix = typeof value === "string" && value.includes("%") ? "%" : "";
  return <>{display}{suffix}</>;
}

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

  // Build hourly med admin data for area chart
  const hourlyMeds: Record<string, { hour: string; given: number; held: number; skipped: number }> = {};
  data.medAdminTimeline.forEach((ma) => {
    const t = ma.administered_at ? new Date(ma.administered_at as string) : new Date();
    const h = t.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    if (!hourlyMeds[h]) hourlyMeds[h] = { hour: h, given: 0, held: 0, skipped: 0 };
    if (ma.status === "given") hourlyMeds[h].given++;
    else if (ma.status === "held") hourlyMeds[h].held++;
    else hourlyMeds[h].skipped++;
  });
  const medTimeline = Object.values(hourlyMeds).slice(-12);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#F0FDF4] tracking-tight flex items-center gap-3">
          <div className="rounded-xl bg-gradient-to-br from-emerald-500/15 to-emerald-600/5 p-2.5">
            <TrendingUp className="h-6 w-6 text-emerald-400" />
          </div>
          Clinical Analytics
        </h1>
        <p className="text-sm text-[#6B7280] mt-1">Real-time clinical insights across all admitted patients</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-3 lg:grid-cols-6">
        {[
          { label: "Patients", value: stats.totalPatients, icon: Users, color: "from-sky-500/15 to-sky-600/5", text: "text-sky-400", border: "border-sky-500/10" },
          { label: "Avg Acuity", value: `${stats.avgAcuity}%`, icon: Activity, color: stats.avgAcuity > 50 ? "from-red-500/15 to-red-600/5" : "from-emerald-500/15 to-emerald-600/5", text: stats.avgAcuity > 50 ? "text-red-400" : "text-emerald-400", border: stats.avgAcuity > 50 ? "border-red-500/10" : "border-emerald-500/10" },
          { label: "Critical", value: stats.criticalPatients, icon: AlertTriangle, color: "from-red-500/15 to-red-600/5", text: "text-red-400", border: "border-red-500/10" },
          { label: "Active Meds", value: stats.totalMeds, icon: Pill, color: "from-emerald-500/15 to-emerald-600/5", text: "text-emerald-400", border: "border-emerald-500/10" },
          { label: "Interactions", value: stats.totalInteractions, icon: Zap, color: "from-amber-500/15 to-amber-600/5", text: "text-amber-400", border: "border-amber-500/10" },
          { label: "Pending", value: stats.pendingInstructions, icon: BedDouble, color: "from-violet-500/15 to-violet-600/5", text: "text-violet-400", border: "border-violet-500/10" },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
            <Card variant="glass" className={`text-center py-4 border ${s.border} card-hover-lift`}>
              <div className={`rounded-xl bg-gradient-to-br ${s.color} p-2 w-fit mx-auto mb-2`}>
                <s.icon className={`h-4 w-4 ${s.text}`} />
              </div>
              <p className="text-xl font-bold text-[#F0FDF4] tabular-nums"><AnimatedCounter value={s.value} /></p>
              <p className="text-[9px] text-[#6B7280] uppercase tracking-wider mt-0.5">{s.label}</p>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Row 1: Drug Usage Bar + Conditions Donut */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="card-hover-lift">
            <CardTitle>Most Prescribed Medications</CardTitle>
            <p className="text-[11px] text-[#6B7280] mt-1 mb-4">Active prescriptions across all admitted patients</p>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.drugUsage.slice(0, 10)} layout="vertical" margin={{ left: 10, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: "#6B7280" }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "#D1D5DB" }} width={110} axisLine={false} tickLine={false} />
                <Tooltip content={<DarkTooltip />} cursor={{ fill: "rgba(255,255,255,0.02)" }} />
                <defs>
                  <linearGradient id="barGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#22C55E" stopOpacity={0.8} />
                    <stop offset="100%" stopColor="#16A34A" stopOpacity={1} />
                  </linearGradient>
                </defs>
                <Bar dataKey="prescriptions" fill="url(#barGrad)" radius={[0, 6, 6, 0]} barSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card className="card-hover-lift">
            <CardTitle>Patient Conditions</CardTitle>
            <p className="text-[11px] text-[#6B7280] mt-1 mb-4">Distribution of diagnosed conditions across the ward</p>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <defs>
                  {GRADIENTS.map((g, i) => (
                    <linearGradient key={i} id={`pieGrad${i}`} x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor={g[0]} />
                      <stop offset="100%" stopColor={g[1]} />
                    </linearGradient>
                  ))}
                </defs>
                <Pie data={data.conditionDist.slice(0, 8)} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={105} innerRadius={60} paddingAngle={4} strokeWidth={0}>
                  {data.conditionDist.slice(0, 8).map((_, i) => <Cell key={i} fill={`url(#pieGrad${i})`} />)}
                </Pie>
                <Tooltip content={<PieTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            {/* Legend below chart */}
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-2">
              {data.conditionDist.slice(0, 8).map((c, i) => (
                <div key={c.name} className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <span className="text-[10px] text-[#6B7280]">{c.name}</span>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Row 2: Drug Classes + Patient Acuity Radars */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <Card className="card-hover-lift">
            <CardTitle>Drug Classes in Use</CardTitle>
            <p className="text-[11px] text-[#6B7280] mt-1 mb-4">Pharmacological categories of active medications</p>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={data.drugClassDist.slice(0, 8)} margin={{ bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                <XAxis dataKey="drug_class" tick={{ fontSize: 9, fill: "#6B7280" }} angle={-20} textAnchor="end" height={60} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#6B7280" }} axisLine={false} tickLine={false} />
                <Tooltip content={<DarkTooltip />} cursor={{ fill: "rgba(255,255,255,0.02)" }} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]} barSize={28}>
                  {data.drugClassDist.slice(0, 8).map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} fillOpacity={0.85} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
          <Card className="card-hover-lift">
            <CardTitle>Clinical Alerts by Priority</CardTitle>
            <p className="text-[11px] text-[#6B7280] mt-1 mb-4">Outstanding doctor instructions requiring action</p>
            <div className="space-y-5 mt-4">
              {data.alertsByPriority.map((a) => {
                const color = a.priority === "stat" ? "#EF4444" : a.priority === "urgent" ? "#F97316" : "#22C55E";
                const max = Math.max(...data.alertsByPriority.map((x) => x.count), 1);
                const pct = (a.count / max) * 100;
                return (
                  <div key={a.priority}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full" style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}40` }} />
                        <span className="text-sm font-semibold text-[#D1D5DB] capitalize">{a.priority}</span>
                      </div>
                      <span className="text-lg font-bold font-mono" style={{ color }}>{a.count}</span>
                    </div>
                    <div className="bg-white/[0.03] rounded-full h-3 overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1.2, ease: "easeOut" }}
                        className="h-full rounded-full shadow-sm" style={{ background: `linear-gradient(90deg, ${color}60, ${color})`, boxShadow: `0 0 8px ${color}30` }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Acuity mini radars */}
            {data.acuityData && data.acuityData.length > 0 && (
              <div className="mt-6 pt-4 border-t border-white/[0.04]">
                <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider mb-3">Patient Acuity Snapshot</p>
                <div className="grid grid-cols-2 gap-2">
                  {data.acuityData.slice(0, 4).map((p) => (
                    <div key={p.id} className="rounded-lg bg-white/[0.02] p-2 text-center">
                      <p className="text-[10px] text-[#D1D5DB] font-medium truncate">{p.name}</p>
                      <ResponsiveContainer width="100%" height={80}>
                        <RadarChart data={[
                          { s: "HR", v: p.acuity.heart }, { s: "BP", v: p.acuity.bp }, { s: "O2", v: p.acuity.oxygen },
                          { s: "Glu", v: p.acuity.glucose }, { s: "Pain", v: p.acuity.pain }, { s: "Rx", v: p.acuity.interactions },
                        ]}>
                          <PolarGrid stroke="rgba(255,255,255,0.04)" />
                          <PolarAngleAxis dataKey="s" tick={{ fontSize: 7, fill: "#6B7280" }} />
                          <PolarRadiusAxis tick={false} domain={[0, 100]} />
                          <Radar dataKey="v" stroke={acuityColor(p.acuity.overall)} fill={acuityColor(p.acuity.overall)} fillOpacity={0.15} strokeWidth={1.5} />
                        </RadarChart>
                      </ResponsiveContainer>
                      <span className="text-xs font-bold font-mono" style={{ color: acuityColor(p.acuity.overall) }}>{p.acuity.overall}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </motion.div>
      </div>

      {/* Row 3: Medication Administration Area Chart */}
      {medTimeline.length > 1 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
          <Card className="card-hover-lift">
            <CardTitle>Medication Administration Timeline</CardTitle>
            <p className="text-[11px] text-[#6B7280] mt-1 mb-4">Administration activity over time — green = given, amber = held, red = skipped</p>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={medTimeline} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <defs>
                  <linearGradient id="givenGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22C55E" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#22C55E" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="heldGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#F59E0B" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#F59E0B" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                <XAxis dataKey="hour" tick={{ fontSize: 10, fill: "#6B7280" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#6B7280" }} axisLine={false} tickLine={false} />
                <Tooltip content={<DarkTooltip />} />
                <Area type="monotone" dataKey="given" stroke="#22C55E" fill="url(#givenGrad)" strokeWidth={2} />
                <Area type="monotone" dataKey="held" stroke="#F59E0B" fill="url(#heldGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </motion.div>
      )}

      {/* Row 4: Drug Interaction Network */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}>
        <Card className="card-hover-lift">
          <CardTitle>Active Drug Interaction Network</CardTitle>
          <p className="text-[11px] text-[#6B7280] mt-1 mb-4">Known drug-drug interactions among current prescriptions — severity: green (low), amber (moderate), red (critical)</p>
          <div className="space-y-2">
            {data.interactionNetwork.map((int, i) => {
              const color = int.severity > 7 ? "#EF4444" : int.severity > 4 ? "#F59E0B" : "#22C55E";
              return (
                <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.9 + i * 0.03 }}
                  className="flex items-center gap-3 rounded-xl bg-white/[0.02] border border-white/[0.04] p-3 hover:bg-white/[0.04] hover:scale-[1.01] transition-transform transition-colors">
                  <p className="text-sm font-mono font-semibold text-[#F0FDF4] flex-1 text-right">{int.drug_a}</p>
                  <div className="w-28 flex flex-col items-center gap-1">
                    <div className="w-full h-2.5 bg-white/[0.03] rounded-full overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${(int.severity / 10) * 100}%` }} transition={{ duration: 1, delay: 0.9 + i * 0.05 }}
                        className="h-full rounded-full" style={{ background: `linear-gradient(90deg, ${color}80, ${color})` }} />
                    </div>
                    <span className="text-[9px] font-bold font-mono" style={{ color }}>{int.severity}/10</span>
                  </div>
                  <p className="text-sm font-mono font-semibold text-[#F0FDF4] flex-1">{int.drug_b}</p>
                  <p className="text-[10px] text-[#6B7280] max-w-52 truncate hidden lg:block">{int.mechanism}</p>
                </motion.div>
              );
            })}
          </div>
        </Card>
      </motion.div>

      {/* Row 5: Med Admin Log */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }}>
        <Card className="card-hover-lift">
          <CardTitle>Medication Administration Log</CardTitle>
          <p className="text-[11px] text-[#6B7280] mt-1 mb-4">Individual administration records with status indicators</p>
          <div className="space-y-1">
            {data.medAdminTimeline.map((ma, i) => {
              const time = ma.administered_at ? new Date(ma.administered_at as string) : new Date();
              const statusColor = ma.status === "given" ? "#22C55E" : ma.status === "held" ? "#F59E0B" : "#EF4444";
              return (
                <motion.div key={i} initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 1.0 + i * 0.02 }}
                  className="flex items-center gap-3 py-1.5 hover:bg-white/[0.03] rounded-lg px-2 transition-colors">
                  <span className="text-[10px] font-mono text-[#6B7280] w-12 shrink-0">{time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  <div className="h-5 flex-1 bg-white/[0.02] rounded-md overflow-hidden flex items-center" style={{ borderLeft: `3px solid ${statusColor}` }}>
                    <span className="text-[11px] text-[#D1D5DB] px-2.5 truncate">{ma.drug_name as string} {ma.dose_given as string} — {ma.patient_name as string}</span>
                  </div>
                  <span className="text-[9px] font-medium capitalize px-1.5 py-0.5 rounded" style={{ color: statusColor, backgroundColor: `${statusColor}15` }}>{ma.status as string}</span>
                </motion.div>
              );
            })}
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
