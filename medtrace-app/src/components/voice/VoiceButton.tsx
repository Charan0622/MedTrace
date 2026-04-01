"use client";

import { Mic, MicOff } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface VoiceButtonProps {
  isListening: boolean;
  isSupported: boolean;
  onStart: () => void;
  onStop: () => void;
  className?: string;
}

export function VoiceButton({ isListening, isSupported, onStart, onStop, className }: VoiceButtonProps) {
  if (!isSupported) return null;

  return (
    <motion.button
      onClick={isListening ? onStop : onStart}
      className={cn(
        "relative flex items-center justify-center rounded-full p-3 transition-colors",
        isListening
          ? "bg-red-500/20 text-red-400 border border-red-500/30"
          : "bg-white/[0.04] text-[#6B7280] border border-white/[0.06] hover:text-[#D1D5DB] hover:bg-white/[0.06]",
        className
      )}
      whileTap={{ scale: 0.95 }}
      title={isListening ? "Stop recording" : "Start voice input"}
    >
      {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}

      {/* Pulsing glow when listening */}
      {isListening && (
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-red-400"
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.5, 0, 0.5],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      )}
    </motion.button>
  );
}
