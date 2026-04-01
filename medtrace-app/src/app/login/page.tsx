"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Stethoscope, Activity, Key, ArrowRight, Shield, Building2, Sparkles } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { useAuth, type AiProvider } from "@/lib/auth-context";

interface StaffMember {
  id: string; name: string; role: "doctor" | "nurse";
  department: string; employee_id: string; email: string;
}

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoggedIn } = useAuth();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [aiProvider, setAiProvider] = useState<AiProvider>("nvidia");
  const [roleFilter, setRoleFilter] = useState<"all" | "doctor" | "nurse">("all");
  const [step, setStep] = useState<1 | 2>(1);

  useEffect(() => {
    if (isLoggedIn) { router.push("/"); return; }
    fetch("/api/register").then((r) => r.json()).then((d) => {
      if (d.data) setStaff(d.data);
    });
  }, [isLoggedIn, router]);

  function handleLogin() {
    if (!selectedStaff) return;
    login(selectedStaff, apiKey.trim() ? aiProvider : "none", apiKey.trim());
    router.push("/");
  }

  const filtered = staff.filter((s) => roleFilter === "all" || s.role === roleFilter);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0C0F0E] p-4 relative overflow-hidden">
      {/* Background mesh */}
      <div className="absolute inset-0 gradient-mesh" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-[#1B6B3A]/5 blur-[120px]" />

      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-10">
          <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} transition={{ type: "spring", damping: 15 }} className="inline-flex items-center justify-center">
            <Logo size={64} className="shadow-2xl glow-brand" />
          </motion.div>
          <h1 className="text-3xl font-bold text-[#F0FDF4] mt-5 tracking-tight">MedTrace</h1>
          <p className="text-sm text-[#6B7280] mt-1.5 font-medium">AI-Powered Hospital Nursing Station</p>
        </div>

        {/* Step 1 */}
        {step === 1 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <div className="glass rounded-2xl p-6">
              <p className="text-sm font-semibold text-[#D1D5DB] mb-4">Select your profile</p>
              <div className="flex gap-2 mb-4">
                {[
                  { key: "all", label: "All" },
                  { key: "doctor", label: "Doctors", icon: Stethoscope },
                  { key: "nurse", label: "Nurses", icon: Activity },
                ].map((f) => (
                  <button key={f.key} onClick={() => setRoleFilter(f.key as typeof roleFilter)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${roleFilter === f.key ? "bg-[#1B6B3A] text-white shadow-lg" : "bg-white/[0.04] text-[#6B7280] hover:bg-white/[0.06]"}`}>
                    {f.icon && <f.icon className="h-3 w-3" />}{f.label}
                  </button>
                ))}
              </div>
              <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
                {filtered.map((s) => (
                  <button key={s.id} onClick={() => setSelectedStaff(s)}
                    className={`w-full flex items-center gap-3 rounded-xl px-4 py-3 text-left transition-all duration-200 ${selectedStaff?.id === s.id ? "bg-[#1B6B3A]/15 border border-[#22C55E]/30 shadow-md" : "bg-white/[0.02] border border-transparent hover:bg-white/[0.04]"}`}>
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold ${s.role === "doctor" ? "bg-sky-500/10 text-sky-400" : "bg-emerald-500/10 text-emerald-400"}`}>
                      {s.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#D1D5DB]">{s.name}</p>
                      <div className="flex items-center gap-1.5 text-[10px] text-[#6B7280]">
                        <Building2 className="h-2.5 w-2.5" />{s.department}
                      </div>
                    </div>
                    {selectedStaff?.id === s.id && <div className="h-2 w-2 rounded-full bg-[#22C55E] glow-green" />}
                  </button>
                ))}
              </div>
            </div>
            <button onClick={() => selectedStaff && setStep(2)} disabled={!selectedStaff}
              className="w-full flex items-center justify-center gap-2 h-12 rounded-xl bg-gradient-to-r from-[#1B6B3A] to-[#16A34A] text-white font-semibold hover:shadow-lg hover:shadow-[#1B6B3A]/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed">
              Continue <ArrowRight className="h-4 w-4" />
            </button>
          </motion.div>
        )}

        {/* Step 2 */}
        {step === 2 && selectedStaff && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <div className="glass rounded-2xl p-4 flex items-center gap-3">
              <div className={`flex h-11 w-11 items-center justify-center rounded-xl text-sm font-bold ${selectedStaff.role === "doctor" ? "bg-sky-500/10 text-sky-400" : "bg-emerald-500/10 text-emerald-400"}`}>
                {selectedStaff.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
              </div>
              <div>
                <p className="text-[15px] font-semibold text-[#F0FDF4]">{selectedStaff.name}</p>
                <p className="text-xs text-[#6B7280] capitalize">{selectedStaff.role} — {selectedStaff.department}</p>
              </div>
              <button onClick={() => setStep(1)} className="ml-auto text-xs text-[#6B7280] hover:text-[#D1D5DB] px-2 py-1 rounded-lg hover:bg-white/[0.04]">Change</button>
            </div>

            <div className="glass rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="h-5 w-5 text-[#22C55E]" />
                <p className="text-sm font-semibold text-[#D1D5DB]">AI Configuration</p>
              </div>

              <p className="text-xs text-[#6B7280] mb-3">Select your AI provider for drug info, clinical copilot, and smart prescriptions.</p>
              <div className="grid grid-cols-2 gap-2 mb-5">
                {([
                  { id: "nvidia" as AiProvider, label: "NVIDIA NIM", desc: "Nemotron 120B", gradient: "from-green-500/10 to-emerald-600/5", active: "border-green-500/40" },
                  { id: "gemini" as AiProvider, label: "Google Gemini", desc: "2.0 Flash", gradient: "from-blue-500/10 to-sky-600/5", active: "border-blue-500/40" },
                ]).map((p) => (
                  <button key={p.id} onClick={() => setAiProvider(p.id)}
                    className={`rounded-xl p-3.5 text-left border transition-all ${aiProvider === p.id ? `bg-gradient-to-br ${p.gradient} ${p.active} shadow-md` : "border-white/[0.04] bg-white/[0.02] hover:bg-white/[0.04]"}`}>
                    <p className="text-sm font-semibold text-[#D1D5DB]">{p.label}</p>
                    <p className="text-[10px] text-[#6B7280] mt-0.5">{p.desc}</p>
                  </button>
                ))}
              </div>

              <p className="text-xs text-[#6B7280] mb-2">
                {aiProvider === "nvidia" ? <>Get free key at <a href="https://build.nvidia.com/" target="_blank" rel="noopener noreferrer" className="text-[#22C55E] hover:underline">build.nvidia.com</a></> : <>Get free key at <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:underline">aistudio.google.com</a></>}
              </p>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B7280]" />
                <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)}
                  placeholder={aiProvider === "nvidia" ? "nvapi-..." : "AIzaSy..."}
                  className="h-11 w-full rounded-xl border border-white/[0.06] bg-white/[0.03] pl-10 pr-3 text-sm text-[#D1D5DB] font-mono placeholder:text-[#6B7280]/40 focus:border-[#22C55E]/50 focus:outline-none focus:ring-1 focus:ring-[#22C55E]/20 transition-all" />
              </div>
              <div className="flex items-start gap-2 mt-3 text-[11px] text-[#6B7280]">
                <Shield className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span>Key stays in your browser only. Skip for database-only mode.</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className="flex-1 h-12 rounded-xl bg-white/[0.04] text-[#D1D5DB] font-medium hover:bg-white/[0.06] transition-all">Back</button>
              <button onClick={handleLogin}
                className="flex-1 flex items-center justify-center gap-2 h-12 rounded-xl bg-gradient-to-r from-[#1B6B3A] to-[#16A34A] text-white font-semibold hover:shadow-lg hover:shadow-[#1B6B3A]/20 transition-all">
                {selectedStaff.role === "doctor" ? <Stethoscope className="h-4 w-4" /> : <Activity className="h-4 w-4" />}
                Login
              </button>
            </div>
            {!apiKey && (
              <button onClick={handleLogin} className="w-full text-center text-xs text-[#6B7280] hover:text-[#D1D5DB] transition-colors py-1">
                Skip — use database-only mode
              </button>
            )}
          </motion.div>
        )}

        <div className="text-center mt-6">
          <p className="text-sm text-[#6B7280]">
            New here?{" "}
            <button onClick={() => router.push("/register")} className="text-emerald-400 hover:text-emerald-300 font-medium hover:underline transition-colors">
              Create an account
            </button>
          </p>
        </div>

        <p className="text-center text-[10px] text-[#6B7280]/50 mt-4 tracking-wider uppercase">MedTrace v2.0 — AI-Powered Clinical Platform</p>
      </motion.div>
    </div>
  );
}
