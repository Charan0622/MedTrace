"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Clock, Stethoscope, Filter } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/layout/PageHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import { useAuth } from "@/lib/auth-context";
import { apiClient } from "@/lib/api";

type Row = Record<string, unknown>;
type FilterStatus = "all" | "pending" | "in_progress" | "completed";

export default function InstructionsPage() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [instructions, setInstructions] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient<Row[]>("/api/instructions").then((res) => {
      if (res.data) setInstructions(res.data);
      setLoading(false);
    });
  }, []);

  const filtered = instructions.filter((ins) => {
    if (filter === "all") return ins.status !== "cancelled";
    return ins.status === filter;
  });

  async function markComplete(insId: string) {
    const res = await apiClient<Row>("/api/instructions", {
      method: "PATCH",
      body: JSON.stringify({ id: insId, status: "completed", completed_by: user?.name }),
    });
    if (res.success) {
      setInstructions((prev) => prev.map((i) => i.id === insId ? { ...i, status: "completed", completed_by: user?.name } : i));
    }
  }

  const pending = instructions.filter((i) => i.status === "pending" || i.status === "in_progress").length;

  return (
    <div className="space-y-6">
      <PageHeader title="Doctor Instructions" description={`${pending} pending instruction${pending !== 1 ? "s" : ""}`} />

      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-[#6B7280]" />
        {(["all", "pending", "in_progress", "completed"] as FilterStatus[]).map((status) => (
          <Button key={status} variant={filter === status ? "primary" : "ghost"} size="sm" onClick={() => setFilter(status)}>{status.replace("_", " ")}</Button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full" />)}</div>
      ) : (
        <div className="space-y-3">
          {filtered.map((ins, i) => {
            const isCompleted = ins.status === "completed";
            return (
              <motion.div key={ins.id as string} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                <Card className={`${isCompleted ? "opacity-60" : ""} ${ins.priority === "stat" ? "border-l-4 border-l-red-500" : ins.priority === "urgent" ? "border-l-4 border-l-orange-500" : ""}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <Badge className="bg-white/[0.04] text-[#D1D5DB]">{(ins.room_number as string) ?? "—"}</Badge>
                        <span className="text-sm font-medium text-[#D1D5DB]">{ins.patient_name as string}</span>
                        <Badge className={ins.priority === "stat" ? "bg-red-500/10 text-red-400 border-red-500/30" : ins.priority === "urgent" ? "bg-orange-500/10 text-orange-400 border-orange-500/30" : ""}>{ins.priority as string}</Badge>
                        <Badge>{ins.category as string}</Badge>
                      </div>
                      <p className={`text-sm ${isCompleted ? "text-[#6B7280] line-through" : "text-[#F0FDF4]"}`}>{ins.instruction as string}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-[#6B7280]">
                        <div className="flex items-center gap-1"><Stethoscope className="h-3 w-3" />{ins.doctor_name as string}</div>
                        <div className="flex items-center gap-1"><Clock className="h-3 w-3" />{new Date(ins.created_at as string).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</div>
                        {ins.completed_by ? <span className="text-green-400">Completed by {String(ins.completed_by)}</span> : null}
                      </div>
                    </div>
                    {!isCompleted && user?.role === "nurse" && (
                      <Button variant="secondary" size="sm" onClick={() => markComplete(ins.id as string)}><CheckCircle2 className="h-4 w-4" /> Done</Button>
                    )}
                    {isCompleted && <CheckCircle2 className="h-5 w-5 text-green-400 mt-1" />}
                  </div>
                </Card>
              </motion.div>
            );
          })}
          {filtered.length === 0 && <Card><p className="text-center text-[#6B7280] py-8">No instructions matching filter</p></Card>}
        </div>
      )}
    </div>
  );
}
