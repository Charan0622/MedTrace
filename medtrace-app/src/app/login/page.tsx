"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Key, ArrowRight, Shield, Mail, Lock, Stethoscope, Activity, Zap } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { useAuth } from "@/lib/auth-context";

const DEMO_PROFILES = [
  { id: "user-doc-chen", name: "Dr. Sarah Chen", role: "doctor" as const, department: "Cardiology", employee_id: "DOC-1001", email: "s.chen@hospital.org", icon: Stethoscope, color: "sky" },
  { id: "user-nurse-amy", name: "Amy Rodriguez", role: "nurse" as const, department: "General Ward", employee_id: "NUR-2001", email: "a.rodriguez@hospital.org", icon: Activity, color: "emerald" },
];

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoggedIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [loggedInUser, setLoggedInUser] = useState<any>(null);

  useEffect(() => {
    if (isLoggedIn) router.push("/");
  }, [isLoggedIn, router]);

  async function handleCredentialLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!email || !password) { setError("Email and password are required"); return; }

    setSubmitting(true);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!data.success) {
        setError(data.error?.message ?? "Invalid credentials");
        setSubmitting(false);
        return;
      }

      setLoggedInUser(data.data);
      setStep(2);
    } catch {
      setError("Something went wrong. Please try again.");
    }
    setSubmitting(false);
  }

  function handleDemoLogin(profile: typeof DEMO_PROFILES[0]) {
    setLoggedInUser(profile);
    setStep(2);
  }

  function handleFinalLogin() {
    if (!loggedInUser) return;
    login(loggedInUser, apiKey.trim());
    router.push("/");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0C0F0E] p-4 relative overflow-hidden">
      <div className="absolute inset-0 gradient-mesh" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-[#1B6B3A]/5 blur-[120px]" />

      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} transition={{ type: "spring", damping: 15 }} className="inline-flex items-center justify-center">
            <Logo size={64} className="shadow-2xl glow-brand" />
          </motion.div>
          <h1 className="text-3xl font-bold text-[#F0FDF4] mt-5 tracking-tight">MedTrace</h1>
          <p className="text-sm text-[#6B7280] mt-1.5 font-medium">AI-Powered Hospital Nursing Station</p>
        </div>

        {/* Step 1: Login */}
        {step === 1 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            {/* Quick Demo Access */}
            <div className="glass rounded-2xl p-5">
              <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider mb-3">Quick Demo Access</p>
              <div className="grid grid-cols-2 gap-2">
                {DEMO_PROFILES.map((profile) => (
                  <button key={profile.id} onClick={() => handleDemoLogin(profile)}
                    className="rounded-xl p-3 text-left border border-transparent hover:border-emerald-500/20 bg-white/[0.02] hover:bg-white/[0.04] transition-all group">
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className={`rounded-lg p-1.5 ${profile.color === "sky" ? "bg-sky-500/10" : "bg-emerald-500/10"}`}>
                        <profile.icon className={`h-4 w-4 ${profile.color === "sky" ? "text-sky-400" : "text-emerald-400"}`} />
                      </div>
                      <span className="text-[10px] text-[#6B7280] capitalize">{profile.role}</span>
                    </div>
                    <p className="text-sm font-medium text-[#D1D5DB] group-hover:text-[#F0FDF4] transition-colors">{profile.name}</p>
                    <p className="text-[10px] text-[#6B7280]">{profile.department}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-white/[0.06]" />
              <span className="text-[10px] text-[#6B7280] uppercase tracking-wider">or sign in</span>
              <div className="flex-1 h-px bg-white/[0.06]" />
            </div>

            {/* Email + Password */}
            <form onSubmit={handleCredentialLogin} className="space-y-4">
              <div className="glass rounded-2xl p-5 space-y-3">
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B7280]" />
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email address"
                    className="h-11 w-full rounded-xl border border-white/[0.06] bg-white/[0.03] pl-10 pr-3 text-sm text-[#D1D5DB] placeholder:text-[#6B7280]/40 focus:border-[#22C55E]/50 focus:outline-none focus:ring-1 focus:ring-[#22C55E]/20 transition-all" />
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B7280]" />
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    className="h-11 w-full rounded-xl border border-white/[0.06] bg-white/[0.03] pl-10 pr-3 text-sm text-[#D1D5DB] placeholder:text-[#6B7280]/40 focus:border-[#22C55E]/50 focus:outline-none focus:ring-1 focus:ring-[#22C55E]/20 transition-all" />
                </div>
                {error && (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-red-400 bg-red-500/10 rounded-lg px-3 py-2">
                    {error}
                  </motion.p>
                )}
              </div>
              <button type="submit" disabled={submitting}
                className="w-full flex items-center justify-center gap-2 h-12 rounded-xl bg-gradient-to-r from-[#1B6B3A] to-[#16A34A] text-white font-semibold hover:shadow-lg hover:shadow-[#1B6B3A]/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                {submitting ? "Signing in..." : "Sign In"} <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          </motion.div>
        )}

        {/* Step 2: AI Key */}
        {step === 2 && loggedInUser && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            {/* User badge */}
            <div className="glass rounded-2xl p-4 flex items-center gap-3">
              <div className={`flex h-11 w-11 items-center justify-center rounded-xl text-sm font-bold ${loggedInUser.role === "doctor" ? "bg-sky-500/10 text-sky-400" : "bg-emerald-500/10 text-emerald-400"}`}>
                {loggedInUser.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
              </div>
              <div>
                <p className="text-[15px] font-semibold text-[#F0FDF4]">{loggedInUser.name}</p>
                <p className="text-xs text-[#6B7280] capitalize">{loggedInUser.role} — {loggedInUser.department}</p>
              </div>
              <button onClick={() => { setStep(1); setLoggedInUser(null); setError(""); }} className="ml-auto text-xs text-[#6B7280] hover:text-[#D1D5DB] px-2 py-1 rounded-lg hover:bg-white/[0.04]">Change</button>
            </div>

            {/* NVIDIA API Key */}
            <div className="glass rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-1">
                <Zap className="h-5 w-5 text-emerald-400" />
                <p className="text-sm font-semibold text-[#D1D5DB]">NVIDIA NIM API Key</p>
              </div>
              <p className="text-[11px] text-[#6B7280] mb-4">Powers all AI features — clinical copilot, care plans, drug analysis, and smart prescriptions. Uses dual models: <span className="text-emerald-400">Llama 3.1 8B</span> for instant responses + <span className="text-emerald-400">Nemotron Super 49B</span> for detailed reports.</p>

              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-emerald-400">API Key</label>
                <a href="https://build.nvidia.com/" target="_blank" rel="noopener noreferrer" className="text-[10px] text-[#6B7280] hover:text-emerald-400 transition-colors">Get free key at build.nvidia.com</a>
              </div>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B7280]" />
                <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)}
                  placeholder="nvapi-..."
                  className="h-11 w-full rounded-xl border border-white/[0.06] bg-white/[0.03] pl-10 pr-3 text-sm text-[#D1D5DB] font-mono placeholder:text-[#6B7280]/40 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/20 transition-all" />
                {apiKey && <div className="absolute right-3 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-emerald-400" />}
              </div>

              <div className="flex items-start gap-2 mt-3 text-[11px] text-[#6B7280]">
                <Shield className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span>Key stays in your browser only. Never sent to our servers. Skip for database-only mode.</span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3">
              <button onClick={() => { setStep(1); setLoggedInUser(null); setError(""); }} className="flex-1 h-12 rounded-xl bg-white/[0.04] text-[#D1D5DB] font-medium hover:bg-white/[0.06] transition-all">Back</button>
              <button onClick={handleFinalLogin}
                className="flex-1 flex items-center justify-center gap-2 h-12 rounded-xl bg-gradient-to-r from-[#1B6B3A] to-[#16A34A] text-white font-semibold hover:shadow-lg hover:shadow-[#1B6B3A]/20 transition-all">
                Launch MedTrace
              </button>
            </div>
            {!apiKey && (
              <button onClick={handleFinalLogin} className="w-full text-center text-xs text-[#6B7280] hover:text-[#D1D5DB] transition-colors py-1">
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
