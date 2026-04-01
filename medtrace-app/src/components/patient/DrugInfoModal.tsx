"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Pill, Loader2, Brain, Database } from "lucide-react";
import { MarkdownRenderer } from "@/components/ui/MarkdownRenderer";
import { Badge } from "@/components/ui/Badge";
import { useAuth } from "@/lib/auth-context";

interface DrugInfoModalProps {
  drugName: string | null;
  onClose: () => void;
}

interface DrugInfoData {
  drug_name: string;
  summary: string;
  source: string;
  drug_info: Record<string, unknown> | null;
  interactions: { drug_a: string; drug_b: string; severity: number; mechanism: string }[];
  ai_model?: string;
}

export function DrugInfoModal({ drugName, onClose }: DrugInfoModalProps) {
  const [data, setData] = useState<DrugInfoData | null>(null);
  const [loading, setLoading] = useState(false);
  const [enhancing, setEnhancing] = useState(false);
  const { aiHeaders, hasAi } = useAuth();

  useEffect(() => {
    if (!drugName) return;
    setLoading(true);
    fetch(`/api/drug-info/${encodeURIComponent(drugName)}`, { headers: aiHeaders() })
      .then((r) => r.json())
      .then((res) => { if (res.success && res.data) setData(res.data); })
      .finally(() => setLoading(false));
    return () => { setData(null); };
  }, [drugName, aiHeaders]);

  function enhanceWithAI() {
    if (!drugName || !hasAi) return;
    setEnhancing(true);
    const headers = { ...aiHeaders(), "x-enhance": "true" };
    fetch(`/api/drug-info/${encodeURIComponent(drugName)}`, { headers })
      .then((r) => r.json())
      .then((res) => { if (res.success && res.data) setData(res.data); })
      .finally(() => setEnhancing(false));
  }

  if (!drugName) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-10 pb-10 bg-black/60 backdrop-blur-sm overflow-y-auto" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          className="relative w-full max-w-3xl rounded-xl border border-white/[0.06] bg-[#141918] shadow-2xl mx-4"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-emerald-500/10 p-2">
                <Pill className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-[#F0FDF4]">{drugName}</h2>
                {data?.drug_info?.generic_name ? (
                  <p className="text-sm text-[#6B7280]">{String(data.drug_info.generic_name)} — {String(data.drug_info.drug_class)}</p>
                ) : null}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {data && (
                <Badge className={
                  data.source === "ai-live" || data.source === "ai-cache" || data.source === "ai-generated"
                    ? "bg-green-500/10 text-green-400 border-green-500/30"
                    : "bg-white/[0.04] text-[#6B7280]"
                }>
                  {data.source === "ai-live" || data.source === "ai-generated" ? (data.ai_model === "nvidia" ? "NVIDIA AI" : "AI") : data.source === "ai-cache" ? "Cached" : "Database"}
                </Badge>
              )}
              {data && hasAi && data.source !== "ai-live" && (
                <button onClick={enhanceWithAI} disabled={enhancing}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/15 transition-all disabled:opacity-40">
                  {enhancing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Brain className="h-3 w-3" />}
                  {enhancing ? "Enhancing..." : data.source === "ai-cache" ? "Refresh with AI" : "Enhance with AI"}
                </button>
              )}
              <button onClick={onClose} className="rounded-lg p-1.5 text-[#6B7280] hover:bg-white/[0.06] hover:text-[#D1D5DB] transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="px-6 py-5 max-h-[70vh] overflow-y-auto">
            {loading && (
              <div className="flex flex-col items-center py-12 gap-3">
                <Loader2 className="h-8 w-8 text-emerald-400 animate-spin" />
                <p className="text-sm text-[#6B7280]">
                  {data === null ? "Retrieving drug data..." : "Generating AI summary..."}
                </p>
                <p className="text-xs text-[#6B7280]">Retrieving drug data + AI analysis</p>
              </div>
            )}

            {!loading && data && (
              <div className="space-y-4">
                {/* Quick Stats */}
                {data.drug_info && (
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-lg bg-white/[0.04] p-3 text-center">
                      <p className="text-xs text-[#6B7280] mb-1">Pregnancy</p>
                      <p className={`text-lg font-bold ${
                        String(data.drug_info.pregnancy_category) === "X" || String(data.drug_info.pregnancy_category) === "D"
                          ? "text-red-400" : "text-[#D1D5DB]"
                      }`}>
                        Cat. {String(data.drug_info.pregnancy_category)}
                      </p>
                    </div>
                    <div className="rounded-lg bg-white/[0.04] p-3 text-center">
                      <p className="text-xs text-[#6B7280] mb-1">Half-life</p>
                      <p className="text-sm font-medium text-[#D1D5DB]">{String(data.drug_info.half_life)}</p>
                    </div>
                    <div className="rounded-lg bg-white/[0.04] p-3 text-center">
                      <p className="text-xs text-[#6B7280] mb-1">Route</p>
                      <p className="text-sm font-medium text-[#D1D5DB]">{String(data.drug_info.route_of_administration)}</p>
                    </div>
                  </div>
                )}

                {/* AI Summary */}
                <MarkdownRenderer content={data.summary} />

                {/* Known Interactions from DB */}
                {data.interactions.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-white/[0.06]">
                    <div className="flex items-center gap-2 mb-3">
                      <Database className="h-4 w-4 text-orange-400" />
                      <p className="text-sm font-semibold text-[#D1D5DB]">Database Interactions ({data.interactions.length})</p>
                    </div>
                    <div className="space-y-2">
                      {data.interactions.map((int, i) => (
                        <div key={i} className="flex items-center justify-between rounded bg-white/[0.04] px-3 py-2">
                          <div>
                            <p className="text-sm text-[#D1D5DB]">{int.drug_a} + {int.drug_b}</p>
                            <p className="text-xs text-[#6B7280]">{int.mechanism}</p>
                          </div>
                          <Badge variant="risk" riskLevel={int.severity > 7 ? "critical" : int.severity > 4 ? "high" : "moderate"}>
                            {int.severity}/10
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Source indicator */}
                <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center gap-2 text-xs text-[#6B7280]">
                  {data.source === "ai-live" ? (
                    <><Brain className="h-3.5 w-3.5 text-green-400" /> AI-generated summary by {String(data.ai_model ?? "AI").toUpperCase()}</>
                  ) : data.source === "ai-cache" ? (
                    <><Brain className="h-3.5 w-3.5 text-blue-400" /> Cached AI summary ({String(data.ai_model ?? "AI")})</>
                  ) : (
                    <><Database className="h-3.5 w-3.5 text-[#6B7280]" /> MedTrace curated database{!hasAi ? " — add AI key at login for enhanced summaries" : ""}</>
                  )}
                </div>
              </div>
            )}

            {!loading && !data && (
              <div className="text-center py-12">
                <p className="text-[#6B7280]">No information found for this drug.</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
