"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Lightbulb, Heart } from "lucide-react";
import { getRandomHealthTip } from "@/lib/health-tips";

interface AiLoadingTipProps {
  patientName: string;
  action: string;
}

export function AiLoadingTip({ patientName, action }: AiLoadingTipProps) {
  const [tip, setTip] = useState(getRandomHealthTip());

  useEffect(() => {
    const interval = setInterval(() => setTip(getRandomHealthTip()), 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="py-6 px-4">
      {/* Health Tip */}
      <div className="max-w-lg mx-auto mb-4 rounded-2xl bg-gradient-to-br from-emerald-500/5 to-cyan-500/5 border border-emerald-500/10 p-5">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-emerald-500/10 p-2 shrink-0 mt-0.5">
            <Lightbulb className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider mb-1.5">Did You Know? — {tip.category}</p>
            <motion.p key={tip.tip} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-[#D1D5DB] leading-relaxed">
              {tip.tip}
            </motion.p>
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center gap-1">
        <p className="text-sm text-[#D1D5DB]">
          Preparing {patientName}&apos;s {action} <Heart className="h-3.5 w-3.5 inline text-red-400 mx-0.5" />
        </p>
        <p className="text-[10px] text-[#6B7280]">Analyzing conditions, medications, vitals, labs & allergies...</p>
      </div>
    </motion.div>
  );
}
