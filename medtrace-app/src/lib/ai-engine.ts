// ============================================================
// MedTrace — Rule-Based AI Engine (runs server-side)
// No API key required — works entirely on mock/DB data
// ============================================================

import type {
  RiskLevel,
  InteractionChain,
} from "./types";
import {
  MOCK_DRUGS,
  MOCK_DRUG_INTERACTIONS,
  MOCK_DRUG_ENZYME_EFFECTS,
  MOCK_ENZYME_METABOLISMS,
  MOCK_DRUG_CONTRAINDICATIONS,
  MOCK_PATIENT_CONDITIONS,
  MOCK_PATIENT_GENOTYPES,
  MOCK_GENE_ENZYME_EFFECTS,
  MOCK_ENZYMES,
  MOCK_CONDITIONS,
  MOCK_GENE_VARIANTS,
} from "./mock-data";

interface AnalysisInput {
  patient_id: string;
  new_drug_name: string;
  current_drug_ids: string[];
}

export function analyzeInteractions(input: AnalysisInput): InteractionChain[] {
  const { patient_id, new_drug_name, current_drug_ids } = input;
  const chains: InteractionChain[] = [];

  const newDrug = MOCK_DRUGS.find(
    (d) => d.name.toLowerCase() === new_drug_name.toLowerCase()
  );
  if (!newDrug) return chains;

  // 1. Direct drug-drug interactions
  MOCK_DRUG_INTERACTIONS.forEach((di) => {
    const isNewDrugA = di.drug_a_id === newDrug.id;
    const isNewDrugB = di.drug_b_id === newDrug.id;

    if (!isNewDrugA && !isNewDrugB) return;

    const otherDrugId = isNewDrugA ? di.drug_b_id : di.drug_a_id;
    if (!current_drug_ids.includes(otherDrugId)) return;

    const otherDrug = MOCK_DRUGS.find((d) => d.id === otherDrugId);
    if (!otherDrug) return;

    let riskLevel: RiskLevel;
    if (di.severity > 7) riskLevel = "critical";
    else if (di.severity > 4) riskLevel = "high";
    else riskLevel = "moderate";

    chains.push({
      type: "direct",
      risk_level: riskLevel,
      drugs_involved: [newDrug.name, otherDrug.name],
      mechanism: di.mechanism ?? "Direct drug-drug interaction",
      explanation: `${newDrug.name} and ${otherDrug.name} have a direct interaction with severity ${di.severity}/10. ${di.mechanism}`,
      evidence_level: di.evidence_level ?? "Unknown",
    });
  });

  // 2. Enzyme cascade: new drug inhibits enzyme that metabolizes a current drug
  MOCK_DRUG_ENZYME_EFFECTS
    .filter((dee) => dee.drug_id === newDrug.id && dee.effect === "inhibits")
    .forEach((dee) => {
      const enzyme = MOCK_ENZYMES.find((e) => e.id === dee.enzyme_id);
      if (!enzyme) return;

      MOCK_ENZYME_METABOLISMS
        .filter((em) => em.enzyme_id === dee.enzyme_id && current_drug_ids.includes(em.drug_id))
        .forEach((em) => {
          const affectedDrug = MOCK_DRUGS.find((d) => d.id === em.drug_id);
          if (!affectedDrug) return;

          chains.push({
            type: "enzyme_cascade",
            risk_level: dee.potency && dee.potency > 0.7 ? "high" : "moderate",
            drugs_involved: [newDrug.name, affectedDrug.name, enzyme.name],
            mechanism: `${newDrug.name} inhibits ${enzyme.name} which metabolizes ${affectedDrug.name}`,
            explanation: `${newDrug.name} inhibits ${enzyme.name} (potency: ${((dee.potency ?? 0) * 100).toFixed(0)}%). This enzyme is responsible for metabolizing ${affectedDrug.name}. Inhibition can lead to elevated ${affectedDrug.name} levels and increased risk of adverse effects.`,
          });
        });
    });

  // 3. Contraindication check
  const patientConditionIds = MOCK_PATIENT_CONDITIONS
    .filter((pc) => pc.patient_id === patient_id)
    .map((pc) => pc.condition_id);

  MOCK_DRUG_CONTRAINDICATIONS
    .filter((dc) => dc.drug_id === newDrug.id && patientConditionIds.includes(dc.condition_id))
    .forEach((dc) => {
      const condition = MOCK_CONDITIONS.find((c) => c.id === dc.condition_id);
      chains.push({
        type: "contraindication",
        risk_level: "critical",
        drugs_involved: [newDrug.name],
        mechanism: `Contraindicated for ${condition?.name ?? "condition"}`,
        explanation: dc.reason ?? `${newDrug.name} is contraindicated for patient's condition: ${condition?.name}`,
      });
    });

  // 4. Pharmacogenomic alerts
  const patientGenotypes = MOCK_PATIENT_GENOTYPES.filter((pg) => pg.patient_id === patient_id);
  patientGenotypes.forEach((pg) => {
    const geneVariant = MOCK_GENE_VARIANTS.find((gv) => gv.id === pg.gene_variant_id);
    if (!geneVariant) return;

    MOCK_GENE_ENZYME_EFFECTS
      .filter((gee) => gee.gene_variant_id === pg.gene_variant_id)
      .forEach((gee) => {
        // Check if the new drug is metabolized by the affected enzyme
        const metabolism = MOCK_ENZYME_METABOLISMS.find(
          (em) => em.enzyme_id === gee.enzyme_id && em.drug_id === newDrug.id
        );
        if (!metabolism) return;

        const enzyme = MOCK_ENZYMES.find((e) => e.id === gee.enzyme_id);
        const riskLevel: RiskLevel =
          gee.effect === "no_activity" ? "critical" :
          gee.effect === "reduced_activity" ? "high" : "moderate";

        chains.push({
          type: "pharmacogenomic",
          risk_level: riskLevel,
          drugs_involved: [newDrug.name, geneVariant.gene],
          mechanism: `Patient is ${geneVariant.type?.replace("_", " ")} for ${enzyme?.name ?? "enzyme"}`,
          explanation: `Patient carries ${geneVariant.gene} ${geneVariant.variant} (${geneVariant.type?.replace("_", " ")}). This affects ${enzyme?.name} activity, which metabolizes ${newDrug.name}. Dosage adjustment may be required.`,
        });
      });
  });

  // Sort by risk level
  const riskOrder: Record<RiskLevel, number> = { critical: 0, high: 1, moderate: 2, low: 3, safe: 4 };
  chains.sort((a, b) => riskOrder[a.risk_level] - riskOrder[b.risk_level]);

  return chains;
}

export function getOverallRisk(chains: InteractionChain[]): RiskLevel {
  if (chains.length === 0) return "safe";
  if (chains.some((c) => c.risk_level === "critical")) return "critical";
  if (chains.some((c) => c.risk_level === "high")) return "high";
  if (chains.some((c) => c.risk_level === "moderate")) return "moderate";
  return "low";
}

