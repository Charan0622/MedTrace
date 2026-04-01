import { cn } from "@/lib/utils";
import type { RiskLevel } from "@/lib/types";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "risk";
  riskLevel?: RiskLevel;
  className?: string;
}

const riskStyles: Record<RiskLevel, string> = {
  critical: "bg-red-500/10 text-red-400 border-red-500/20",
  high: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  moderate: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  low: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  safe: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
};

export function Badge({ children, variant = "default", riskLevel, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-lg px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider border",
        variant === "risk" && riskLevel ? riskStyles[riskLevel] : "bg-white/[0.04] text-[#6B7280] border-white/[0.06]",
        className
      )}
    >
      {children}
    </span>
  );
}
