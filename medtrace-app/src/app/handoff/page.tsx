"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { FileText, Loader2, Download, Brain } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/layout/PageHeader";
import { MarkdownRenderer } from "@/components/ui/MarkdownRenderer";
import { AiLoadingTip } from "@/components/ui/AiLoadingTip";
import { useAuth } from "@/lib/auth-context";
import { generateHandoffPdf } from "@/lib/generate-handoff-pdf";

interface PatientDetail {
  name: string; age: unknown; sex: unknown; bloodGroup: string;
  room: string; roomType: string; diagnosis: string; reason: string;
  admissionDate: string; doctor: string; specialization: string;
  allergies: string[]; vitals: string; vitalsTrend: string;
  meds: string[]; pendingTasks: string[]; recentNotes: string[];
  abnormalLabs: string[]; heldMeds: string[];
}

export default function HandoffPage() {
  const [report, setReport] = useState<string | null>(null);
  const [aiModel, setAiModel] = useState<string>("");
  const [patients, setPatients] = useState<PatientDetail[]>([]);
  const [generating, setGenerating] = useState(false);
  const { aiHeaders, user } = useAuth();

  async function generateReport() {
    setGenerating(true);
    try {
      const r = await fetch("/api/ai/shift-handoff", { method: "POST", headers: aiHeaders() });
      const res = await r.json();
      if (res.success && res.data) {
        setReport(res.data.report);
        setAiModel(res.data.ai_model ?? "rule-based");
        setPatients(res.data.patients ?? []);
      }
    } catch { /* ignore */ }
    setGenerating(false);
  }

  function downloadPdf() {
    if (!report) return;
    generateHandoffPdf({
      report,
      patients,
      aiModel,
      generatedBy: user?.name ?? "Staff",
      generatedAt: new Date().toLocaleString(),
    });
  }

  const isAi = aiModel && !aiModel.includes("rule-based");

  return (
    <div className="space-y-6">
      <PageHeader title="Shift Handoff" description="Generate a comprehensive handoff report for the incoming shift">
        <Button onClick={generateReport} disabled={generating}>
          {generating ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating...</> : <><Brain className="h-4 w-4" /> Generate Report</>}
        </Button>
        {report && (
          <Button variant="secondary" onClick={downloadPdf}>
            <Download className="h-4 w-4" /> Download PDF
          </Button>
        )}
      </PageHeader>

      {generating && (
        <Card>
          <AiLoadingTip patientName="all patients" action="shift handoff report" />
        </Card>
      )}

      {!report && !generating && (
        <Card>
          <div className="flex flex-col items-center py-12">
            <FileText className="h-12 w-12 text-[#6B7280] mb-4" />
            <p className="text-[#D1D5DB] mb-2">No report generated yet</p>
            <p className="text-sm text-[#6B7280]">Click &quot;Generate Report&quot; to create a shift handoff summary for all current patients.</p>
          </div>
        </Card>
      )}

      {report && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <FileText className="h-5 w-5 text-emerald-400" />
              <CardTitle>Shift Handoff Report</CardTitle>
              <Badge className={isAi ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : ""}>{isAi ? aiModel : "Rule-Based"}</Badge>
            </div>
            <MarkdownRenderer content={report} />
          </Card>
        </motion.div>
      )}
    </div>
  );
}
