import { forwardRef } from "react";
import { cn } from "@/lib/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22C55E]/50 disabled:pointer-events-none disabled:opacity-40",
          {
            "bg-gradient-to-r from-[#1B6B3A] to-[#16A34A] text-white hover:shadow-lg hover:shadow-[#1B6B3A]/20": variant === "primary",
            "bg-white/[0.05] text-[#D1D5DB] border border-white/[0.08] hover:bg-white/[0.08] hover:border-white/[0.12]": variant === "secondary",
            "bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/15": variant === "danger",
            "text-[#6B7280] hover:text-[#D1D5DB] hover:bg-white/[0.04]": variant === "ghost",
          },
          {
            "h-8 px-3 text-xs": size === "sm",
            "h-10 px-4 text-sm": size === "md",
            "h-12 px-6 text-sm": size === "lg",
          },
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
