import { cn } from "@/lib/utils";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: "default" | "glass" | "elevated";
}

export function Card({ className, children, variant = "default", ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl p-6 transition-all duration-200",
        variant === "glass" && "glass",
        variant === "elevated" && "bg-[#1C2321] border border-white/[0.06] shadow-lg",
        variant === "default" && "bg-[#141918] border border-white/[0.06]",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, children, ...props }: CardProps) {
  return (
    <div className={cn("mb-4", className)} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn("text-base font-semibold text-[#F0FDF4]", className)} {...props}>
      {children}
    </h3>
  );
}
