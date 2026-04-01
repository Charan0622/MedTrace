"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Loader2, Lightbulb, Heart } from "lucide-react";
import { getRandomHealthTip } from "@/lib/health-tips";

interface AiLoadingTipProps {
  patientName: string;
  action: string; // "care plan" | "discharge plan" | "shift handoff" | "vitals analysis"
}

export function AiLoadingTip({ patientName, action }: AiLoadingTipProps) {
  const [tip, setTip] = useState(getRandomHealthTip());

  // Rotate tip every 8 seconds if still loading
  useEffect(() => {
    const interval = setInterval(() => {
      setTip(getRandomHealthTip());
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="py-8 px-4"
    >
      {/* Health Tip Card */}
      <div className="max-w-lg mx-auto mb-6 rounded-2xl bg-gradient-to-br from-emerald-500/5 to-cyan-500/5 border border-emerald-500/10 p-5">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-emerald-500/10 p-2 shrink-0 mt-0.5">
            <Lightbulb className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider mb-1.5">Did You Know? — {tip.category}</p>
            <motion.p
              key={tip.tip}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-sm text-[#D1D5DB] leading-relaxed"
            >
              {tip.tip}
            </motion.p>
          </div>
        </div>
      </div>

      {/* Loading Message */}
      <div className="flex flex-col items-center gap-3">
        <div className="relative">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-emerald-400/20"
            animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0, 0.3] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </div>
        <div className="text-center">
          <p className="text-sm text-[#D1D5DB]">
            Please wait while we generate {patientName}&apos;s personalized {action} <Heart className="h-3.5 w-3.5 inline text-red-400 mx-0.5" />
          </p>
          <p className="text-[11px] text-[#6B7280] mt-1">
            AI is analyzing conditions, medications, vitals, labs, and allergies...
          </p>
        </div>
      </div>
    </motion.div>
  );
}
