// ============================================================
// MedTrace — AI Client (NVIDIA NIM — Dual Model)
// Fast: Llama 3.1 8B | Detailed: Nemotron Super 49B
// API key comes from user login, passed via request headers
// ============================================================

import OpenAI from "openai";
import { logger } from "./logger";

export function getProviderAndKey(request: Request): { key: string | null } {
  const key = request.headers.get("x-ai-key");
  if (!key) return { key: null };
  return { key };
}

function createClient(key: string, timeout = 120000) {
  return new OpenAI({
    apiKey: key,
    baseURL: "https://integrate.api.nvidia.com/v1",
    timeout,
  });
}

// Main model — Nemotron Super 49B for detailed responses
export async function generateAiResponse(
  key: string,
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const client = createClient(key);
  const response = await client.chat.completions.create({
    model: "nvidia/llama-3.3-nemotron-super-49b-v1",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.4,
    max_tokens: 4096,
  });
  return response.choices[0]?.message?.content ?? "";
}

// Fast model — Llama 3.1 8B for instant responses
export async function generateFastResponse(
  key: string,
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const client = createClient(key, 30000);
  const response = await client.chat.completions.create({
    model: "meta/llama-3.1-8b-instruct",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.3,
    max_tokens: 512,
  });
  return response.choices[0]?.message?.content ?? "";
}

export function formatAiError(error: unknown): string {
  const msg = error instanceof Error ? error.message : String(error);
  logger.error("AI request failed", msg);

  if (msg.includes("429") || msg.includes("quota") || msg.includes("rate")) {
    return "API rate limit exceeded. Please wait a moment and try again.";
  }
  if (msg.includes("401") || msg.includes("403") || msg.includes("INVALID") || msg.includes("expired")) {
    return "Invalid or expired API key. Please logout and re-enter a valid key.";
  }
  if (msg.includes("404")) {
    return "AI model not found. The provider may be temporarily unavailable.";
  }
  if (msg.includes("ENOTFOUND") || msg.includes("ECONNREFUSED") || msg.includes("fetch")) {
    return "Cannot reach the AI service. Check your internet connection.";
  }
  return `AI request failed: ${msg.slice(0, 100)}`;
}
