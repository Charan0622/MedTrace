"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, Send, Loader2, X, MessageCircle, Sparkles } from "lucide-react";
import { MarkdownRenderer } from "@/components/ui/MarkdownRenderer";
import { useAuth } from "@/lib/auth-context";

interface Message {
  id: number;
  role: "user" | "ai";
  content: string;
  timestamp: Date;
}

interface AICopilotProps {
  patientId: string;
  patientName: string;
}

const QUICK_QUESTIONS = [
  "What should I monitor tonight?",
  "Are there any concerning vitals trends?",
  "Summarize this patient for shift handoff",
  "Any drug interactions I should watch for?",
  "What's the pain management plan?",
];

export function AICopilot({ patientId, patientName }: AICopilotProps) {
  const { user, hasAi, aiHeaders } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const msgId = useRef(0);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return;

    const userMsg: Message = { id: ++msgId.current, role: "user", content: text.trim(), timestamp: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai/copilot", {
        method: "POST",
        headers: aiHeaders(),
        body: JSON.stringify({ patient_id: patientId, question: text.trim(), user_role: user?.role ?? "nurse" }),
      });
      const data = await res.json();

      const aiMsg: Message = {
        id: ++msgId.current,
        role: "ai",
        content: data.success ? data.data.answer : (data.error?.message ?? "Failed to get response"),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch {
      setMessages((prev) => [...prev, { id: ++msgId.current, role: "ai", content: "Network error. Please try again.", timestamp: new Date() }]);
    }

    setLoading(false);
  }

  return (
    <>
      {/* Floating button */}
      <motion.button
        onClick={() => setOpen(!open)}
        className={`fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full px-4 py-3 font-medium shadow-lg transition-colors ${
          open ? "bg-white/[0.06] text-[#D1D5DB]" : "bg-emerald-600 text-white hover:bg-emerald-700"
        }`}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        {open ? <X className="h-5 w-5" /> : <><Sparkles className="h-5 w-5" /> AI Copilot</>}
      </motion.button>

      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-20 right-6 z-40 w-96 rounded-xl border border-white/[0.06] bg-[#141918] shadow-2xl flex flex-col"
            style={{ maxHeight: "70vh" }}
          >
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.06]">
              <div className="rounded-lg bg-emerald-500/10 p-1.5">
                <Brain className="h-5 w-5 text-emerald-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-[#F0FDF4]">Clinical Copilot</p>
                <p className="text-xs text-[#6B7280]">Asking about {patientName}</p>
              </div>
              {!hasAi && (
                <span className="text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">No API Key</span>
              )}
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 min-h-48 max-h-80">
              {messages.length === 0 && (
                <div className="text-center py-4">
                  <MessageCircle className="h-8 w-8 text-[#6B7280] mx-auto mb-2" />
                  <p className="text-sm text-[#6B7280] mb-3">Ask anything about {patientName}</p>
                  <div className="space-y-1.5">
                    {QUICK_QUESTIONS.map((q) => (
                      <button
                        key={q}
                        onClick={() => sendMessage(q)}
                        className="w-full text-left text-xs text-[#6B7280] hover:text-emerald-400 bg-white/[0.04] hover:bg-white/[0.04]/80 rounded-lg px-3 py-2 transition-colors"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] rounded-lg px-3 py-2 ${
                    msg.role === "user"
                      ? "bg-emerald-600 text-white"
                      : "bg-white/[0.04] text-[#D1D5DB]"
                  }`}>
                    {msg.role === "ai" ? (
                      <MarkdownRenderer content={msg.content} />
                    ) : (
                      <p className="text-sm">{msg.content}</p>
                    )}
                    <p className="text-[10px] opacity-50 mt-1">{msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="bg-white/[0.04] rounded-lg px-3 py-2 flex items-center gap-2">
                    <Loader2 className="h-4 w-4 text-emerald-400 animate-spin" />
                    <span className="text-sm text-[#6B7280]">Thinking...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="border-t border-white/[0.06] px-3 py-3">
              <div className="flex gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage(input)}
                  placeholder="Ask about this patient..."
                  className="flex-1 h-9 rounded-lg border border-white/[0.06] bg-white/[0.04] px-3 text-sm text-[#D1D5DB] placeholder:text-[#6B7280] focus:border-emerald-500 focus:outline-none"
                  disabled={loading}
                />
                <button
                  onClick={() => sendMessage(input)}
                  disabled={!input.trim() || loading}
                  className="h-9 w-9 flex items-center justify-center rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40 transition-colors"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
