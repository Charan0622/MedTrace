"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, CheckCircle2, AlertTriangle, X, ChevronUp, Loader2 } from "lucide-react";
import { useAiTasks } from "@/lib/ai-task-context";
import Link from "next/link";

export function AiTaskNotifier() {
  const { tasks, pendingCount, markSeen, clearTask } = useAiTasks();
  const [expanded, setExpanded] = useState(false);

  const activeTasks = tasks.filter((t) => !t.seen || t.status === "pending");
  const unseenDone = tasks.filter((t) => t.status === "done" && !t.seen).length;

  if (activeTasks.length === 0) return null;

  return (
    <div className="fixed bottom-20 left-6 z-50">
      {/* Collapsed badge */}
      {!expanded && (
        <motion.button
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          onClick={() => setExpanded(true)}
          className="flex items-center gap-2 rounded-full bg-[#141918] border border-white/[0.08] px-4 py-2.5 shadow-xl hover:bg-[#1C2321] transition-colors"
        >
          {pendingCount > 0 ? (
            <Loader2 className="h-4 w-4 text-emerald-400 animate-spin" />
          ) : (
            <Brain className="h-4 w-4 text-emerald-400" />
          )}
          <span className="text-xs font-medium text-[#D1D5DB]">
            {pendingCount > 0 ? `${pendingCount} generating...` : `${unseenDone} ready`}
          </span>
          {unseenDone > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-white px-1">
              {unseenDone}
            </span>
          )}
        </motion.button>
      )}

      {/* Expanded panel */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="w-80 rounded-xl bg-[#141918] border border-white/[0.08] shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
              <div className="flex items-center gap-2">
                <Brain className="h-4 w-4 text-emerald-400" />
                <span className="text-sm font-semibold text-[#D1D5DB]">AI Tasks</span>
                {pendingCount > 0 && (
                  <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">{pendingCount} running</span>
                )}
              </div>
              <button onClick={() => setExpanded(false)} className="p-1 rounded hover:bg-white/[0.04] text-[#6B7280] hover:text-[#D1D5DB] transition-colors">
                <ChevronUp className="h-4 w-4" />
              </button>
            </div>

            {/* Task list */}
            <div className="max-h-64 overflow-y-auto">
              {activeTasks.map((task) => {
                const elapsed = Math.round((Date.now() - task.startedAt.getTime()) / 1000);
                const linkHref = task.type === "care-plan" && task.patientId ? `/patients/${task.patientId}` :
                                 task.type === "shift-handoff" ? "/handoff" :
                                 task.type === "prescription-suggestions" ? "/prescribe" : null;

                return (
                  <div key={task.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                    {/* Status icon */}
                    {task.status === "pending" && <Loader2 className="h-4 w-4 text-emerald-400 animate-spin shrink-0" />}
                    {task.status === "done" && <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />}
                    {task.status === "error" && <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />}

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-[#D1D5DB] truncate">{task.label}</p>
                      <p className="text-[10px] text-[#6B7280]">
                        {task.status === "pending" && `${elapsed}s elapsed...`}
                        {task.status === "done" && "Ready — click to view"}
                        {task.status === "error" && (task.error?.slice(0, 40) ?? "Failed")}
                      </p>
                    </div>

                    {/* Actions */}
                    {task.status === "done" && linkHref && (
                      <Link href={linkHref} onClick={() => markSeen(task.id)} className="text-[10px] text-emerald-400 hover:text-emerald-300 font-medium shrink-0">
                        View
                      </Link>
                    )}
                    {task.status !== "pending" && (
                      <button onClick={() => clearTask(task.id)} className="p-1 rounded hover:bg-white/[0.04] text-[#6B7280] hover:text-[#D1D5DB] transition-colors shrink-0">
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
