"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Users, Pill, AlertTriangle, ClipboardList,
  Activity, LogOut, FileText, UserPlus, Stethoscope, ChevronRight, BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/ui/Logo";
import { useAuth } from "@/lib/auth-context";

const NAV_ITEMS = [
  { label: "Nursing Station", href: "/", icon: LayoutDashboard },
  { label: "Patients", href: "/patients", icon: Users },
  { label: "Admit Patient", href: "/admit", icon: UserPlus },
  { label: "Prescribe", href: "/prescribe", icon: Pill },
  { label: "Instructions", href: "/instructions", icon: ClipboardList },
  { label: "Vitals Entry", href: "/vitals", icon: Activity },
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
  { label: "Shift Handoff", href: "/handoff", icon: FileText },
  { label: "Recalls", href: "/recalls", icon: AlertTriangle },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, hasAi, aiProvider } = useAuth();

  function handleLogout() {
    logout();
    router.push("/login");
  }

  if (!user) return null;

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-full w-[260px] flex-col bg-[#0C0F0E] border-r border-white/[0.04]">
      {/* Logo */}
      <div className="flex h-[72px] items-center gap-3 px-6">
        <Logo size={38} className="shadow-lg glow-brand shrink-0" />
        <div>
          <span className="text-base font-bold text-[#F0FDF4] tracking-tight">MedTrace</span>
          <p className="text-[10px] text-[#6B7280] font-medium tracking-wider uppercase">Nursing Station</p>
        </div>
      </div>

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
          <button onClick={handleLogout} className="text-[#6B7280] hover:text-[#D1D5DB] p-1.5 rounded-lg hover:bg-white/[0.04] transition-all" title="Logout">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center justify-between rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all duration-200",
                isActive
                  ? "bg-[#1B6B3A]/15 text-[#4ADE80]"
                  : "text-[#6B7280] hover:bg-white/[0.03] hover:text-[#D1D5DB]"
              )}
            >
              <div className="flex items-center gap-3">
                <item.icon className={cn("h-[18px] w-[18px]", isActive && "text-[#22C55E]")} />
                {item.label}
              </div>
              {isActive && <ChevronRight className="h-3.5 w-3.5 text-[#22C55E]/50" />}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="mx-4 mb-4 rounded-xl bg-white/[0.02] px-3 py-2.5">
        <div className="flex items-center gap-2 text-[11px] text-[#6B7280]">
          <div className={cn("vital-dot", hasAi ? "vital-normal" : "vital-warning")} />
          <span>{hasAi ? `${aiProvider === "nvidia" ? "NVIDIA Nemotron" : "Gemini"} Active` : "Database Mode"}</span>
        </div>
      </div>
    </aside>
  );
}
