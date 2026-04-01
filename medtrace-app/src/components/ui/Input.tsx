import { forwardRef } from "react";
import { cn } from "@/lib/utils";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, icon, ...props }, ref) => {
    return (
      <div className="relative">
        {icon && (
          <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280]">
            {icon}
          </div>
        )}
        <input
          ref={ref}
          className={cn(
            "h-10 w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 text-sm text-[#D1D5DB] placeholder:text-[#6B7280]/50 focus:border-[#22C55E]/40 focus:outline-none focus:ring-1 focus:ring-[#22C55E]/20 transition-all",
            icon && "pl-10",
            className
          )}
          {...props}
        />
      </div>
    );
  }
);
Input.displayName = "Input";
