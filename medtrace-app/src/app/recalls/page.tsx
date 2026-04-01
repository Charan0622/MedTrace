"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, Calendar, Building2, FileWarning, Users } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/layout/PageHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import { apiClient } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import type { DrugRecall, Drug, Manufacturer, Patient } from "@/lib/types";

interface RecallWithDetails extends DrugRecall {
  drug?: Drug;
  manufacturer?: Manufacturer;
}

interface ImpactResult {
  recall: DrugRecall | null;
  affected_patients: Patient[];
}

export default function RecallsPage() {
  const [recalls, setRecalls] = useState<RecallWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [impactData, setImpactData] = useState<Record<string, ImpactResult>>({});
  const [loadingImpact, setLoadingImpact] = useState<string | null>(null);

  useEffect(() => {
    apiClient<RecallWithDetails[]>("/api/recalls").then((res) => {
      if (res.success && res.data) setRecalls(res.data);
      setLoading(false);
    });
  }, []);

  async function checkImpact(drugName: string) {
    setLoadingImpact(drugName);
    const res = await apiClient<ImpactResult>(`/api/recalls/${encodeURIComponent(drugName)}/impact`, {
      method: "POST",
    });
    if (res.success && res.data) {
      setImpactData((prev) => ({ ...prev, [drugName]: res.data! }));
    }
    setLoadingImpact(null);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Drug Recalls"
        description="Track active drug recalls and assess patient impact"
      />

      {loading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      ) : recalls.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center py-12">
            <FileWarning className="h-12 w-12 text-[#6B7280] mb-4" />
            <p className="text-[#6B7280]">No active drug recalls</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          {recalls.map((recall, i) => {
            const drugName = recall.drug?.name ?? "Unknown";
            const impact = impactData[drugName];

            return (
              <motion.div
                key={recall.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <Card className="border-l-4 border-l-red-500">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-6 w-6 text-red-400 mt-0.5" />
                      <div>
                        <h3 className="text-lg font-semibold text-[#F0FDF4] font-mono">{drugName}</h3>
                        <p className="text-sm text-[#6B7280]">{recall.drug?.drug_class} &middot; {recall.drug?.generic_name}</p>
                      </div>
                    </div>
                    <Badge variant="risk" riskLevel="critical">RECALL</Badge>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3 mb-4">
                    <div className="flex items-center gap-2 text-sm text-[#D1D5DB]">
                      <Calendar className="h-4 w-4 text-[#6B7280]" />
                      {formatDate(recall.recall_date)}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-[#D1D5DB]">
                      <Building2 className="h-4 w-4 text-[#6B7280]" />
                      {recall.manufacturer?.name}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-[#D1D5DB]">
                      <FileWarning className="h-4 w-4 text-[#6B7280]" />
                      {recall.fda_id}
                    </div>
                  </div>

                  <div className="rounded-lg bg-white/[0.04] p-4 mb-4">
                    <p className="text-sm font-medium text-[#D1D5DB] mb-1">Recall Reason</p>
                    <p className="text-sm text-[#6B7280]">{recall.reason}</p>
                  </div>

                  {!impact ? (
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => checkImpact(drugName)}
                      disabled={loadingImpact === drugName}
                    >
                      {loadingImpact === drugName ? (
                        "Analyzing..."
                      ) : (
                        <><Users className="h-4 w-4" /> Check Patient Impact</>
                      )}
                    </Button>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="border-t border-white/[0.06] pt-4"
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <Users className="h-5 w-5 text-[#6B7280]" />
                        <CardTitle>
                          Impact Assessment — {impact.affected_patients.length} Patient{impact.affected_patients.length !== 1 ? "s" : ""} Affected
                        </CardTitle>
                      </div>

                      {impact.affected_patients.length > 0 ? (
                        <div className="space-y-2">
                          {impact.affected_patients.map((patient) => (
                            <div
                              key={patient.id}
                              className="flex items-center justify-between rounded-lg bg-red-500/5 border border-red-500/20 p-3"
                            >
                              <div>
                                <p className="text-sm font-medium text-[#F0FDF4]">{patient.name}</p>
                                <p className="text-xs text-[#6B7280]">{patient.age}y {patient.sex}</p>
                              </div>
                              <Badge variant="risk" riskLevel="high">Requires review</Badge>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="rounded-lg bg-green-500/5 border border-green-500/20 p-4">
                          <p className="text-sm text-green-400">
                            No patients in the system are currently prescribed {drugName}.
                          </p>
                        </div>
                      )}
                    </motion.div>
                  )}
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
