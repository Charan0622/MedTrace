"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Stethoscope, Activity, Users, Phone, BedDouble } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/layout/PageHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import { apiClient } from "@/lib/api";

// Fetch staff data from existing APIs
// Use /api/patients which returns doctor info per patient
// Use /api/register (GET) which returns all users with roles

interface StaffMember {
  id: string; name: string; role: string; department: string; employee_id: string;
  patients: { id: string; name: string; room: string; diagnosis: string }[];
}

export default function StaffPage() {
  const [doctors, setDoctors] = useState<StaffMember[]>([]);
  const [nurses, setNurses] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/register").then(r => r.json()),
      fetch("/api/patients").then(r => r.json()),
    ]).then(([staffRes, patientRes]) => {
      const allStaff = staffRes.data ?? [];
      const allPatients = patientRes.data ?? [];

      // Build doctor list with their patients
      const doctorList: StaffMember[] = allStaff
        .filter((s: any) => s.role === "doctor")
        .map((doc: any) => ({
          ...doc,
          patients: allPatients
            .filter((p: any) => p.doctor?.name === doc.name)
            .map((p: any) => ({
              id: p.id,
              name: p.name,
              room: p.room?.room_number ?? "—",
              diagnosis: p.admission?.diagnosis ?? "N/A",
            })),
        }));

      // Build nurse list (nurses don't have direct patient assignments in this system,
      // so show all admitted patients as their responsibility)
      const nurseList: StaffMember[] = allStaff
        .filter((s: any) => s.role === "nurse")
        .map((nurse: any) => ({
          ...nurse,
          patients: [], // nurses cover all patients in their department
        }));

      setDoctors(doctorList);
      setNurses(nurseList);
      setLoading(false);
    });
  }, []);

  const totalAdmitted = doctors.reduce((sum, d) => sum + d.patients.length, 0);

  // Render staff card
  function StaffCard({ staff, color }: { staff: StaffMember; color: "sky" | "emerald" }) {
    const isDoctor = staff.role === "doctor";
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <Card variant="glass" className="card-hover-lift">
          <div className="flex items-center gap-3 mb-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold ${color === "sky" ? "bg-sky-500/10 text-sky-400" : "bg-emerald-500/10 text-emerald-400"}`}>
              {staff.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-[#F0FDF4]">{staff.name}</p>
              <p className="text-[10px] text-[#6B7280]">{staff.department} • {staff.employee_id}</p>
            </div>
            {isDoctor && (
              <Badge className={staff.patients.length > 0 ? "bg-sky-500/10 text-sky-400 border-sky-500/20" : "bg-white/[0.04] text-[#6B7280]"}>
                {staff.patients.length} patients
              </Badge>
            )}
          </div>

          {/* Patient list for doctors */}
          {isDoctor && staff.patients.length > 0 && (
            <div className="space-y-1.5 mt-2">
              {staff.patients.map((p) => (
                <Link key={p.id} href={`/patients/${p.id}`}>
                  <div className="flex items-center gap-2 rounded-lg bg-white/[0.02] px-3 py-2 hover:bg-white/[0.04] transition-colors cursor-pointer">
                    <BedDouble className="h-3 w-3 text-[#6B7280]" />
                    <span className="text-xs font-mono text-emerald-400">{p.room}</span>
                    <span className="text-xs text-[#D1D5DB] flex-1 truncate">{p.name}</span>
                    <span className="text-[10px] text-[#6B7280] truncate max-w-28">{p.diagnosis}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {isDoctor && staff.patients.length === 0 && (
            <p className="text-[10px] text-[#6B7280] mt-1">No patients currently assigned</p>
          )}
        </Card>
      </motion.div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-40" />)}</div>
          <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-24" />)}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Staff On Duty" description={`${doctors.length} doctors • ${nurses.length} nurses • ${totalAdmitted} patients assigned`} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Doctors — Left Half */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="rounded-lg bg-sky-500/10 p-1.5">
              <Stethoscope className="h-5 w-5 text-sky-400" />
            </div>
            <h2 className="text-lg font-semibold text-[#F0FDF4]">Doctors ({doctors.length})</h2>
          </div>
          <div className="space-y-3">
            {doctors.map((doc, i) => (
              <motion.div key={doc.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                <StaffCard staff={doc} color="sky" />
              </motion.div>
            ))}
          </div>
        </div>

        {/* Nurses — Right Half */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="rounded-lg bg-emerald-500/10 p-1.5">
              <Activity className="h-5 w-5 text-emerald-400" />
            </div>
            <h2 className="text-lg font-semibold text-[#F0FDF4]">Nurses ({nurses.length})</h2>
          </div>
          <div className="space-y-3">
            {nurses.map((nurse, i) => (
              <motion.div key={nurse.id} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                <StaffCard staff={nurse} color="emerald" />
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
