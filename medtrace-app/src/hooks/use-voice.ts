"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { apiClient } from "@/lib/api";
import type { VoiceExtractionResult } from "@/lib/types";

interface UseVoiceReturn {
  isListening: boolean;
  isSupported: boolean;
  transcript: string;
  interimTranscript: string;
  extraction: VoiceExtractionResult | null;
  isExtracting: boolean;
  error: string | null;
  startListening: () => void;
  stopListening: () => void;
  reset: () => void;
}

export function useVoice(): UseVoiceReturn {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [extraction, setExtraction] = useState<VoiceExtractionResult | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const isSupported = typeof window !== "undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  const extractEntities = useCallback(async (text: string) => {
    if (!text.trim()) return;
    setIsExtracting(true);
    const res = await apiClient<VoiceExtractionResult>("/api/voice/extract", {
      method: "POST",
      body: JSON.stringify({ text }),
    });
    if (res.success && res.data) {
      setExtraction(res.data);
    }
    setIsExtracting(false);
  }, []);

  const startListening = useCallback(() => {
    if (!isSupported) {
      setError("Speech recognition is not supported in this browser");
      return;
    }

    setError(null);
    setTranscript("");
    setInterimTranscript("");
    setExtraction(null);

    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognitionAPI();

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let final = "";
      let interim = "";

      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }

      setTranscript(final);
      setInterimTranscript(interim);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error !== "aborted") {
        setError(`Speech recognition error: ${event.error}`);
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [isSupported]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);

      // Extract entities from the final transcript
      const finalText = transcript || interimTranscript;
      if (finalText) {
        setTranscript(finalText);
        setInterimTranscript("");
        extractEntities(finalText);
      }
    }
  }, [transcript, interimTranscript, extractEntities]);

  const reset = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.abort();
    }
    setIsListening(false);
    setTranscript("");
    setInterimTranscript("");
    setExtraction(null);
    setError(null);
  }, []);

  return {
    isListening,
    isSupported,
    transcript,
    interimTranscript,
    extraction,
    isExtracting,
    error,
    startListening,
    stopListening,
    reset,
  };
}
