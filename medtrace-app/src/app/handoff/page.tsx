"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { FileText, Loader2, Printer, Brain } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/layout/PageHeader";
import { MarkdownRenderer } from "@/components/ui/MarkdownRenderer";
import { AiLoadingTip } from "@/components/ui/AiLoadingTip";
import { useAuth } from "@/lib/auth-context";

export default function HandoffPage() {
  const [report, setReport] = useState<string | null>(null);
  const [aiModel, setAiModel] = useState<string>("");
  const [generating, setGenerating] = useState(false);
  const { aiHeaders } = useAuth();

  async function generateReport() {
    setGenerating(true);
    const r = await fetch("/api/ai/shift-handoff", { method: "POST", headers: aiHeaders() });
    const res = await r.json();
    if (res.success && res.data) {
      setReport(res.data.report);
      setAiModel(res.data.ai_model);
    }
    setGenerating(false);
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Shift Handoff" description="Generate a comprehensive handoff report for the incoming shift">
        <Button onClick={generateReport} disabled={generating}>
          {generating ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating...</> : <><Brain className="h-4 w-4" /> Generate Report</>}
        </Button>
        {report && (
          <Button variant="secondary" onClick={() => window.print()}>
            <Printer className="h-4 w-4" /> Print
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
          <Card className="print:border-none print:shadow-none">
            <div className="flex items-center gap-2 mb-4 print:mb-2">
              <FileText className="h-5 w-5 text-emerald-400 print:hidden" />
              <CardTitle>Shift Handoff Report</CardTitle>
              <Badge>{aiModel === "nvidia-nemotron" ? "Nemotron AI" : "Rule-Based"}</Badge>
            </div>
            <MarkdownRenderer content={report} />
          </Card>
        </motion.div>
      )}
    </div>
  );
}
