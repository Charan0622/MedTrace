// ============================================================
// MedTrace — Gemini RAG Pipeline for Drug Information
// Uses Google Gemini 1.5 Flash (free tier: 15 RPM, 1M tokens/day)
// API key provided by user at login, passed via X-Gemini-Key header
// ============================================================

import { GoogleGenerativeAI } from "@google/generative-ai";
import { getDb } from "./db";
import { logger } from "./logger";
import crypto from "crypto";

export function isGeminiAvailable(apiKey?: string | null): boolean {
  return !!(apiKey || process.env.GEMINI_API_KEY);
}

function getClient(apiKey?: string | null): GoogleGenerativeAI | null {
  const key = apiKey || process.env.GEMINI_API_KEY;
  if (!key) return null;
  return new GoogleGenerativeAI(key);
}

function hashQuery(query: string): string {
  return crypto.createHash("sha256").update(query.toLowerCase().trim()).digest("hex");
}

function getCachedSummary(drugName: string): string | null {
  const db = getDb();
  const hash = hashQuery(drugName);
  const cached = db.prepare(
    "SELECT ai_summary FROM drug_info_cache WHERE query_hash = ? AND expires_at > datetime('now')"
  ).get(hash) as { ai_summary: string } | undefined;
  return cached?.ai_summary ?? null;
}

function cacheSummary(drugName: string, summary: string, model: string, context: string) {
  const db = getDb();
  const hash = hashQuery(drugName);
  db.prepare(
    "INSERT OR REPLACE INTO drug_info_cache (id, drug_name, query_hash, ai_summary, ai_model, context_used, expires_at) VALUES (?, ?, ?, ?, ?, ?, datetime('now', '+7 days'))"
  ).run(`cache-${Date.now()}`, drugName, hash, summary, model, context);
}

export function retrieveDrugContext(drugName: string): {
  found: boolean;
  drugInfo: Record<string, unknown> | null;
  interactions: Record<string, unknown>[];
  context: string;
} {
  const db = getDb();
  const drugInfo = db.prepare(
    "SELECT * FROM drug_info WHERE LOWER(drug_name) = LOWER(?) OR LOWER(generic_name) = LOWER(?)"
  ).get(drugName, drugName) as Record<string, unknown> | null;

  const drugRow = db.prepare("SELECT id FROM drugs WHERE LOWER(name) = LOWER(?)").get(drugName) as { id: string } | undefined;
  let interactions: Record<string, unknown>[] = [];
  if (drugRow) {
    interactions = db.prepare(`
      SELECT di.severity, di.mechanism, di.evidence_level, da.name as drug_a, db.name as drug_b
      FROM drug_interactions di JOIN drugs da ON da.id = di.drug_a_id JOIN drugs db ON db.id = di.drug_b_id
      WHERE di.drug_a_id = ? OR di.drug_b_id = ? ORDER BY di.severity DESC
    `).all(drugRow.id, drugRow.id) as Record<string, unknown>[];
  }

  let context = "";
  if (drugInfo) {
    context += `DRUG: ${drugInfo.drug_name} (${drugInfo.generic_name})\nCLASS: ${drugInfo.drug_class}\nMECHANISM: ${drugInfo.mechanism_of_action}\nINDICATIONS: ${drugInfo.indications}\nCONTRAINDICATIONS: ${drugInfo.contraindications}\nSIDE EFFECTS: ${drugInfo.side_effects}\nSERIOUS REACTIONS: ${drugInfo.serious_adverse_reactions}\nDOSAGE: ${drugInfo.dosage_info}\nINTERACTIONS: ${drugInfo.interactions_summary}\nPREGNANCY: Category ${drugInfo.pregnancy_category}\nHALF-LIFE: ${drugInfo.half_life}\nROUTE: ${drugInfo.route_of_administration}\n`;
  }
  if (interactions.length > 0) {
    context += `\nKNOWN INTERACTIONS:\n`;
    interactions.forEach((i) => { context += `- ${i.drug_a} + ${i.drug_b}: Severity ${i.severity}/10 — ${i.mechanism}\n`; });
  }

  return { found: !!drugInfo, drugInfo, interactions, context };
}

export async function generateDrugSummary(drugName: string, apiKey?: string | null): Promise<{
  summary: string;
  source: "gemini-cache" | "gemini-live" | "database-only";
  drugInfo: Record<string, unknown> | null;
  interactions: Record<string, unknown>[];
}> {
  const { found, drugInfo, interactions, context } = retrieveDrugContext(drugName);

  if (!found) {
    return { summary: `No detailed information found for "${drugName}" in the MedTrace database.`, source: "database-only", drugInfo: null, interactions: [] };
  }

  const cached = getCachedSummary(drugName);
  if (cached) {
    logger.info(`Drug info cache hit for ${drugName}`);
    return { summary: cached, source: "gemini-cache", drugInfo, interactions };
  }

  const client = getClient(apiKey);
  if (!client) {
    return { summary: buildFallbackSummary(drugInfo), source: "database-only", drugInfo, interactions };
  }

  try {
    logger.info(`Querying Gemini for drug summary: ${drugName}`);
    const model = client.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `You are a clinical pharmacology AI in a hospital nursing station called MedTrace. Using ONLY the verified drug data below, generate a clear clinical summary.

FORMAT:
## Overview
2-3 sentence description.

## How It Works
Mechanism of action.

## Uses
Bullet point indications.

## Important Warnings
Key contraindications and serious reactions. Highlight critical ones.

## Common Side Effects
Most common side effects.

## Dosage Guidelines
Standard dosing.

## Drug Interactions
Most significant interactions, especially CRITICAL ones.

## Nursing Considerations
3-5 specific things for nurses to monitor, hold criteria, patient education.

---
VERIFIED DATA:
${context}
---
Be concise. Clinical language. Do NOT invent information beyond the data.`;

    const result = await model.generateContent(prompt);
    const summary = result.response.text();
    cacheSummary(drugName, summary, "gemini-2.0-flash", context);
    return { summary, source: "gemini-live", drugInfo, interactions };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    logger.error(`Gemini query failed for ${drugName}: ${errMsg}`);
    let fallback = buildFallbackSummary(drugInfo);
    if (errMsg.includes("429") || errMsg.includes("quota")) {
      fallback = `**Gemini API quota exceeded** — showing database info instead.\n\n` + fallback;
    }
    return { summary: fallback, source: "database-only", drugInfo, interactions };
  }
}

function buildFallbackSummary(drugInfo: Record<string, unknown> | null): string {
  if (!drugInfo) return "No drug information available.";
  return `## Overview\n**${drugInfo.drug_name}** (${drugInfo.generic_name}) is a **${drugInfo.drug_class}**.\n\n## How It Works\n${drugInfo.mechanism_of_action}\n\n## Uses\n${drugInfo.indications}\n\n## Important Warnings\n**Contraindications:** ${drugInfo.contraindications}\n\n**Serious Reactions:** ${drugInfo.serious_adverse_reactions}\n\n## Common Side Effects\n${drugInfo.side_effects}\n\n## Dosage Guidelines\n${drugInfo.dosage_info}\n\n## Drug Interactions\n${drugInfo.interactions_summary}\n\n**Pregnancy Category:** ${drugInfo.pregnancy_category} | **Half-life:** ${drugInfo.half_life} | **Route:** ${drugInfo.route_of_administration}\n\n---\n*Source: MedTrace curated database — add AI key at login for enhanced summaries*`;
}
