import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        "rounded-2xl bg-white/[0.03] animate-shimmer",
        className
      )}
    />
  );
}
