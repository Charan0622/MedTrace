import { NextResponse } from "next/server";
import { getProviderAndKey, generateAiResponse, formatAiError } from "@/lib/ai-client";
import { retrieveDrugContext } from "@/lib/gemini";
import { getDb } from "@/lib/db";
import { logger } from "@/lib/logger";
import crypto from "crypto";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params;
  const startTime = Date.now();
  const drugName = decodeURIComponent(name);
  const { key } = getProviderAndKey(request);
  const enhance = request.headers.get("x-enhance") === "true"; // only call AI if explicitly asked
  const db = getDb();
  const hash = crypto.createHash("sha256").update(drugName.toLowerCase().trim()).digest("hex");

  // === STEP 1: Check AI cache (instant) ===
  const cached = db.prepare("SELECT ai_summary, ai_model FROM drug_info_cache WHERE query_hash = ? AND expires_at > datetime('now')").get(hash) as { ai_summary: string; ai_model: string } | undefined;
  if (cached) {
    const { drugInfo, interactions } = retrieveDrugContext(drugName);
    return NextResponse.json({
      success: true,
      data: { drug_name: drugName, summary: cached.ai_summary, source: "ai-cache", drug_info: drugInfo, interactions, ai_model: cached.ai_model },
      error: null, meta: { ai_powered: true, query_time_ms: Date.now() - startTime },
    });
  }

  // === STEP 2: Check drug_info table (instant) ===
  let { found, drugInfo, interactions, context } = retrieveDrugContext(drugName);

  if (found && !enhance) {
    // Serve database content INSTANTLY — no AI call
    return NextResponse.json({
      success: true,
      data: { drug_name: drugName, summary: buildFallback(drugInfo), source: "database", drug_info: drugInfo, interactions, can_enhance: !!key },
      error: null, meta: { ai_powered: false, query_time_ms: Date.now() - startTime },
    });
  }

  // === STEP 3: Found + enhance requested — call AI and cache ===
  if (found && enhance && key) {
    try {
      logger.info(`AI-enhancing drug info: ${drugName} via NVIDIA NIM`);
      const summary = await generateAiResponse(key,
        `You are a clinical pharmacology AI in MedTrace hospital system. Using the verified drug data, generate a clear clinical summary. Format: ## Overview, ## How It Works, ## Uses, ## Important Warnings, ## Common Side Effects, ## Dosage Guidelines, ## Drug Interactions, ## Nursing Considerations. Be concise. Clinical language.`,
        `VERIFIED DRUG DATA:\n${context}`
      );
      db.prepare("INSERT OR REPLACE INTO drug_info_cache (id, drug_name, query_hash, ai_summary, ai_model, context_used, expires_at) VALUES (?, ?, ?, ?, ?, ?, datetime('now', '+30 days'))")
        .run(`cache-${Date.now()}`, drugName, hash, summary, "nvidia", context);
      return NextResponse.json({
        success: true,
        data: { drug_name: drugName, summary, source: "ai-live", drug_info: drugInfo, interactions, ai_model: "nvidia" },
        error: null, meta: { ai_powered: true, query_time_ms: Date.now() - startTime },
      });
    } catch (error) {
      return NextResponse.json({
        success: true,
        data: { drug_name: drugName, summary: buildFallback(drugInfo) + `\n\n---\n*AI error: ${formatAiError(error)}*`, source: "database", drug_info: drugInfo, interactions },
        error: null, meta: { ai_powered: false, query_time_ms: Date.now() - startTime },
      });
    }
  }

  // === STEP 4: NOT found — fetch from OpenFDA, store permanently ===
  if (!found) {
    logger.info(`Drug "${drugName}" not in DB — fetching from OpenFDA`);
    const fetched = await fetchFromOpenFDA(drugName, db);
    if (fetched) {
      const fresh = retrieveDrugContext(drugName);
      found = fresh.found;
      drugInfo = fresh.drugInfo;
      interactions = fresh.interactions;
      context = fresh.context;
    }

    // If found after OpenFDA fetch, serve it
    if (found) {
      // If AI available, generate enhanced summary and cache
      if (key) {
        try {
          const summary = await generateAiResponse(key,
            `Clinical pharmacology AI. Generate a structured clinical summary from this drug data. Format with ## headings. Be concise.`,
            `DRUG DATA:\n${context}`
          );
          db.prepare("INSERT OR REPLACE INTO drug_info_cache (id, drug_name, query_hash, ai_summary, ai_model, context_used, expires_at) VALUES (?, ?, ?, ?, ?, ?, datetime('now', '+30 days'))")
            .run(`cache-${Date.now()}`, drugName, hash, summary, "nvidia", context);
          return NextResponse.json({
            success: true,
            data: { drug_name: drugName, summary, source: "ai-live", drug_info: drugInfo, interactions, ai_model: "nvidia" },
            error: null, meta: { ai_powered: true, query_time_ms: Date.now() - startTime },
          });
        } catch { /* fall through to database response */ }
      }
      return NextResponse.json({
        success: true,
        data: { drug_name: drugName, summary: buildFallback(drugInfo), source: "database", drug_info: drugInfo, interactions },
        error: null, meta: { ai_powered: false, query_time_ms: Date.now() - startTime },
      });
    }

    // === STEP 5: Not in OpenFDA either — pure AI generation ===
    if (key) {
      try {
        const summary = await generateAiResponse(key,
          "Clinical pharmacology AI. Provide comprehensive drug information.",
          `Provide clinical information about "${drugName}": overview, mechanism, indications, contraindications, side effects, dosage, interactions, nursing considerations. Format with ## headings.`
        );
        // Cache for 30 days
        db.prepare("INSERT OR REPLACE INTO drug_info_cache (id, drug_name, query_hash, ai_summary, ai_model, context_used, expires_at) VALUES (?, ?, ?, ?, ?, ?, datetime('now', '+30 days'))")
          .run(`cache-${Date.now()}`, drugName, hash, summary, "nvidia", "ai-generated");
        // Add to drugs table for future search
        const existing = db.prepare("SELECT id FROM drugs WHERE LOWER(name) = LOWER(?)").get(drugName);
        if (!existing) db.prepare("INSERT INTO drugs (id, name) VALUES (?, ?)").run(`drug-ai-${Date.now()}`, drugName);
        return NextResponse.json({
          success: true,
          data: { drug_name: drugName, summary, source: "ai-generated", drug_info: null, interactions: [], ai_model: "nvidia" },
          error: null, meta: { ai_powered: true, query_time_ms: Date.now() - startTime },
        });
      } catch (error) {
        return NextResponse.json({
          success: true,
          data: { drug_name: drugName, summary: `Could not find "${drugName}". ${formatAiError(error)}`, source: "not-found", drug_info: null, interactions: [] },
          error: null, meta: { query_time_ms: Date.now() - startTime },
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: { drug_name: drugName, summary: `"${drugName}" not found. Add an AI key at login to auto-generate drug info.`, source: "not-found", drug_info: null, interactions: [] },
      error: null, meta: { query_time_ms: Date.now() - startTime },
    });
  }

  // Fallback
  return NextResponse.json({
    success: true,
    data: { drug_name: drugName, summary: buildFallback(drugInfo), source: "database", drug_info: drugInfo, interactions },
    error: null, meta: { ai_powered: false, query_time_ms: Date.now() - startTime },
  });
}

// Fetch from OpenFDA and store in drug_info table permanently
async function fetchFromOpenFDA(drugName: string, db: ReturnType<typeof getDb>): Promise<boolean> {
  try {
    const fdaUrl = `https://api.fda.gov/drug/label.json?search=openfda.brand_name:"${encodeURIComponent(drugName)}"+openfda.generic_name:"${encodeURIComponent(drugName)}"&limit=1`;
    const res = await fetch(fdaUrl, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return false;

    const data = await res.json();
    const result = data.results?.[0];
    if (!result) return false;

    const brandName = result.openfda?.brand_name?.[0] ?? drugName;
    const genericName = result.openfda?.generic_name?.[0] ?? null;
    const drugClass = result.openfda?.pharm_class_epc?.[0] ?? null;
    const route = result.openfda?.route?.[0] ?? null;

    const extract = (field: string[] | undefined) => (field?.[0] ?? "").slice(0, 600);

    // Ensure drug exists
    const existing = db.prepare("SELECT id FROM drugs WHERE LOWER(name) = LOWER(?)").get(drugName) as { id: string } | undefined;
    const drugId = existing?.id ?? `drug-fda-${Date.now()}`;
    if (!existing) {
      db.prepare("INSERT INTO drugs (id, name, generic_name, drug_class) VALUES (?, ?, ?, ?)").run(drugId, brandName, genericName, drugClass);
    }

    db.prepare(`INSERT OR REPLACE INTO drug_info (id, drug_id, drug_name, generic_name, drug_class, mechanism_of_action, indications, contraindications, side_effects, serious_adverse_reactions, dosage_info, interactions_summary, pregnancy_category, half_life, route_of_administration, source) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'openfda')`)
      .run(`di-fda-${Date.now()}`, drugId, brandName, genericName, drugClass,
        extract(result.mechanism_of_action ?? result.clinical_pharmacology),
        extract(result.indications_and_usage),
        extract(result.contraindications),
        extract(result.adverse_reactions),
        extract(result.warnings ?? result.warnings_and_cautions),
        extract(result.dosage_and_administration),
        extract(result.drug_interactions),
        result.openfda?.pregnancy_category?.[0] ?? "N/A",
        "See prescribing information",
        route,
      );

    logger.info(`Stored drug info for "${brandName}" from OpenFDA`);
    return true;
  } catch (error) {
    logger.warn(`OpenFDA fetch failed for "${drugName}"`, error instanceof Error ? error.message : "");
    return false;
  }
}

function buildFallback(info: Record<string, unknown> | null): string {
  if (!info) return "No data.";
  return `## Overview\n**${info.drug_name}** (${info.generic_name ?? "—"}) — ${info.drug_class ?? "—"}\n\n## How It Works\n${info.mechanism_of_action ?? "See prescribing information"}\n\n## Uses\n${info.indications ?? "See prescribing information"}\n\n## Important Warnings\n**Contraindications:** ${info.contraindications ?? "See prescribing information"}\n**Serious Reactions:** ${info.serious_adverse_reactions ?? "See prescribing information"}\n\n## Common Side Effects\n${info.side_effects ?? "See prescribing information"}\n\n## Dosage Guidelines\n${info.dosage_info ?? "See prescribing information"}\n\n## Drug Interactions\n${info.interactions_summary ?? "See prescribing information"}\n\n**Pregnancy:** ${info.pregnancy_category ?? "N/A"} | **Half-life:** ${info.half_life ?? "—"} | **Route:** ${info.route_of_administration ?? "—"}`;
}
