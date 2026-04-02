"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Home, Loader2, Download, AlertTriangle, CheckCircle2,
  Pill, Heart, FlaskConical, Dna, Stethoscope, Info, FileText, Send,
} from "lucide-react";
import { Card, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { MarkdownRenderer } from "@/components/ui/MarkdownRenderer";
import { AiLoadingTip } from "@/components/ui/AiLoadingTip";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/components/ui/Toast";
import { apiClient } from "@/lib/api";
import type { Patient } from "@/lib/types";

type Row = Record<string, unknown>;

export default function DischargePage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <DischargeContent />
    </Suspense>
  );
}

function DischargeContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const patientId = searchParams.get("patient") ?? "";
  const { user, aiHeaders, hasAi } = useAuth();
  const { toast } = useToast();

  const [patient, setPatient] = useState<Patient | null>(null);
  const [allergies, setAllergies] = useState<Row[]>([]);
  const [labs, setLabs] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [carePlan, setCarePlan] = useState<{ plan: string; ai_model: string } | null>(null);
  const [generating, setGenerating] = useState(false);
  const [dischargeNotes, setDischargeNotes] = useState("");
  const [discharging, setDischarging] = useState(false);
  const [discharged, setDischarged] = useState(false);

  useEffect(() => {
    if (!patientId) { setLoading(false); return; }
    Promise.all([
      apiClient<Patient>(`/api/patients/${patientId}`),
      apiClient<Row[]>(`/api/allergies?patient_id=${patientId}`),
      apiClient<Row[]>(`/api/labs?patient_id=${patientId}`),
    ]).then(([pRes, aRes, lRes]) => {
      if (pRes.data) setPatient(pRes.data);
      if (aRes.data) setAllergies(aRes.data);
      if (lRes.data) setLabs(lRes.data);
      setLoading(false);
    });
  }, [patientId]);

  async function generateDischargePlan() {
    setGenerating(true);
    try {
      const r = await fetch("/api/ai/care-plan", {
        method: "POST", headers: aiHeaders(),
        body: JSON.stringify({ patient_id: patientId, plan_type: "discharge" }),
      });
      const res = await r.json();
      if (res.success && res.data) {
        setCarePlan(res.data);
        toast("Discharge care plan generated", "success");
      }
    } catch { toast("Failed to generate plan", "error"); }
    setGenerating(false);
  }

  async function handleDischarge() {
    if (!patient) return;
    setDischarging(true);
    const res = await apiClient("/api/discharge", {
      method: "POST",
      body: JSON.stringify({ patient_id: patientId, discharge_notes: dischargeNotes || "Discharged per attending physician." }),
    });
    if (res.success) {
      setDischarged(true);
      toast(`${patient.name} has been discharged successfully`, "success");
    } else {
      toast(res.error?.message ?? "Discharge failed", "error");
    }
    setDischarging(false);
  }

  if (loading) return <div className="space-y-4 max-w-4xl"><Skeleton className="h-10 w-64" /><Skeleton className="h-48" /><Skeleton className="h-96" /></div>;

  if (!patientId) return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold text-[#F0FDF4] mb-4">Discharge Patient</h1>
      <Card variant="glass"><div className="text-center py-12"><p className="text-[#6B7280]">Select a patient to discharge from their profile page.</p></div></Card>
    </div>
  );

  if (!patient) return <Card><div className="text-center py-12 text-[#6B7280]">Patient not found</div></Card>;

  if (discharged) return (
    <div className="max-w-4xl">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
        <Card className="text-center py-16">
          <CheckCircle2 className="h-16 w-16 text-emerald-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-[#F0FDF4] mb-2">Patient Discharged</h2>
          <p className="text-[#6B7280] mb-6">{patient.name} has been successfully discharged. Room {patient.room?.room_number} is now available.</p>
          <div className="flex gap-3 justify-center">
            <Button variant="secondary" onClick={() => router.push("/")}>Back to Dashboard</Button>
            {carePlan && <Button onClick={() => window.print()}><Download className="h-4 w-4" /> Print Discharge Plan</Button>}
          </div>
        </Card>
      </motion.div>
    </div>
  );

  const v = patient.latest_vitals;
  const abnormalLabs = labs.filter((l) => l.status !== "normal");

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#F0FDF4] flex items-center gap-3">
          <div className="rounded-xl bg-gradient-to-br from-emerald-500/15 to-emerald-600/5 p-2.5">
            <Home className="h-6 w-6 text-emerald-400" />
          </div>
          Discharge — {patient.name}
        </h1>
        <p className="text-sm text-[#6B7280] mt-2">Review patient status, generate discharge care plan, and complete the discharge process.</p>
      </div>

      {/* Patient Summary Card */}
      <Card variant="elevated">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div>
            <p className="text-[10px] text-[#6B7280] uppercase tracking-wider mb-1">Patient</p>
            <p className="text-sm font-semibold text-[#F0FDF4]">{patient.name}</p>
            <p className="text-xs text-[#6B7280]">{patient.age}y {patient.sex} • {patient.blood_group}</p>
          </div>
          <div>
            <p className="text-[10px] text-[#6B7280] uppercase tracking-wider mb-1">Room</p>
            <p className="text-sm font-semibold text-[#F0FDF4]">{patient.room?.room_number ?? "—"}</p>
            <p className="text-xs text-[#6B7280]">{patient.room?.ward}</p>
          </div>
          <div>
            <p className="text-[10px] text-[#6B7280] uppercase tracking-wider mb-1">Diagnosis</p>
            <p className="text-sm text-[#D1D5DB] line-clamp-2">{patient.admission?.diagnosis ?? "—"}</p>
          </div>
          <div>
            <p className="text-[10px] text-[#6B7280] uppercase tracking-wider mb-1">Attending</p>
            <p className="text-sm text-[#D1D5DB]">{patient.assigned_doctor?.name ?? "—"}</p>
          </div>
        </div>
      </Card>

      {/* Pre-discharge Checklist */}
      <Card>
        <CardTitle className="mb-4">Pre-Discharge Assessment</CardTitle>
        <div className="flex items-start gap-1.5 mb-4"><Info className="h-3.5 w-3.5 text-[#6B7280] mt-0.5 shrink-0" /><p className="text-xs text-[#6B7280]">Review all items before discharge. Abnormal findings should be addressed or documented in discharge notes.</p></div>

        <div className="space-y-3">
          {/* Vitals */}
          <div className="flex items-center justify-between rounded-xl bg-white/[0.02] border border-white/[0.04] p-3">
            <div className="flex items-center gap-3">
              <Heart className="h-5 w-5 text-red-400" />
              <div>
                <p className="text-sm font-medium text-[#D1D5DB]">Latest Vitals</p>
                {v ? <p className="text-xs text-[#6B7280]">HR:{v.heart_rate} BP:{v.blood_pressure_sys}/{v.blood_pressure_dia} SpO2:{v.spo2}% Sugar:{v.blood_sugar} Pain:{v.pain_level}/10</p> : <p className="text-xs text-[#6B7280]">No vitals recorded</p>}
              </div>
            </div>
            {v && Number(v.pain_level) <= 3 && Number(v.spo2) >= 95 ? <CheckCircle2 className="h-5 w-5 text-emerald-400" /> : <AlertTriangle className="h-5 w-5 text-amber-400" />}
          </div>

          {/* Allergies */}
          <div className="flex items-center justify-between rounded-xl bg-white/[0.02] border border-white/[0.04] p-3">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-red-400" />
              <div>
                <p className="text-sm font-medium text-[#D1D5DB]">Allergies Documented</p>
                <p className="text-xs text-[#6B7280]">{allergies.length > 0 ? allergies.map((a) => String(a.allergen)).join(", ") : "NKDA"}</p>
              </div>
            </div>
            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
          </div>

          {/* Abnormal Labs */}
          <div className="flex items-center justify-between rounded-xl bg-white/[0.02] border border-white/[0.04] p-3">
            <div className="flex items-center gap-3">
              <FlaskConical className="h-5 w-5 text-purple-400" />
              <div>
                <p className="text-sm font-medium text-[#D1D5DB]">Lab Results</p>
                <p className="text-xs text-[#6B7280]">{abnormalLabs.length > 0 ? `${abnormalLabs.length} abnormal: ${abnormalLabs.map((l) => l.test_name).join(", ")}` : "All within normal limits"}</p>
              </div>
            </div>
            {abnormalLabs.length === 0 ? <CheckCircle2 className="h-5 w-5 text-emerald-400" /> : <AlertTriangle className="h-5 w-5 text-amber-400" />}
          </div>

          {/* Medications */}
          <div className="flex items-center justify-between rounded-xl bg-white/[0.02] border border-white/[0.04] p-3">
            <div className="flex items-center gap-3">
              <Pill className="h-5 w-5 text-emerald-400" />
              <div>
                <p className="text-sm font-medium text-[#D1D5DB]">Active Medications</p>
                <p className="text-xs text-[#6B7280]">{patient.medications?.length ?? 0} active — will be marked as completed on discharge</p>
              </div>
            </div>
            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
          </div>

          {/* Pharmacogenomics */}
          {patient.genotypes && patient.genotypes.length > 0 && (
            <div className="flex items-center justify-between rounded-xl bg-white/[0.02] border border-white/[0.04] p-3">
              <div className="flex items-center gap-3">
                <Dna className="h-5 w-5 text-emerald-400" />
                <div>
                  <p className="text-sm font-medium text-[#D1D5DB]">Pharmacogenomics</p>
                  <p className="text-xs text-[#6B7280]">{patient.genotypes.map((g) => `${g.gene_variant?.gene} ${g.gene_variant?.variant} (${g.gene_variant?.type?.replace("_", " ")})`).join(", ")}</p>
                </div>
              </div>
              <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20">Include in discharge</Badge>
            </div>
          )}
        </div>
      </Card>

      {/* Generate Discharge Plan */}
      <Card variant="glass" className="glow-green">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-emerald-400" />
            <CardTitle>AI Discharge Care Plan</CardTitle>
            {!hasAi && <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20">Add AI key for full plan</Badge>}
          </div>
          <Button onClick={generateDischargePlan} disabled={generating}>
            {generating ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating...</> : <><Stethoscope className="h-4 w-4" /> Generate Plan</>}
          </Button>
        </div>
        <div className="flex items-start gap-1.5 mb-4"><Info className="h-3.5 w-3.5 text-[#6B7280] mt-0.5 shrink-0" /><p className="text-xs text-[#6B7280]">AI analyzes the patient&apos;s complete medical profile — conditions, medications, vitals, labs, allergies, and genetics — to generate a comprehensive discharge plan with home care instructions, medication guide, diet plan, warning signs, and follow-up schedule.</p></div>

        {generating && (
          <AiLoadingTip patientName={patient.name} action="discharge care plan" />
        )}

        {carePlan && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 p-5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
            <div className="flex items-center justify-between mb-4">
              <Badge className={carePlan.ai_model !== "rule-based" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : ""}>{carePlan.ai_model === "nvidia" ? "NVIDIA Nemotron" : carePlan.ai_model}</Badge>
              <Button variant="secondary" size="sm" onClick={() => window.print()}><Download className="h-4 w-4" /> Print Plan</Button>
            </div>
            <MarkdownRenderer content={carePlan.plan} />
          </motion.div>
        )}

        {!carePlan && !generating && (
          <div className="text-center py-6 text-[#6B7280] text-sm">Click &quot;Generate Plan&quot; to create a personalized discharge care plan.</div>
        )}
      </Card>

      {/* Discharge Notes + Final Button */}
      <Card>
        <CardTitle className="mb-3">Discharge Notes</CardTitle>
        <textarea
          value={dischargeNotes}
          onChange={(e) => setDischargeNotes(e.target.value)}
          placeholder="Add any additional discharge notes, follow-up instructions, or physician comments..."
          className="w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3 text-sm text-[#D1D5DB] placeholder:text-[#6B7280]/40 focus:border-emerald-500/40 focus:outline-none min-h-24 resize-y"
        />
        <div className="flex items-center justify-between mt-4">
          <p className="text-xs text-[#6B7280]">
            Discharging will: mark all medications as completed, cancel pending instructions, free up Room {patient.room?.room_number}.
          </p>
          <Button onClick={handleDischarge} disabled={discharging || !user} className="px-6">
            {discharging ? <><Loader2 className="h-4 w-4 animate-spin" /> Processing...</> : <><Send className="h-4 w-4" /> Discharge Patient</>}
          </Button>
        </div>
      </Card>
    </div>
  );
}
