"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Stethoscope, Activity, ArrowLeft, UserPlus, Mail, Lock, User, Building2 } from "lucide-react";
import { Logo } from "@/components/ui/Logo";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<"doctor" | "nurse">("doctor");
  const [department, setDepartment] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!name || !email || !password || !department) {
      setError("All fields are required");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, role, department }),
      });
      const data = await res.json();

      if (!data.success) {
        setError(data.error?.message ?? "Registration failed");
        setSubmitting(false);
        return;
      }

      router.push("/login");
    } catch {
      setError("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  const departments = role === "doctor"
    ? ["Cardiology", "Psychiatry", "Endocrinology", "Internal Medicine", "Neurology", "Orthopedics", "Pulmonology", "Oncology"]
    : ["General Ward", "ICU", "Emergency", "Pediatrics", "Surgery"];

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0C0F0E] p-4 relative overflow-hidden">
      <div className="absolute inset-0 gradient-mesh" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-[#1B6B3A]/5 blur-[120px]" />

      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} transition={{ type: "spring", damping: 15 }} className="inline-flex items-center justify-center">
            <Logo size={56} className="shadow-2xl glow-brand" />
          </motion.div>
          <h1 className="text-2xl font-bold text-[#F0FDF4] mt-4 tracking-tight">Create Account</h1>
          <p className="text-sm text-[#6B7280] mt-1">Join MedTrace as a staff member</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <div className="glass rounded-2xl p-6 space-y-4">
            {/* Role Selection */}
            <div>
              <p className="text-xs font-medium text-[#6B7280] mb-2">I am a</p>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => { setRole("doctor"); setDepartment(""); }}
                  className={`flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-medium transition-all ${role === "doctor" ? "bg-sky-500/15 text-sky-400 border border-sky-500/30" : "bg-white/[0.02] text-[#6B7280] border border-transparent hover:bg-white/[0.04]"}`}>
                  <Stethoscope className="h-4 w-4" /> Doctor
                </button>
                <button type="button" onClick={() => { setRole("nurse"); setDepartment(""); }}
                  className={`flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-medium transition-all ${role === "nurse" ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30" : "bg-white/[0.02] text-[#6B7280] border border-transparent hover:bg-white/[0.04]"}`}>
                  <Activity className="h-4 w-4" /> Nurse
                </button>
              </div>
            </div>

            {/* Name */}
            <div>
              <label className="text-xs font-medium text-[#6B7280] mb-1.5 block">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B7280]" />
                <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                  placeholder={role === "doctor" ? "Dr. John Smith" : "Jane Doe"}
                  className="h-11 w-full rounded-xl border border-white/[0.06] bg-white/[0.03] pl-10 pr-3 text-sm text-[#D1D5DB] placeholder:text-[#6B7280]/40 focus:border-[#22C55E]/50 focus:outline-none focus:ring-1 focus:ring-[#22C55E]/20 transition-all" />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="text-xs font-medium text-[#6B7280] mb-1.5 block">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B7280]" />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@hospital.org"
                  className="h-11 w-full rounded-xl border border-white/[0.06] bg-white/[0.03] pl-10 pr-3 text-sm text-[#D1D5DB] placeholder:text-[#6B7280]/40 focus:border-[#22C55E]/50 focus:outline-none focus:ring-1 focus:ring-[#22C55E]/20 transition-all" />
              </div>
            </div>

            {/* Department */}
            <div>
              <label className="text-xs font-medium text-[#6B7280] mb-1.5 block">Department</label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B7280]" />
                <select value={department} onChange={(e) => setDepartment(e.target.value)}
                  className="h-11 w-full rounded-xl border border-white/[0.06] bg-white/[0.03] pl-10 pr-3 text-sm text-[#D1D5DB] focus:border-[#22C55E]/50 focus:outline-none focus:ring-1 focus:ring-[#22C55E]/20 transition-all appearance-none">
                  <option value="" className="bg-[#18181B]">Select department</option>
                  {departments.map((d) => (
                    <option key={d} value={d} className="bg-[#18181B]">{d}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="text-xs font-medium text-[#6B7280] mb-1.5 block">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B7280]" />
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  className="h-11 w-full rounded-xl border border-white/[0.06] bg-white/[0.03] pl-10 pr-3 text-sm text-[#D1D5DB] placeholder:text-[#6B7280]/40 focus:border-[#22C55E]/50 focus:outline-none focus:ring-1 focus:ring-[#22C55E]/20 transition-all" />
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="text-xs font-medium text-[#6B7280] mb-1.5 block">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B7280]" />
                <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  className="h-11 w-full rounded-xl border border-white/[0.06] bg-white/[0.03] pl-10 pr-3 text-sm text-[#D1D5DB] placeholder:text-[#6B7280]/40 focus:border-[#22C55E]/50 focus:outline-none focus:ring-1 focus:ring-[#22C55E]/20 transition-all" />
              </div>
            </div>

            {/* Error */}
            {error && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-red-400 bg-red-500/10 rounded-lg px-3 py-2">
                {error}
              </motion.p>
            )}
          </div>

          {/* Submit */}
          <button type="submit" disabled={submitting}
            className="w-full flex items-center justify-center gap-2 h-12 rounded-xl bg-gradient-to-r from-[#1B6B3A] to-[#16A34A] text-white font-semibold hover:shadow-lg hover:shadow-[#1B6B3A]/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
            <UserPlus className="h-4 w-4" />
            {submitting ? "Creating Account..." : "Create Account"}
          </button>
        </form>

        <div className="text-center mt-6">
          <button onClick={() => router.push("/login")} className="inline-flex items-center gap-1.5 text-sm text-[#6B7280] hover:text-[#D1D5DB] transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to login
          </button>
        </div>

        <p className="text-center text-[10px] text-[#6B7280]/50 mt-4 tracking-wider uppercase">MedTrace v2.0 — AI-Powered Clinical Platform</p>
      </motion.div>
    </div>
  );
}
