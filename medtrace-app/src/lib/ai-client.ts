// ============================================================
// MedTrace — Unified AI Client (Gemini + NVIDIA)
// API key comes from user login, passed via request headers
// ============================================================

import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";
import { logger } from "./logger";

export type Provider = "gemini" | "nvidia";

export function getProviderAndKey(request: Request): { provider: Provider | null; key: string | null } {
  const key = request.headers.get("x-ai-key");
  const provider = request.headers.get("x-ai-provider") as Provider | null;
  if (!key || !provider) return { provider: null, key: null };
  return { provider, key };
}

export async function generateAiResponse(
  provider: Provider,
  key: string,
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  if (provider === "gemini") {
    return generateGemini(key, systemPrompt, userPrompt);
  } else if (provider === "nvidia") {
    return generateNvidia(key, systemPrompt, userPrompt);
  }
  throw new Error(`Unknown AI provider: ${provider}`);
}

async function generateGemini(key: string, systemPrompt: string, userPrompt: string): Promise<string> {
  const genAI = new GoogleGenerativeAI(key);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    systemInstruction: systemPrompt,
    generationConfig: { maxOutputTokens: 4096, temperature: 0.4 },
  });
  const result = await model.generateContent(userPrompt);
  return result.response.text();
}

async function generateNvidia(key: string, systemPrompt: string, userPrompt: string): Promise<string> {
  const client = new OpenAI({
    apiKey: key,
    baseURL: "https://integrate.api.nvidia.com/v1",
    timeout: 120000,
  });
  const response = await client.chat.completions.create({
    model: "nvidia/nemotron-3-super-120b-a12b",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.4,
    max_tokens: 4096,
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
