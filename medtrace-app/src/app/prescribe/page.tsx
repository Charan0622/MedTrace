"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Search, AlertTriangle, Shield, ChevronRight, Loader2, CheckCircle2, Sparkles, Pill } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/layout/PageHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import { VoiceButton } from "@/components/voice/VoiceButton";
import { VoiceTranscript } from "@/components/voice/VoiceTranscript";
import { useVoice } from "@/hooks/use-voice";
import { DrugLink } from "@/components/ui/DrugLink";
import { AiLoadingTip } from "@/components/ui/AiLoadingTip";
import { apiClient } from "@/lib/api";
import { getRiskColor } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/components/ui/Toast";
import type { Drug, PrescriptionCheckResult, AlternativeDrug } from "@/lib/types";

interface AiSuggestion {
  drug_name: string;
  dose: string;
  frequency: string;
  route: string;
  rationale: string;
  warnings: string;
  priority: string;
}

interface PatientOption {
  id: string;
  name: string;
}

const ANALYSIS_STEPS = [
  "Checking direct drug-drug interactions...",
  "Analyzing enzyme cascade pathways...",
  "Evaluating contraindications...",
  "Checking pharmacogenomic risks...",
  "Generating risk assessment...",
];

export default function PrescribePage() {
  return (
    <Suspense fallback={<div className="space-y-6"><Skeleton className="h-10 w-64" /><Skeleton className="h-40 w-full" /></div>}>
      <PrescribeContent />
    </Suspense>
  );
}

function PrescribeContent() {
  const searchParams = useSearchParams();
  const preselectedPatient = searchParams.get("patient");

  const [patients, setPatients] = useState<PatientOption[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<string>(preselectedPatient ?? "");
  const [drugQuery, setDrugQuery] = useState("");
  const [drugResults, setDrugResults] = useState<Drug[]>([]);
  const [selectedDrug, setSelectedDrug] = useState<Drug | null>(null);
  const [checking, setChecking] = useState(false);
  const [analysisStep, setAnalysisStep] = useState(0);
  const [result, setResult] = useState<PrescriptionCheckResult | null>(null);
  const [alternatives, setAlternatives] = useState<AlternativeDrug[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<AiSuggestion[]>([]);
  const [aiSuggestModel, setAiSuggestModel] = useState<string>("");
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const { user, hasAi, aiHeaders } = useAuth();
  const { toast } = useToast();
  const voice = useVoice();
  const [prescribeDose, setPrescribeDose] = useState("");
  const [prescribeFreq, setPrescribeFreq] = useState("");
  const [addingMed, setAddingMed] = useState(false);

  // Load patients
  useEffect(() => {
    apiClient<PatientOption[]>("/api/patients").then((res) => {
      if (res.success && res.data) setPatients(res.data);
    });
  }, []);

  // Set preselected patient
  useEffect(() => {
    if (preselectedPatient && patients.length > 0 && !selectedPatient) {
      setSelectedPatient(preselectedPatient);
    }
  }, [preselectedPatient, patients.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Voice extraction -> auto-fill drug search
  useEffect(() => {
    if (voice.extraction?.entities.drugs.length) {
      setDrugQuery(voice.extraction.entities.drugs[0]);
      setSelectedDrug(null);
    }
  }, [voice.extraction]);

  useEffect(() => {
    if (drugQuery.length < 2) {
      setDrugResults([]);
      return;
    }
    const timeout = setTimeout(() => {
      apiClient<Drug[]>(`/api/drugs/search?q=${encodeURIComponent(drugQuery)}`).then((res) => {
        if (res.success && res.data) {
          setDrugResults(res.data);
          setShowDropdown(true);
        }
      });
    }, 300);
    return () => clearTimeout(timeout);
  }, [drugQuery]);

  async function runCheck() {
    if (!selectedPatient || !selectedDrug) return;

    setChecking(true);
    setResult(null);
    setAlternatives([]);

    // Animate through analysis steps
    for (let i = 0; i < ANALYSIS_STEPS.length; i++) {
      setAnalysisStep(i);
      await new Promise((r) => setTimeout(r, 600));
    }

    const [checkRes, altRes] = await Promise.all([
      apiClient<PrescriptionCheckResult>("/api/prescribe/check", {
        method: "POST",
        body: JSON.stringify({ patient_id: selectedPatient, drug_name: selectedDrug.name }),
      }),
      apiClient<AlternativeDrug[]>("/api/prescribe/alternatives", {
        method: "POST",
        body: JSON.stringify({ patient_id: selectedPatient, drug_name: selectedDrug.name }),
      }),
    ]);

    if (checkRes.success && checkRes.data) setResult(checkRes.data);
    if (altRes.success && altRes.data) setAlternatives(altRes.data);
    setChecking(false);
  }

  const selectedPatientName = patients.find((p) => p.id === selectedPatient)?.name;

  async function fetchAiSuggestions() {
    if (!selectedPatient) return;
    setLoadingSuggestions(true);
    setAiSuggestions([]);
    try {
      const res = await fetch("/api/ai/suggest-prescription", {
        method: "POST", headers: aiHeaders(),
        body: JSON.stringify({ patient_id: selectedPatient }),
      });
      const data = await res.json();
      if (data.success && data.data?.suggestions) {
        setAiSuggestions(data.data.suggestions);
        setAiSuggestModel(data.data.ai_model ?? "");
        const model = data.data.ai_model;
        const aiError = data.data.ai_error;
        if (model === "rule-based" && aiError) {
          toast(`${data.data.suggestions.length} suggestions (rule-based — AI error: ${aiError})`, "warning");
        } else if (model === "rule-based") {
          toast(`${data.data.suggestions.length} rule-based suggestions${hasAi ? "" : " — add AI key at login for smarter recommendations"}`, "info");
        } else {
          toast(`${data.data.suggestions.length} AI-powered suggestions from ${model}`, "success");
        }
      } else {
        toast("No suggestions available for this patient", "info");
      }
    } catch { toast("Failed to get suggestions — check your connection", "error"); }
    setLoadingSuggestions(false);
  }

  async function addToPatient() {
    if (!selectedPatient || !selectedDrug || !prescribeDose || !prescribeFreq) return;
    setAddingMed(true);
    const res = await apiClient("/api/medications", {
      method: "POST",
      body: JSON.stringify({
        patient_id: selectedPatient,
        drug_id: selectedDrug.id,
        drug_name: selectedDrug.name,
        generic_name: selectedDrug.generic_name,
        drug_class: selectedDrug.drug_class,
        dose: prescribeDose,
        frequency: prescribeFreq,
        route: "Oral",
        prescriber: user?.name ?? "Unknown",
      }),
    });
    if (res.success) {
      prefetchDrugInfo(selectedDrug.name); // cache drug info for fast access in patient profile
      toast(`${selectedDrug.name} ${prescribeDose} added to ${selectedPatientName}'s medications`, "success");
      setPrescribeDose("");
      setPrescribeFreq("");
    } else {
      toast(res.error?.message ?? "Failed to add medication", "error");
    }
    setAddingMed(false);
  }

  // Pre-fetch drug info when a drug is selected — stores in DB for instant access later
  function prefetchDrugInfo(name: string) {
    fetch(`/api/drug-info/${encodeURIComponent(name)}`, { headers: aiHeaders() }).catch(() => {});
  }

  function applySuggestion(s: AiSuggestion) {
    const drug = drugResults.find((d) => d.name.toLowerCase() === s.drug_name.toLowerCase())
      ?? { id: `fda-${s.drug_name.toLowerCase().replace(/\s+/g, "-")}`, name: s.drug_name, generic_name: null, drug_class: null, efficacy_score: null };
    setSelectedDrug(drug as Drug);
    setDrugQuery("");
    setShowDropdown(false);
    setPrescribeDose(s.dose);
    setPrescribeFreq(s.frequency);
    prefetchDrugInfo(s.drug_name);
    toast(`Applied: ${s.drug_name} ${s.dose} — review and Add to Patient`, "info");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Prescription Check"
        description="Analyze drug interactions before prescribing"
      >
        <VoiceButton
          isListening={voice.isListening}
          isSupported={voice.isSupported}
          onStart={voice.startListening}
          onStop={voice.stopListening}
        />
      </PageHeader>

      {/* Input Section */}
      <Card>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {/* Patient Select */}
          <div>
            <label className="block text-sm font-medium text-[#D1D5DB] mb-2">Patient</label>
            <select
              value={selectedPatient}
              onChange={(e) => { setSelectedPatient(e.target.value); setResult(null); }}
              className="h-10 w-full rounded-lg border border-white/[0.06] bg-white/[0.04] px-3 text-sm text-[#D1D5DB] focus:border-emerald-500 focus:outline-none"
            >
              <option value="">Select a patient...</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Drug Search */}
          <div className="relative">
            <label className="block text-sm font-medium text-[#D1D5DB] mb-2">New Medication</label>
            <Input
              placeholder="Search drugs..."
              icon={<Search className="h-4 w-4" />}
              value={selectedDrug ? `${selectedDrug.name}` : drugQuery}
              onChange={(e) => {
                setDrugQuery(e.target.value);
                setSelectedDrug(null);
                setResult(null);
              }}
              onFocus={() => drugResults.length > 0 && setShowDropdown(true)}
            />
            {showDropdown && drugResults.length > 0 && !selectedDrug && (
              <div className="absolute z-10 mt-1 w-full max-h-80 overflow-y-auto rounded-2xl border border-white/[0.08] bg-[#141918] shadow-2xl">
                {drugResults.map((drug: Drug & { source?: string }) => {
                  const srcLabel = drug.source === "local" ? null : drug.source === "rxnorm" ? "RxNorm" : drug.source === "openfda" ? "FDA" : drug.source === "custom" ? "Custom" : null;
                  const srcColor = drug.source === "rxnorm" ? "text-emerald-400 bg-emerald-500/10" : drug.source === "openfda" ? "text-sky-400 bg-sky-500/10" : drug.source === "custom" ? "text-amber-400 bg-amber-500/10" : "";
                  return (
                    <button key={drug.id}
                      onClick={() => { setSelectedDrug(drug); setDrugQuery(""); setShowDropdown(false); prefetchDrugInfo(drug.name); }}
                      className="w-full px-4 py-2.5 text-left hover:bg-white/[0.04] transition-all first:rounded-t-2xl last:rounded-b-2xl flex items-center justify-between border-b border-white/[0.03] last:border-0">
                      <div>
                        <p className="text-sm font-medium text-[#F0FDF4] font-mono">{drug.name}</p>
                        <p className="text-[11px] text-[#6B7280]">{drug.drug_class ?? ""} {drug.generic_name ? `· ${drug.generic_name}` : ""}</p>
                      </div>
                      {srcLabel && <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-lg shrink-0 ${srcColor}`}>{srcLabel}</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Check Button */}
          <div className="flex items-end">
            <Button
              onClick={runCheck}
              disabled={!selectedPatient || !selectedDrug || checking}
              className="w-full"
            >
              {checking ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Analyzing...</>
              ) : (
                <><Shield className="h-4 w-4" /> Check Interactions</>
              )}
            </Button>
          </div>
        </div>
      </Card>

      {/* Voice Transcript */}
      <VoiceTranscript
        transcript={voice.transcript}
        interimTranscript={voice.interimTranscript}
        isListening={voice.isListening}
        isExtracting={voice.isExtracting}
        extraction={voice.extraction}
        error={voice.error}
      />

      {/* Add to Patient — shows when drug is selected */}
      {selectedPatient && selectedDrug && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card variant="elevated" className="border-emerald-500/10">
            <div className="flex items-center gap-2 mb-3">
              <Pill className="h-5 w-5 text-emerald-400" />
              <p className="text-sm font-semibold text-[#F0FDF4]">
                Prescribe <DrugLink name={selectedDrug.name} className="text-sm" /> to {selectedPatientName}
              </p>
            </div>
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <label className="block text-[10px] font-medium text-[#6B7280] uppercase tracking-wider mb-1">Dose</label>
                <input placeholder="e.g. 10mg" value={prescribeDose} onChange={(e) => setPrescribeDose(e.target.value)}
                  className="h-10 w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 text-sm text-[#D1D5DB] placeholder:text-[#6B7280]/40 focus:border-emerald-500/40 focus:outline-none" />
              </div>
              <div className="flex-1">
                <label className="block text-[10px] font-medium text-[#6B7280] uppercase tracking-wider mb-1">Frequency</label>
                <input placeholder="e.g. Twice daily" value={prescribeFreq} onChange={(e) => setPrescribeFreq(e.target.value)}
                  className="h-10 w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 text-sm text-[#D1D5DB] placeholder:text-[#6B7280]/40 focus:border-emerald-500/40 focus:outline-none" />
              </div>
              <div className="flex-1">
                <label className="block text-[10px] font-medium text-[#6B7280] uppercase tracking-wider mb-1">Route</label>
                <select className="h-10 w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 text-sm text-[#D1D5DB] focus:border-emerald-500/40 focus:outline-none">
                  <option value="Oral">Oral</option>
                  <option value="IV">IV</option>
                  <option value="Subcutaneous">Subcutaneous</option>
                  <option value="Intramuscular">Intramuscular</option>
                  <option value="Topical">Topical</option>
                  <option value="Inhaled">Inhaled</option>
                  <option value="Nebulizer">Nebulizer</option>
                </select>
              </div>
              <Button onClick={addToPatient} disabled={!prescribeDose || !prescribeFreq || addingMed} className="h-10">
                {addingMed ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Pill className="h-4 w-4" /> Add to Patient</>}
              </Button>
            </div>
            <p className="text-[10px] text-[#6B7280] mt-2">Run interaction check first to verify safety, then add to patient&apos;s medications.</p>
          </Card>
        </motion.div>
      )}

      {/* AI Prescription Suggestions */}
      {selectedPatient && (
        <Card variant="glass">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-emerald-400" />
              <CardTitle>AI Prescription Suggestions</CardTitle>
              {aiSuggestModel && <Badge className={aiSuggestModel === "rule-based" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"}>{aiSuggestModel === "rule-based" ? "Rule-Based" : aiSuggestModel === "nvidia" ? "NVIDIA Nemotron" : aiSuggestModel}</Badge>}
              {!hasAi && !aiSuggestModel && <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20">Add API key for AI</Badge>}
            </div>
            <Button variant="secondary" size="sm" onClick={fetchAiSuggestions} disabled={loadingSuggestions || !selectedPatient}>
              {loadingSuggestions ? <><Loader2 className="h-4 w-4 animate-spin" /> Analyzing...</> : <><Sparkles className="h-4 w-4" /> Get Suggestions</>}
            </Button>
          </div>

          {loadingSuggestions && (
            <AiLoadingTip patientName={selectedPatientName ?? "patient"} action="prescription suggestions" />
          )}

          {aiSuggestions.length > 0 && (
            <div className="space-y-3">
              {aiSuggestions.map((s, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}>
                  <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-4 hover:bg-white/[0.05] transition-all">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <DrugLink name={s.drug_name} className="text-base font-semibold" />
                        <Badge className={s.priority === "high" ? "bg-red-500/10 text-red-400 border-red-500/20" : s.priority === "medium" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : ""}>{s.priority}</Badge>
                      </div>
                      <Button size="sm" onClick={() => applySuggestion(s)}>Use This</Button>
                    </div>
                    <p className="text-sm text-[#D1D5DB] font-mono">{s.dose} — {s.frequency} — {s.route}</p>
                    <p className="text-sm text-[#6B7280] mt-2">{s.rationale}</p>
                    {s.warnings && <p className="text-sm text-amber-400/80 mt-1 flex items-start gap-1"><AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />{s.warnings}</p>}
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {aiSuggestions.length === 0 && !loadingSuggestions && (
            <p className="text-sm text-[#6B7280] py-2">Click &quot;Get Suggestions&quot; to analyze the patient and recommend medications.</p>
          )}
        </Card>
      )}

      {/* Analysis Progress */}
      <AnimatePresence>
        {checking && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card>
              <CardTitle className="mb-4">Analyzing Interactions</CardTitle>
              <div className="space-y-3">
                {ANALYSIS_STEPS.map((step, i) => (
                  <div key={step} className="flex items-center gap-3">
                    {i < analysisStep ? (
                      <CheckCircle2 className="h-5 w-5 text-green-400" />
                    ) : i === analysisStep ? (
                      <Loader2 className="h-5 w-5 text-emerald-400 animate-spin" />
                    ) : (
                      <div className="h-5 w-5 rounded-full border border-white/[0.06]" />
                    )}
                    <span className={i <= analysisStep ? "text-[#D1D5DB]" : "text-[#6B7280]"}>
                      {step}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results */}
      {result && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Overall Risk */}
          <Card
            className="border-l-4"
            style={{ borderLeftColor: getRiskColor(result.overall_risk) }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#6B7280]">
                  Adding <span className="font-mono text-[#D1D5DB]">{result.new_drug}</span> to {selectedPatientName}&apos;s medications
                </p>
                <p className="mt-1 text-2xl font-bold" style={{ color: getRiskColor(result.overall_risk) }}>
                  {result.overall_risk.toUpperCase()} RISK
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge>{result.ai_powered ? "AI-Enhanced" : "Rule-Based"}</Badge>
                <Badge variant="risk" riskLevel={result.overall_risk}>
                  {result.interactions.length} interaction{result.interactions.length !== 1 ? "s" : ""}
                </Badge>
              </div>
            </div>
          </Card>


          {/* Interaction Cards */}
          {result.interactions.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-[#F0FDF4]">Interaction Details</h3>
              {result.interactions.map((chain, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                >
                  <Card className={`border-l-4 ${chain.risk_level === "critical" ? "glow-critical" : ""}`} style={{ borderLeftColor: getRiskColor(chain.risk_level) }}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5" style={{ color: getRiskColor(chain.risk_level) }} />
                        <span className="text-sm font-semibold text-[#F0FDF4]">{chain.type.replace("_", " ").toUpperCase()}</span>
                      </div>
                      <Badge variant="risk" riskLevel={chain.risk_level}>
                        {chain.risk_level}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                      {chain.drugs_involved.map((drug, j) => (
                        <span key={j} className="flex items-center gap-1">
                          <span className="rounded bg-white/[0.04] px-2 py-1 text-xs font-mono text-[#D1D5DB]">
                            {drug}
                          </span>
                          {j < chain.drugs_involved.length - 1 && (
                            <ChevronRight className="h-3 w-3 text-[#6B7280]" />
                          )}
                        </span>
                      ))}
                    </div>

                    <p className="text-sm font-medium text-[#D1D5DB] mb-1">{chain.mechanism}</p>
                    <p className="text-sm text-[#6B7280]">{chain.explanation}</p>

                    {chain.evidence_level && (
                      <p className="mt-2 text-xs text-[#6B7280]">Evidence: {chain.evidence_level}</p>
                    )}
                  </Card>
                </motion.div>
              ))}
            </div>
          )}

          {result.interactions.length === 0 && (
            <Card className="border-l-4 border-l-cyan-500 glow-safe">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-6 w-6 text-cyan-400" />
                <div>
                  <p className="font-medium text-[#F0FDF4]">No interactions detected</p>
                  <p className="text-sm text-[#6B7280]">
                    {result.new_drug} appears safe to add to this patient&apos;s medication regimen.
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Alternatives */}
          {alternatives.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-[#F0FDF4]">Safer Alternatives</h3>
              {alternatives.map((alt, i) => (
                <motion.div
                  key={alt.drug.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                >
                  <Card className="hover:border-white/[0.08] transition-colors">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-medium text-[#F0FDF4] font-mono">{alt.drug.name}</p>
                          <Badge variant="risk" riskLevel={alt.risk_level}>{alt.risk_level}</Badge>
                        </div>
                        <p className="text-xs text-[#6B7280] mb-2">{alt.drug.drug_class} &middot; {alt.drug.generic_name}</p>
                        <p className="text-sm text-[#D1D5DB]">{alt.reason}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-green-400">{alt.interactions_avoided}</p>
                        <p className="text-xs text-[#6B7280]">interactions avoided</p>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
