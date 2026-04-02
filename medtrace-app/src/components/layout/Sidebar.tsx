"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  LayoutDashboard, Users, Pill, AlertTriangle, ClipboardList,
  Activity, LogOut, FileText, UserPlus, Stethoscope, ChevronRight, BarChart3,
} from "lucide-react";
import { Brain, CheckCircle2, AlertTriangle as TriAlert, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/ui/Logo";
import { useAuth } from "@/lib/auth-context";
import { useAiTasks } from "@/lib/ai-task-context";

const NAV_ITEMS = [
  { label: "Command Center", href: "/", icon: LayoutDashboard },
  { label: "Patients", href: "/patients", icon: Users },
  { label: "Admit Patient", href: "/admit", icon: UserPlus },
  { label: "Prescribe", href: "/prescribe", icon: Pill },
  { label: "Instructions", href: "/instructions", icon: ClipboardList },
  { label: "Vitals Entry", href: "/vitals", icon: Activity },
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
  { label: "Staff On Duty", href: "/staff", icon: Users },
  { label: "Shift Handoff", href: "/handoff", icon: FileText },
  { label: "Recalls", href: "/recalls", icon: AlertTriangle },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, hasAi } = useAuth();
  const { tasks, pendingCount, markSeen, clearTask } = useAiTasks();
  const activeTasks = tasks.filter((t) => !t.seen || t.status === "pending");

  function handleLogout() {
    logout();
    router.push("/login");
  }

  if (!user) return null;

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-full w-[260px] flex-col bg-[#0C0F0E] border-r border-white/[0.04]">
      {/* Logo */}
      <Link href="/" className="flex h-[72px] items-center gap-3 px-6 hover:opacity-90 transition-opacity">
        <Logo size={38} className="shadow-lg glow-brand shrink-0" />
        <div>
          <span className="text-base font-bold text-[#F0FDF4] tracking-tight">MedTrace</span>
          <p className="text-[10px] text-[#6B7280] font-medium tracking-wider uppercase">AI-Powered Care Intelligence</p>
        </div>
      </Link>

      {/* User */}
      <div className="mx-4 mb-4 rounded-xl bg-white/[0.03] p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className={cn(
              "flex h-9 w-9 items-center justify-center rounded-xl text-xs font-bold",
              user.role === "doctor"
                ? "bg-gradient-to-br from-sky-500/20 to-sky-600/10 text-sky-400"
                : "bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 text-emerald-400"
            )}>
              {user.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
            </div>
            <div>
              <p className="text-sm font-medium text-[#D1D5DB]">{user.name}</p>
              <div className="flex items-center gap-1.5 text-[10px] text-[#6B7280]">
                {user.role === "doctor" ? <Stethoscope className="h-2.5 w-2.5" /> : <Activity className="h-2.5 w-2.5" />}
                <span className="capitalize">{user.role}</span>
              </div>
            </div>
          </div>
          <button onClick={handleLogout} className="btn-press text-[#6B7280] hover:text-[#D1D5DB] p-1.5 rounded-lg hover:bg-white/[0.04] transition-all" title="Logout">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map((item, index) => {
          const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <motion.div
              key={item.href}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.03 }}
            >
              <Link
                href={item.href}
                className={cn(
                  "nav-item-hover group flex items-center justify-between rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all duration-200",
                  isActive
                    ? "bg-[#1B6B3A]/15 text-[#4ADE80]"
                    : "text-[#6B7280] hover:bg-white/[0.03] hover:text-[#D1D5DB]"
                )}
              >
                <div className="flex items-center gap-3">
                  <item.icon className={cn("h-[18px] w-[18px]", isActive && "text-[#22C55E]")} />
                  {item.label}
                </div>
                {isActive && (
                  <motion.div
                    initial={{ opacity: 0, x: -5 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronRight className="h-3.5 w-3.5 text-[#22C55E]/50" />
                  </motion.div>
                )}
              </Link>
            </motion.div>
          );
        })}
      </nav>

      {/* AI Tasks */}
      {activeTasks.length > 0 && (
        <div className="mx-4 mb-2">
          <p className="text-[9px] text-[#6B7280] uppercase tracking-wider font-semibold mb-1.5 px-1">
            <Brain className="h-3 w-3 inline mr-1 text-emerald-400" />
            AI Tasks ({pendingCount > 0 ? `${pendingCount} running` : "done"})
          </p>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {activeTasks.map((task) => {
              const linkHref = task.type === "care-plan" && task.patientId ? `/patients/${task.patientId}` :
                               task.type === "shift-handoff" ? "/handoff" :
                               task.type === "prescription-suggestions" ? "/prescribe" : null;
              return (
                <div key={task.id} className="flex items-center gap-2 rounded-lg bg-white/[0.02] px-2 py-1.5">
                  {task.status === "pending" && <Loader2 className="h-3 w-3 text-emerald-400 animate-spin shrink-0" />}
                  {task.status === "done" && <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0" />}
                  {task.status === "error" && <TriAlert className="h-3 w-3 text-red-400 shrink-0" />}
                  <span className="text-[10px] text-[#D1D5DB] truncate flex-1">{task.label}</span>
                  {task.status === "done" && linkHref && (
                    <Link href={linkHref} onClick={() => markSeen(task.id)} className="text-[9px] text-emerald-400 font-semibold shrink-0">View</Link>
                  )}
                  {task.status !== "pending" && (
                    <button onClick={() => clearTask(task.id)} className="text-[#6B7280] hover:text-[#D1D5DB] shrink-0"><X className="h-2.5 w-2.5" /></button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="mx-4 mb-4 rounded-xl bg-white/[0.02] px-3 py-2.5">
        <div className="flex items-center gap-2 text-[11px] text-[#6B7280]">
          <div className={cn("vital-dot", hasAi ? "vital-normal" : "vital-warning")} />
          <span>{hasAi ? "NVIDIA NIM Active" : "Database Mode"}</span>
        </div>
      </div>
    </aside>
  );
}
