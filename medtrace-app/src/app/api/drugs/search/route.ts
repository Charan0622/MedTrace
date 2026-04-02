import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { logger } from "@/lib/logger";

const TOXIC_TERMS = [
  "sulfuric acid", "hydrochloric acid", "nitric acid", "phosphoric acid",
  "bleach", "ammonia", "cyanide", "arsenic", "mercury", "lead", "thallium", "ricin",
  "methanol", "ethylene glycol", "antifreeze", "rat poison", "pesticide", "insecticide",
  "formaldehyde", "benzene", "toluene", "acetone", "turpentine", "kerosene", "gasoline",
  "drain cleaner", "oven cleaner", "paint thinner", "lighter fluid", "battery acid",
  "strychnine", "hemlock", "nightshade", "aconite", "oleander",
  "heroin", "cocaine", "methamphetamine", "crack", "meth", "ecstasy", "lsd",
  "plutonium", "uranium", "asbestos", "sodium hydroxide", "potassium hydroxide",
  "caustic soda", "lye", "chlorine gas",
];

function containsToxic(name: string): boolean {
  const lower = name.toLowerCase();
  return TOXIC_TERMS.some((t) => lower.includes(t));
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";

  if (!q || q.length < 2) {
    return NextResponse.json({ success: true, data: [], error: null, meta: { query_time_ms: Date.now() - startTime } });
  }

  const db = getDb();
  const seen = new Set<string>();
  const results: Record<string, unknown>[] = [];

  // 1. Local DB (instant)
  const local = db.prepare(
    "SELECT *, 'local' as source FROM drugs WHERE LOWER(name) LIKE ? OR LOWER(generic_name) LIKE ? LIMIT 10"
  ).all(`%${q.toLowerCase()}%`, `%${q.toLowerCase()}%`) as Record<string, unknown>[];
  for (const r of local) { seen.add(String(r.name).toLowerCase()); results.push(r); }

  // 2. RxNorm Approximate Term (free, no key — finds misspellings, brand names, international names)
  try {
    const rxUrl = `https://rxnav.nlm.nih.gov/REST/approximateTerm.json?term=${encodeURIComponent(q)}&maxEntries=8`;
    const rxRes = await fetch(rxUrl, { signal: AbortSignal.timeout(3000) });
    if (rxRes.ok) {
      const rxData = await rxRes.json();
      const candidates = rxData.approximateGroup?.candidate ?? [];
      const uniqueRxcuis = [...new Set(candidates.map((c: { rxcui: string }) => c.rxcui))].slice(0, 6);

      // Batch fetch names for all rxcuis
      for (const rxcui of uniqueRxcuis) {
        try {
          const propRes = await fetch(`https://rxnav.nlm.nih.gov/REST/rxcui/${rxcui}/properties.json`, { signal: AbortSignal.timeout(2000) });
          if (propRes.ok) {
            const propData = await propRes.json();
            const props = propData.properties;
            if (props?.name) {
              const name = String(props.name);
              // Skip pack entries and overly long names
              if (name.includes("{") || name.includes("}") || name.length > 80) continue;
              if (seen.has(name.toLowerCase())) continue;
              seen.add(name.toLowerCase());
              results.push({
                id: `rxnorm-${rxcui}`, name,
                generic_name: props.synonym ?? null,
                drug_class: props.tty === "BN" ? "Brand Name" : props.tty === "IN" ? "Ingredient" : props.tty ?? null,
                efficacy_score: null, source: "rxnorm",
              });
            }
          }
        } catch { /* skip individual lookup failures */ }
      }
    }
  } catch (e) { logger.warn("RxNorm search failed", e instanceof Error ? e.message : ""); }

  // 3. OpenFDA (broader coverage)
  try {
    const fdaUrl = `https://api.fda.gov/drug/label.json?search=openfda.brand_name:${encodeURIComponent(q)}*+openfda.generic_name:${encodeURIComponent(q)}*&limit=6`;
    const fdaRes = await fetch(fdaUrl, { signal: AbortSignal.timeout(3000) });
    if (fdaRes.ok) {
      const fdaData = await fdaRes.json();
      for (const r of fdaData.results ?? []) {
        const names = [...(r.openfda?.brand_name ?? []), ...(r.openfda?.generic_name ?? [])];
        const drugClass = r.openfda?.pharm_class_epc?.[0] ?? null;
        for (const name of names.slice(0, 2)) {
          if (seen.has(name.toLowerCase()) || name.length > 80) continue;
          seen.add(name.toLowerCase());
          results.push({
            id: `fda-${name.toLowerCase().replace(/\s+/g, "-")}`, name,
            generic_name: r.openfda?.generic_name?.[0] ?? null,
            drug_class: drugClass, efficacy_score: null, source: "openfda",
          });
        }
      }
    }
  } catch (e) { logger.warn("OpenFDA search failed", e instanceof Error ? e.message : ""); }

  // 4. Filter out any toxic/non-pharmaceutical substances
  const safeResults = results.filter((r) => !containsToxic(String(r.name)));

  // 5. Allow custom entry ONLY if query doesn't match toxic substances
  if (safeResults.length === 0 && q.length >= 3 && !containsToxic(q)) {
    safeResults.push({
      id: `custom-${Date.now()}`,
      name: q.split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" "),
      generic_name: null, drug_class: null, efficacy_score: null, source: "custom",
    });
  }

  // If user searched for a toxic substance, return a warning
  if (containsToxic(q)) {
    return NextResponse.json({
      success: true, data: [], error: null,
      meta: { query_time_ms: Date.now() - startTime, total: 0, warning: `"${q}" is not a valid medication. Only FDA-approved pharmaceuticals can be prescribed.` },
    });
  }

  return NextResponse.json({
    success: true, data: safeResults.slice(0, 20), error: null,
    meta: { query_time_ms: Date.now() - startTime, total: safeResults.length },
  });
}
