"use client";

import { motion } from "framer-motion";
import { Loader2, Pill, Heart, Beaker } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type { VoiceExtractionResult } from "@/lib/types";

interface VoiceTranscriptProps {
  transcript: string;
  interimTranscript: string;
  isListening: boolean;
  isExtracting: boolean;
  extraction: VoiceExtractionResult | null;
  error: string | null;
}

export function VoiceTranscript({
  transcript,
  interimTranscript,
  isListening,
  isExtracting,
  extraction,
  error,
}: VoiceTranscriptProps) {
  const hasContent = transcript || interimTranscript || extraction || error;
  if (!hasContent) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Transcript */}
      {(transcript || interimTranscript) && (
        <Card>
          <div className="flex items-center gap-2 mb-3">
            {isListening && (
              <motion.div
                className="h-2 w-2 rounded-full bg-red-400"
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              />
            )}
            <CardTitle className="text-sm">
              {isListening ? "Listening..." : "Transcript"}
            </CardTitle>
          </div>
          <p className="text-sm text-[#D1D5DB]">
            {transcript}
            {interimTranscript && (
              <span className="text-[#6B7280] italic"> {interimTranscript}</span>
            )}
          </p>
        </Card>
      )}

      {/* Error */}
      {error && (
        <Card className="border-red-500/30 bg-red-500/5">
          <p className="text-sm text-red-400">{error}</p>
        </Card>
      )}

      {/* Extraction loading */}
      {isExtracting && (
        <Card>
          <div className="flex items-center gap-2 text-[#6B7280]">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Extracting entities...</span>
          </div>
        </Card>
      )}

      {/* Extracted entities */}
      {extraction && (
        <Card>
          <CardTitle className="text-sm mb-3">Extracted Entities</CardTitle>

          <div className="space-y-3">
            {extraction.entities.drugs.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Pill className="h-4 w-4 text-emerald-400" />
                  <span className="text-xs font-medium text-[#6B7280] uppercase tracking-wider">Drugs</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {extraction.entities.drugs.map((drug) => (
                    <Badge key={drug} className="font-mono capitalize">{drug}</Badge>
                  ))}
                </div>
              </div>
            )}

            {extraction.entities.conditions.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Heart className="h-4 w-4 text-amber-400" />
                  <span className="text-xs font-medium text-[#6B7280] uppercase tracking-wider">Conditions</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {extraction.entities.conditions.map((cond) => (
                    <Badge key={cond} className="capitalize">{cond}</Badge>
                  ))}
                </div>
              </div>
            )}

            {extraction.entities.dosages.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Beaker className="h-4 w-4 text-cyan-400" />
                  <span className="text-xs font-medium text-[#6B7280] uppercase tracking-wider">Dosages</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {extraction.entities.dosages.map((dose, i) => (
                    <Badge key={i} className="font-mono">{dose}</Badge>
                  ))}
                </div>
              </div>
            )}

            {extraction.entities.drugs.length === 0 &&
             extraction.entities.conditions.length === 0 &&
             extraction.entities.dosages.length === 0 && (
              <p className="text-sm text-[#6B7280]">No medical entities detected</p>
            )}
          </div>

          <div className="mt-3 pt-3 border-t border-white/[0.06]">
            <p className="text-xs text-[#6B7280]">
              Confidence: {(extraction.confidence * 100).toFixed(0)}%
            </p>
          </div>
        </Card>
      )}
    </motion.div>
  );
}
