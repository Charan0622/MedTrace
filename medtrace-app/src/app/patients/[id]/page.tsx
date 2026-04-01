"use client";

import { useEffect, useState, use } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  ArrowLeft, Pill, Heart, Stethoscope, Phone, BedDouble,
  ClipboardList, Activity, AlertTriangle, Brain, Clock,
  Droplets, Thermometer, Wind, FileText, Dna, FlaskConical,
  MessageSquare, Send, TriangleAlert, Download, Loader2, HeartPulse, Home, Info,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from "recharts";
import { Card, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/layout/PageHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import { apiClient } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/components/ui/Toast";
import { generatePatientPdf } from "@/lib/generate-pdf";
import { DrugInfoModal } from "@/components/patient/DrugInfoModal";
import { MarkdownRenderer } from "@/components/ui/MarkdownRenderer";
import { AiLoadingTip } from "@/components/ui/AiLoadingTip";
import { AICopilot } from "@/components/patient/AICopilot";
import type { Patient } from "@/lib/types";

type Row = Record<string, unknown>;

export default function PatientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user, aiHeaders } = useAuth();
  const { toast } = useToast();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [instructions, setInstructions] = useState<Row[]>([]);
  const [medAdmin, setMedAdmin] = useState<Row[]>([]);
  const [allergies, setAllergies] = useState<Row[]>([]);
  const [labs, setLabs] = useState<Row[]>([]);
  const [notes, setNotes] = useState<Row[]>([]);
  const [newNote, setNewNote] = useState("");
  const [noteType, setNoteType] = useState("observation");
  const [aiAnalysis, setAiAnalysis] = useState<{ summary: string; anomalies: string[]; recommendations: string[]; ai_model: string } | null>(null);
  const [analyzingVitals, setAnalyzingVitals] = useState(false);
  const [carePlan, setCarePlan] = useState<{ plan: string; ai_model: string; plan_type: string } | null>(null);
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "vitals" | "notes" | "labs" | "timeline" | "careplan">("overview");
  const [drugInfoDrug, setDrugInfoDrug] = useState<string | null>(null);

  useEffect(() => {
    apiClient<Patient>(`/api/patients/${id}`).then((res) => {
      if (res.success && res.data) setPatient(res.data);
      setLoading(false);
    });
    // Load additional data from SQLite APIs
    apiClient<Row[]>(`/api/instructions?patient_id=${id}`).then((res) => { if (res.data) setInstructions(res.data); });
    apiClient<Row[]>(`/api/notes?patient_id=${id}`).then((res) => { if (res.data) setNotes(res.data); });
    // Load allergies and labs directly from patient data (included in patient API)
  }, [id]);

  // Load allergies + labs from DB via a helper fetch
  useEffect(() => {
    fetch(`/api/patients/${id}`).then((r) => r.json()).then((data) => {
      if (data.success && data.data) {
        // Get allergies and labs from separate lightweight calls
        fetch(`/api/allergies?patient_id=${id}`).then((r) => r.json()).then((d) => { if (d.data) setAllergies(d.data); }).catch(() => {});
        fetch(`/api/labs?patient_id=${id}`).then((r) => r.json()).then((d) => { if (d.data) setLabs(d.data); }).catch(() => {});
        // Med admin
        fetch(`/api/med-admin?patient_id=${id}`).then((r) => r.json()).then((d) => { if (d.data) setMedAdmin(d.data); }).catch(() => {});
      }
    });
  }, [id]);

  async function submitNote() {
    if (!newNote.trim() || !user) return;
    const res = await apiClient<Row>("/api/notes", {
      method: "POST",
      body: JSON.stringify({ patient_id: id, author: user.name, note_type: noteType, content: newNote, shift: "day" }),
    });
    if (res.success && res.data) {
      setNotes((prev) => [res.data!, ...prev]);
      setNewNote("");
    }
  }

  async function generateCarePlan(planType: "current" | "discharge") {
    setGeneratingPlan(true);
    setCarePlan(null);
    try {
      const r = await fetch("/api/ai/care-plan", {
        method: "POST", headers: aiHeaders(),
        body: JSON.stringify({ patient_id: id, plan_type: planType }),
      });
      const res = await r.json();
      if (res.success && res.data) setCarePlan(res.data);
    } catch { /* ignore */ }
    setGeneratingPlan(false);
  }

  async function runVitalsAnalysis() {
    setAnalyzingVitals(true);
    try {
      const r = await fetch("/api/ai/vitals-analysis", {
        method: "POST", headers: aiHeaders(),
        body: JSON.stringify({ patient_id: id }),
      });
      const res = await r.json();
      if (res.success && res.data) setAiAnalysis(res.data);
    } catch { /* ignore */ }
    setAnalyzingVitals(false);
  }

  async function completeInstruction(insId: string) {
    await apiClient("/api/instructions", {
      method: "PATCH",
      body: JSON.stringify({ id: insId, status: "completed", completed_by: user?.name }),
    });
    setInstructions((prev) => prev.map((i) => i.id === insId ? { ...i, status: "completed", completed_by: user?.name, completed_at: new Date().toISOString() } : i));
  }

  if (loading) return <div className="space-y-4"><Skeleton className="h-10 w-64" /><Skeleton className="h-48 w-full" /><div className="grid grid-cols-2 gap-4"><Skeleton className="h-48" /><Skeleton className="h-48" /></div></div>;
  if (!patient) return <div className="flex flex-col items-center py-20"><p className="text-[#6B7280] mb-4">Patient not found</p><Link href="/"><Button variant="secondary">Back</Button></Link></div>;

  const v = patient.latest_vitals;
  const vitalsData = ((patient.vitals_history ?? []) as unknown as Row[]).slice().reverse().map((vs) => ({
    time: new Date(String(vs.recorded_at)).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    hr: vs.heart_rate, sys: vs.blood_pressure_sys, dia: vs.blood_pressure_dia,
    spo2: vs.spo2, sugar: vs.blood_sugar, temp: vs.temperature, pain: vs.pain_level,
  }));

  return (
    <div className="space-y-5">
      {/* Allergy Banner */}
      {allergies.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-lg bg-red-500/10 border-2 border-red-500/40 px-4 py-3 flex items-center gap-3">
          <TriangleAlert className="h-6 w-6 text-red-400 shrink-0" />
          <div>
            <p className="text-sm font-bold text-red-400">ALLERGIES</p>
            <p className="text-sm text-red-300">
              {allergies.map((a) => `${a.allergen} (${a.severity} — ${a.reaction})`).join(" | ")}
            </p>
          </div>
        </motion.div>
      )}

      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/"><Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <PageHeader title={patient.name} description={`${patient.age}y ${patient.sex} • ${patient.blood_group} • Room ${patient.room?.room_number ?? "—"}`}>
          {user?.role === "doctor" && <Link href={`/prescribe?patient=${id}`}><Button size="sm"><Pill className="h-4 w-4" /> Prescribe</Button></Link>}
          <Link href={`/vitals?patient=${id}`}><Button variant="secondary" size="sm"><Activity className="h-4 w-4" /> Record Vitals</Button></Link>
          {user?.role === "doctor" && <Link href={`/discharge?patient=${id}`}><Button variant="danger" size="sm"><Home className="h-4 w-4" /> Discharge</Button></Link>}
          <Button variant="secondary" size="sm" onClick={() => {
            if (!patient) return;
            generatePatientPdf({ patient: patient as unknown as Row, allergies, labs, notes, instructions, medAdmin, carePlan: carePlan?.plan });
            toast("PDF downloaded", "success");
          }}><Download className="h-4 w-4" /> Download PDF</Button>
        </PageHeader>
      </div>

      {/* Quick Info */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="py-3"><div className="flex items-center gap-2 mb-1"><BedDouble className="h-4 w-4 text-blue-400" /><span className="text-xs font-medium text-[#6B7280]">Admission</span></div><p className="text-sm text-[#D1D5DB] line-clamp-1">{patient.admission?.reason ?? "N/A"}</p><p className="text-xs text-[#6B7280] mt-1">{formatDate(patient.admission?.admission_date ?? null)}</p></Card>
        <Card className="py-3"><div className="flex items-center gap-2 mb-1"><FileText className="h-4 w-4 text-amber-400" /><span className="text-xs font-medium text-[#6B7280]">Diagnosis</span></div><p className="text-sm text-[#D1D5DB] line-clamp-2">{patient.admission?.diagnosis ?? "N/A"}</p></Card>
        <Card className="py-3"><div className="flex items-center gap-2 mb-1"><Stethoscope className="h-4 w-4 text-cyan-400" /><span className="text-xs font-medium text-[#6B7280]">Primary Doctor</span></div><p className="text-sm text-[#D1D5DB]">{patient.assigned_doctor?.name ?? "Unassigned"}</p><p className="text-xs text-[#6B7280]">{patient.assigned_doctor?.specialization}</p></Card>
        <Card className="py-3"><div className="flex items-center gap-2 mb-1"><Phone className="h-4 w-4 text-green-400" /><span className="text-xs font-medium text-[#6B7280]">Emergency Contact</span></div><p className="text-sm text-[#D1D5DB]">{patient.emergency_contact?.name ?? "N/A"}</p><p className="text-xs text-[#6B7280]">{patient.emergency_contact?.relationship} • {patient.emergency_contact?.phone}</p></Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-white/[0.06] pb-0">
        {(["overview", "vitals", "notes", "labs", "timeline", "careplan"] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === tab ? "border-emerald-500 text-emerald-400" : "border-transparent text-[#6B7280] hover:text-[#D1D5DB]"}`}>
            {tab === "overview" ? "Overview" : tab === "vitals" ? "Vitals" : tab === "notes" ? `Notes (${notes.length})` : tab === "labs" ? `Labs (${labs.length})` : tab === "careplan" ? "Care Plan" : "Timeline"}
          </button>
        ))}
      </div>

      {/* Tab: Overview */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {/* Vitals Snapshot */}
          {v && (
            <Card>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2"><Activity className="h-5 w-5 text-green-400" /><CardTitle>Latest Vitals</CardTitle></div>
                <span className="text-xs text-[#6B7280]">{v.recorded_by} • {new Date(v.recorded_at as string).toLocaleTimeString()}</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { icon: Heart, label: "HR", val: v.heart_rate, unit: "bpm" },
                  { icon: Activity, label: "BP", val: v.blood_pressure_sys ? `${v.blood_pressure_sys}/${v.blood_pressure_dia}` : null, unit: "mmHg" },
                  { icon: Wind, label: "SpO2", val: v.spo2, unit: "%" },
                  { icon: Droplets, label: "Sugar", val: v.blood_sugar, unit: "mg/dL" },
                  { icon: Thermometer, label: "Temp", val: v.temperature, unit: "°F" },
                  { icon: Brain, label: "Pain", val: v.pain_level, unit: "/10" },
                ].map((item) => (
                  <div key={item.label} className="rounded bg-white/[0.04] p-2 text-center">
                    <item.icon className="h-3 w-3 mx-auto mb-0.5 text-[#6B7280]" />
                    <p className="text-sm font-mono font-bold text-[#D1D5DB]">{item.val ?? "—"}</p>
                    <p className="text-[10px] text-[#6B7280]">{item.label} {item.unit}</p>
                  </div>
                ))}
              </div>
              {v.notes && <p className="text-xs text-[#6B7280] mt-2 bg-white/[0.04]/50 rounded px-2 py-1"><strong>Note:</strong> {v.notes as string}</p>}
            </Card>
          )}

          {/* Medications */}
          <Card>
            <div className="flex items-center gap-2 mb-3"><Pill className="h-5 w-5 text-emerald-400" /><CardTitle>Medications ({patient.medications?.length ?? 0})</CardTitle></div>
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {patient.medications?.map((med) => {
                const overdue = med.next_due && new Date(med.next_due) < new Date();
                return (
                  <div key={med.id} className={`rounded-lg bg-white/[0.04] p-2.5 ${overdue ? "border border-amber-500/40" : ""}`}>
                    <div className="flex items-center justify-between mb-0.5">
                      <button onClick={(e) => { e.stopPropagation(); setDrugInfoDrug(med.drug?.name ?? null); }} className="text-sm font-medium text-emerald-400 font-mono hover:text-emerald-300 hover:underline transition-colors text-left">{med.drug?.name}</button>
                      <div className="flex items-center gap-1.5">
                        {overdue && <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/30">OVERDUE</Badge>}
                        <Badge className="bg-green-500/10 text-green-400 border-green-500/30">{med.status}</Badge>
                      </div>
                    </div>
                    <p className="text-xs text-[#6B7280]">{med.dose} • {med.frequency} • {med.route}</p>
                    {med.instructions && <p className="text-xs text-amber-400/70 mt-0.5">{med.instructions}</p>}
                    {med.next_due && <p className="text-[10px] text-[#6B7280] mt-0.5 flex items-center gap-1"><Clock className="h-3 w-3" /> Next: {new Date(med.next_due).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>}
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Doctor Instructions */}
          <Card>
            <div className="flex items-center gap-2 mb-3"><ClipboardList className="h-5 w-5 text-amber-400" /><CardTitle>Instructions ({instructions.filter((i) => i.status !== "completed").length} pending)</CardTitle></div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {instructions.map((ins) => (
                <div key={ins.id as string} className={`rounded px-3 py-2 ${ins.status === "completed" ? "bg-white/[0.04]/30" : "bg-white/[0.04]"}`}>
                  <div className="flex items-center justify-between mb-1">
                    <Badge className={ins.priority === "stat" ? "bg-red-500/10 text-red-400 border-red-500/30" : ins.priority === "urgent" ? "bg-orange-500/10 text-orange-400 border-orange-500/30" : ""}>{ins.priority as string}</Badge>
                    <div className="flex items-center gap-2">
                      <Badge className={ins.status === "completed" ? "bg-green-500/10 text-green-400 border-green-500/30" : "bg-blue-500/10 text-blue-400 border-blue-500/30"}>{ins.status as string}</Badge>
                      {ins.status !== "completed" && user?.role === "nurse" && <button onClick={() => completeInstruction(ins.id as string)} className="text-xs text-green-400 hover:underline">Done</button>}
                    </div>
                  </div>
                  <p className={`text-sm ${ins.status === "completed" ? "text-[#6B7280] line-through" : "text-[#D1D5DB]"}`}>{ins.instruction as string}</p>
                  <p className="text-xs text-[#6B7280] mt-1">{ins.doctor_name as string} • {ins.category as string}</p>
                </div>
              ))}
            </div>
          </Card>

          {/* Pharmacogenomics + Allergies sidebar */}
          <div className="space-y-5">
            {patient.genotypes && patient.genotypes.length > 0 && (
              <Card className="border-emerald-500/20">
                <div className="flex items-center gap-2 mb-3"><Dna className="h-5 w-5 text-emerald-400" /><CardTitle>Pharmacogenomics</CardTitle></div>
                {patient.genotypes.map((gt) => (
                  <div key={gt.id} className="flex items-center justify-between rounded bg-white/[0.04] px-3 py-2 mb-2">
                    <span className="text-sm font-mono text-[#D1D5DB]">{gt.gene_variant?.gene} {gt.gene_variant?.variant}</span>
                    <Badge variant="risk" riskLevel={gt.gene_variant?.type === "poor_metabolizer" ? "high" : "moderate"}>{gt.gene_variant?.type?.replace("_", " ")}</Badge>
                  </div>
                ))}
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Tab: Vitals Chart */}
      {activeTab === "vitals" && (
        <div className="space-y-5">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold text-[#F0FDF4]">Vitals Trends</h3>
              <div className="flex items-start gap-1.5 mt-1"><Info className="h-3.5 w-3.5 text-[#6B7280] mt-0.5 shrink-0" /><p className="text-xs text-[#6B7280]">Line charts track vital signs over time. Dashed reference lines show normal thresholds. Values crossing these lines indicate clinical concern.</p></div>
            </div>
            <Button variant="secondary" size="sm" onClick={runVitalsAnalysis} disabled={analyzingVitals}>
              <Brain className="h-4 w-4" /> {analyzingVitals ? "Analyzing..." : "AI Analysis"}
            </Button>
          </div>

          {aiAnalysis && (
            <Card className="border-l-4 border-l-emerald-500">
              <div className="flex items-center gap-2 mb-2"><Brain className="h-4 w-4 text-emerald-400" /><span className="text-sm font-semibold text-[#D1D5DB]">AI Analysis</span><Badge>{aiAnalysis.ai_model}</Badge></div>
              <p className="text-sm text-[#D1D5DB] mb-2">{aiAnalysis.summary}</p>
              {aiAnalysis.anomalies.length > 0 && <div className="mb-2">{aiAnalysis.anomalies.map((a, i) => <p key={i} className="text-sm text-red-400 flex items-center gap-1"><AlertTriangle className="h-3 w-3" />{a}</p>)}</div>}
              {aiAnalysis.recommendations.length > 0 && <div>{aiAnalysis.recommendations.map((r, i) => <p key={i} className="text-sm text-green-400">• {r}</p>)}</div>}
            </Card>
          )}

          {vitalsData.length > 1 ? (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {[
                { key: "hr", label: "Heart Rate (bpm)", color: "#ef4444", refHigh: 100, refLow: 60 },
                { key: "sys", label: "Blood Pressure Systolic (mmHg)", color: "#f97316", refHigh: 140, refLow: 90 },
                { key: "spo2", label: "SpO2 (%)", color: "#06b6d4", refLow: 95 },
                { key: "sugar", label: "Blood Sugar (mg/dL)", color: "#eab308", refHigh: 180, refLow: 70 },
              ].map((chart) => (
                <Card key={chart.key} className="p-4">
                  <p className="text-sm font-medium text-[#D1D5DB] mb-3">{chart.label}</p>
                  <ResponsiveContainer width="100%" height={180}>
                    <LineChart data={vitalsData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272A" />
                      <XAxis dataKey="time" tick={{ fontSize: 11, fill: "#71717A" }} />
                      <YAxis tick={{ fontSize: 11, fill: "#71717A" }} />
                      <Tooltip contentStyle={{ backgroundColor: "#18181B", border: "1px solid #3F3F46", borderRadius: 8, fontSize: 12 }} />
                      {chart.refHigh && <ReferenceLine y={chart.refHigh} stroke="#ef4444" strokeDasharray="3 3" strokeOpacity={0.5} />}
                      {chart.refLow && <ReferenceLine y={chart.refLow} stroke="#f97316" strokeDasharray="3 3" strokeOpacity={0.5} />}
                      <Line type="monotone" dataKey={chart.key} stroke={chart.color} strokeWidth={2} dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </Card>
              ))}
            </div>
          ) : (
            <Card><p className="text-center text-[#6B7280] py-8">Not enough vitals data for charts. Record more vitals to see trends.</p></Card>
          )}
        </div>
      )}

      {/* Tab: Nurse Notes */}
      {activeTab === "notes" && (
        <div className="space-y-4">
          {user && (
            <Card>
              <div className="flex items-center gap-2 mb-3"><MessageSquare className="h-5 w-5 text-blue-400" /><CardTitle>Add Note</CardTitle></div>
              <div className="flex gap-2 mb-3">
                {["observation", "assessment", "intervention", "communication"].map((type) => (
                  <button key={type} onClick={() => setNoteType(type)} className={`px-3 py-1 rounded text-xs capitalize ${noteType === type ? "bg-emerald-600 text-white" : "bg-white/[0.04] text-[#6B7280] hover:bg-white/[0.06]"}`}>{type}</button>
                ))}
              </div>
              <textarea value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder="Enter your clinical note..." className="w-full rounded-lg border border-white/[0.06] bg-white/[0.04] px-3 py-2 text-sm text-[#D1D5DB] placeholder:text-[#6B7280] focus:border-emerald-500 focus:outline-none min-h-20 resize-y" />
              <Button onClick={submitNote} size="sm" className="mt-2" disabled={!newNote.trim()}><Send className="h-4 w-4" /> Save Note</Button>
            </Card>
          )}
          <div className="space-y-3">
            {notes.map((note) => (
              <Card key={note.id as string}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Badge>{note.note_type as string}</Badge>
                    <span className="text-sm font-medium text-[#D1D5DB]">{note.author as string}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-[#6B7280]">
                    <Badge className="bg-white/[0.04]">{note.shift as string} shift</Badge>
                    {new Date(note.created_at as string).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
                <p className="text-sm text-[#D1D5DB]">{note.content as string}</p>
              </Card>
            ))}
            {notes.length === 0 && <Card><p className="text-center text-[#6B7280] py-6">No notes yet</p></Card>}
          </div>
        </div>
      )}

      {/* Tab: Lab Results */}
      {activeTab === "labs" && (
        <div className="space-y-4">
          {/* Bullet Chart Visualization */}
          {labs.length > 0 && (
            <Card>
              <div className="flex items-center gap-2 mb-2"><FlaskConical className="h-5 w-5 text-purple-400" /><CardTitle>Lab Results — Visual Range</CardTitle></div>
              <div className="flex items-start gap-1.5 mb-4"><Info className="h-3.5 w-3.5 text-[#6B7280] mt-0.5 shrink-0" /><p className="text-xs text-[#6B7280]">Each bar shows where the patient&apos;s value falls relative to the normal range (green zone). The marker glows red if critical, amber if abnormal, green if normal.</p></div>
              <div className="space-y-2.5">
                {labs.map((lab, i) => {
                  const value = Number(lab.value); const low = Number(lab.reference_low) || 0; const high = Number(lab.reference_high) || value * 2;
                  const range = high - low || 1; const maxD = high + range * 0.5; const minD = low - range * 0.3;
                  const valuePos = Math.min(100, Math.max(0, ((value - minD) / (maxD - minD)) * 100));
                  const lowPos = Math.max(0, ((low - minD) / (maxD - minD)) * 100);
                  const highPos = Math.min(100, ((high - minD) / (maxD - minD)) * 100);
                  const sc = lab.status === "critical" ? "#EF4444" : lab.status === "abnormal" ? "#F59E0B" : "#22C55E";
                  return (
                    <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }} className="flex items-center gap-3">
                      <div className="w-24 shrink-0"><p className="text-xs font-medium text-[#D1D5DB] truncate">{lab.test_name as string}</p></div>
                      <div className="flex-1 relative h-5 bg-white/[0.03] rounded-full overflow-hidden">
                        <div className="absolute h-full bg-emerald-500/8 rounded" style={{ left: `${lowPos}%`, width: `${highPos - lowPos}%` }} />
                        <motion.div initial={{ left: 0 }} animate={{ left: `${valuePos}%` }} transition={{ duration: 0.8, delay: i * 0.04 }}
                          className="absolute top-0 h-full w-1 rounded" style={{ backgroundColor: sc, boxShadow: `0 0 6px ${sc}60` }} />
                      </div>
                      <span className="text-xs font-mono font-bold w-16 text-right shrink-0" style={{ color: sc }}>{value} {lab.unit as string}</span>
                    </motion.div>
                  );
                })}
              </div>
            </Card>
          )}
          {/* Table */}
          <Card>
            <CardTitle className="mb-3">Detailed Lab Results</CardTitle>
            {labs.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-white/[0.06]">
                    <th className="pb-2 text-left text-xs font-medium text-[#6B7280]">Test</th>
                    <th className="pb-2 text-left text-xs font-medium text-[#6B7280]">Value</th>
                    <th className="pb-2 text-left text-xs font-medium text-[#6B7280]">Reference</th>
                    <th className="pb-2 text-left text-xs font-medium text-[#6B7280]">Status</th>
                    <th className="pb-2 text-left text-xs font-medium text-[#6B7280]">Date</th>
                  </tr></thead>
                  <tbody>
                    {labs.map((lab) => (
                      <tr key={lab.id as string} className="border-b border-white/[0.03]">
                        <td className="py-2 text-[#D1D5DB] font-medium">{lab.test_name as string}</td>
                        <td className={`py-2 font-mono font-bold ${lab.status === "critical" ? "text-red-400" : lab.status === "abnormal" ? "text-amber-400" : "text-emerald-400"}`}>{lab.value as number} {lab.unit as string}</td>
                        <td className="py-2 text-[#6B7280]">{lab.reference_low as number} - {lab.reference_high as number}</td>
                        <td className="py-2"><Badge className={lab.status === "critical" ? "bg-red-500/10 text-red-400 border-red-500/20" : lab.status === "abnormal" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"}>{lab.status as string}</Badge></td>
                        <td className="py-2 text-[#6B7280] text-xs">{new Date(lab.resulted_at as string).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (<div className="text-center text-[#6B7280] py-6">No lab results available</div>)}
          </Card>
        </div>
      )}

      {/* Tab: Timeline */}
      {activeTab === "timeline" && (
        <div className="space-y-2">
          {[
            ...((patient.vitals_history ?? []) as unknown as Row[]).map((vs) => ({ time: String(vs.recorded_at), type: "vitals", icon: Activity, color: "text-green-400", title: `Vitals recorded by ${vs.recorded_by}`, detail: `HR:${vs.heart_rate} BP:${vs.blood_pressure_sys}/${vs.blood_pressure_dia} SpO2:${vs.spo2}% ${vs.notes ? `— ${vs.notes}` : ""}` })),
            ...medAdmin.map((ma) => ({ time: ma.administered_at as string, type: "med", icon: Pill, color: ma.status === "held" ? "text-amber-400" : "text-emerald-400", title: `${ma.drug_name ?? "Medication"} ${ma.dose_given} — ${ma.status}`, detail: `By ${ma.administered_by}${ma.notes ? ` — ${ma.notes}` : ""}${ma.reason ? ` — Reason: ${ma.reason}` : ""}` })),
            ...notes.map((n) => ({ time: n.created_at as string, type: "note", icon: MessageSquare, color: "text-blue-400", title: `${n.note_type} note by ${n.author}`, detail: n.content as string })),
            ...instructions.map((ins) => ({ time: ins.created_at as string, type: "instruction", icon: ClipboardList, color: "text-amber-400", title: `[${ins.priority}] ${ins.category} instruction`, detail: ins.instruction as string })),
            ...labs.map((lab) => ({ time: lab.resulted_at as string, type: "lab", icon: FlaskConical, color: lab.status === "critical" ? "text-red-400" : "text-purple-400", title: `Lab: ${lab.test_name} = ${lab.value} ${lab.unit}`, detail: `Status: ${lab.status} | Ordered by ${lab.ordered_by}` })),
          ]
            .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
            .map((event, i) => (
              <motion.div key={`${event.type}-${i}`} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.02 }}>
                <div className="flex items-start gap-3 rounded-lg bg-[#141918] border border-white/[0.04] px-4 py-3">
                  <event.icon className={`h-4 w-4 mt-0.5 shrink-0 ${event.color}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-[#D1D5DB]">{event.title}</p>
                      <span className="text-xs text-[#6B7280] shrink-0 ml-2">{new Date(event.time).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                    <p className="text-xs text-[#6B7280] mt-0.5 line-clamp-2">{event.detail}</p>
                  </div>
                </div>
              </motion.div>
            ))}
        </div>
      )}

      {/* Drug Info Modal */}
      {/* Tab: Care Plan */}
      {activeTab === "careplan" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Button onClick={() => generateCarePlan("current")} disabled={generatingPlan} variant="secondary">
              {generatingPlan ? <Loader2 className="h-4 w-4 animate-spin" /> : <HeartPulse className="h-4 w-4" />}
              Current Care Plan
            </Button>
            <Button onClick={() => generateCarePlan("discharge")} disabled={generatingPlan}>
              {generatingPlan ? <Loader2 className="h-4 w-4 animate-spin" /> : <Home className="h-4 w-4" />}
              Discharge Plan + Home Remedies
            </Button>
          </div>

          {generatingPlan && (
            <Card variant="glass">
              <AiLoadingTip patientName={patient.name} action="care plan" />
            </Card>
          )}

          {carePlan && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <Card>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    {carePlan.plan_type === "discharge" ? <Home className="h-5 w-5 text-emerald-400" /> : <HeartPulse className="h-5 w-5 text-sky-400" />}
                    <CardTitle>{carePlan.plan_type === "discharge" ? "Discharge Care Plan" : "Current Care Plan"}</CardTitle>
                    <Badge className={carePlan.ai_model !== "rule-based" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : ""}>{carePlan.ai_model === "nvidia" ? "NVIDIA Nemotron" : carePlan.ai_model}</Badge>
                  </div>
                  <Button variant="secondary" size="sm" onClick={() => window.print()}>
                    <Download className="h-4 w-4" /> Print
                  </Button>
                </div>
                <MarkdownRenderer content={carePlan.plan} />
              </Card>
            </motion.div>
          )}

          {!carePlan && !generatingPlan && (
            <Card variant="glass">
              <div className="text-center py-8">
                <HeartPulse className="h-10 w-10 text-[#6B7280] mx-auto mb-3" />
                <div className="text-[#D1D5DB] font-medium mb-1">Generate a Care Plan</div>
                <div className="text-sm text-[#6B7280] max-w-md mx-auto">
                  Choose &quot;Current Care Plan&quot; for nursing care priorities, or &quot;Discharge Plan&quot; for home care instructions, remedies, diet, and follow-up schedule.
                </div>
              </div>
            </Card>
          )}
        </div>
      )}

      <DrugInfoModal drugName={drugInfoDrug} onClose={() => setDrugInfoDrug(null)} />

      {/* AI Clinical Copilot */}
      <AICopilot patientId={id} patientName={patient.name} />
    </div>
  );
}
