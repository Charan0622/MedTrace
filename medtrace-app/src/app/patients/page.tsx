"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Search, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/layout/PageHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import { apiClient } from "@/lib/api";
import { getRiskColor } from "@/lib/utils";
import type { RiskLevel } from "@/lib/types";

interface PatientSummary {
  id: string;
  name: string;
  age: number;
  sex: string;
  medication_count: number;
  condition_count: number;
  risk_count: number;
}

export default function PatientsPage() {
  const [patients, setPatients] = useState<PatientSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    apiClient<PatientSummary[]>("/api/patients").then((res) => {
      if (res.success && res.data) setPatients(res.data);
      setLoading(false);
    });
  }, []);

  const filtered = patients.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Patients"
        description="Manage and monitor patient medication profiles"
      />

      <Input
        placeholder="Search patients..."
        icon={<Search className="h-4 w-4" />}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-md"
      />

      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {filtered.map((patient, i) => {
            const riskLevel: RiskLevel =
              patient.risk_count >= 3 ? "critical" :
              patient.risk_count >= 2 ? "high" :
              patient.risk_count >= 1 ? "moderate" : "safe";

            return (
              <motion.div
                key={patient.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Link href={`/patients/${patient.id}`}>
                  <Card className="hover:border-white/[0.08] transition-colors cursor-pointer h-full">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold"
                          style={{
                            backgroundColor: `${getRiskColor(riskLevel)}15`,
                            color: getRiskColor(riskLevel),
                          }}
                        >
                          {patient.name.split(" ").map((n) => n[0]).join("")}
                        </div>
                        <div>
                          <p className="text-lg font-semibold text-[#F0FDF4]">{patient.name}</p>
                          <p className="text-sm text-[#6B7280]">{patient.age}y &middot; {patient.sex}</p>
                        </div>
                      </div>
                      <ArrowRight className="h-5 w-5 text-[#6B7280]" />
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div className="rounded-lg bg-white/[0.04] p-3 text-center">
                        <p className="text-lg font-bold text-[#F0FDF4]">{patient.medication_count}</p>
                        <p className="text-xs text-[#6B7280]">Medications</p>
                      </div>
                      <div className="rounded-lg bg-white/[0.04] p-3 text-center">
                        <p className="text-lg font-bold text-[#F0FDF4]">{patient.condition_count}</p>
                        <p className="text-xs text-[#6B7280]">Conditions</p>
                      </div>
                      <div className="rounded-lg bg-white/[0.04] p-3 text-center">
                        <p className="text-lg font-bold" style={{ color: getRiskColor(riskLevel) }}>
                          {patient.risk_count}
                        </p>
                        <p className="text-xs text-[#6B7280]">Alerts</p>
                      </div>
                    </div>

                    {patient.risk_count > 0 && (
                      <div className="mt-3">
                        <Badge variant="risk" riskLevel={riskLevel}>
                          {riskLevel.toUpperCase()} RISK
                        </Badge>
                      </div>
                    )}
                  </Card>
                </Link>
              </motion.div>
            );
          })}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <Card>
          <p className="text-center text-[#6B7280] py-8">No patients found</p>
        </Card>
      )}
    </div>
  );
}
