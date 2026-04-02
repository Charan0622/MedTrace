"use client";

import { createContext, useContext, useState, useCallback } from "react";

export type AiTaskStatus = "pending" | "done" | "error";
export type AiTaskType = "care-plan" | "shift-handoff" | "vitals-analysis" | "prescription-suggestions" | "copilot";

export interface AiTask {
  id: string;
  type: AiTaskType;
  label: string;
  status: AiTaskStatus;
  startedAt: Date;
  completedAt?: Date;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  result?: any;
  error?: string;
  patientId?: string;
  patientName?: string;
  seen: boolean; // user has viewed the result
}

interface AiTaskContextType {
  tasks: AiTask[];
  pendingCount: number;
  addTask: (type: AiTaskType, label: string, patientId?: string, patientName?: string) => string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  completeTask: (id: string, result: any) => void;
  failTask: (id: string, error: string) => void;
  getTask: (id: string) => AiTask | undefined;
  getLatestByType: (type: AiTaskType, patientId?: string) => AiTask | undefined;
  markSeen: (id: string) => void;
  clearTask: (id: string) => void;
  clearAll: () => void;
}

const AiTaskContext = createContext<AiTaskContextType>({
  tasks: [],
  pendingCount: 0,
  addTask: () => "",
  completeTask: () => {},
  failTask: () => {},
  getTask: () => undefined,
  getLatestByType: () => undefined,
  markSeen: () => {},
  clearTask: () => {},
  clearAll: () => {},
});

export function AiTaskProvider({ children }: { children: React.ReactNode }) {
  const [tasks, setTasks] = useState<AiTask[]>([]);

  const addTask = useCallback((type: AiTaskType, label: string, patientId?: string, patientName?: string): string => {
    const id = `ai-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const task: AiTask = { id, type, label, status: "pending", startedAt: new Date(), patientId, patientName, seen: false };
    setTasks((prev) => [task, ...prev]);
    return id;
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const completeTask = useCallback((id: string, result: any) => {
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, status: "done" as const, result, completedAt: new Date() } : t));
  }, []);

  const failTask = useCallback((id: string, error: string) => {
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, status: "error" as const, error, completedAt: new Date() } : t));
  }, []);

  const getTask = useCallback((id: string) => tasks.find((t) => t.id === id), [tasks]);

  const getLatestByType = useCallback((type: AiTaskType, patientId?: string) => {
    return tasks.find((t) => t.type === type && (!patientId || t.patientId === patientId));
  }, [tasks]);

  const markSeen = useCallback((id: string) => {
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, seen: true } : t));
  }, []);

  const clearTask = useCallback((id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const clearAll = useCallback(() => setTasks([]), []);

  const pendingCount = tasks.filter((t) => t.status === "pending").length;

  return (
    <AiTaskContext.Provider value={{ tasks, pendingCount, addTask, completeTask, failTask, getTask, getLatestByType, markSeen, clearTask, clearAll }}>
      {children}
    </AiTaskContext.Provider>
  );
}

export function useAiTasks() {
  return useContext(AiTaskContext);
}
