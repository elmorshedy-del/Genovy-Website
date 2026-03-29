import fs from "node:fs/promises";
import path from "node:path";
import { withClient } from "../db/pool.js";
import { extractDxPhenotypeInput, validateDxPhenotypeInput } from "../lib/phenopackets.js";
import {
  loadDxDiseasePhenotypeRows,
  loadDxGeneDiseaseSupportRows,
  loadDxGenePhenotypeRows,
  loadDxPhenotypeOntologyRows
} from "../repositories/dxRepository.js";
import { buildDxSimilarityIndex, rankGenesByPhenotypeSimilarity } from "../services/dx/similarityEngine.js";
import { extractTruthGeneKeys, findTruthRank } from "./lib/shadowBenchmarkUtils.js";

const CASE_FILE = "PMID_29330883_Subject9.json";
const PHENOPACKET_DIR =
  "/Users/ahmedelmorshedy/Genovy-phenotype-enrichment-20260316-0914/preservation/original-output-snapshot-20260326/pheval-official-sample-100/phenopackets";

const FREQUENCY = {
  obligate: { curie: "HP:0040280", label: "Obligate (100%)" },
  occasional: { curie: "HP:0040283", label: "Occasional (5-29%)" }
};

const SCENARIOS = [
  {
    id: "presence",
    terms: {
      "MONDO:0014857": [
        { curie: "HP:0000664", referenceText: "PMID:29330883" },
        { curie: "HP:0000154", referenceText: "PMID:29330883" },
        { curie: "HP:0001249", referenceText: "GeneReviews: RERE-Related Disorders" }
      ],
      "MONDO:0032485": [
        { curie: "HP:0001249", referenceText: "PMID:29740699" },
        { curie: "HP:0002474", referenceText: "PMID:29740699" },
        { curie: "HP:0000486", referenceText: "PMID:29740699" },
        { curie: "HP:0000639", referenceText: "PMID:29740699" }
      ]
    }
  },
  {
    id: "frequency",
    terms: {
      "MONDO:0014857": [
        {
          curie: "HP:0000664",
          referenceText: "PMID:29330883",
          frequencyCurie: FREQUENCY.occasional.curie,
          frequencyLabel: FREQUENCY.occasional.label
        },
        {
          curie: "HP:0000154",
          referenceText: "PMID:29330883",
          frequencyCurie: FREQUENCY.occasional.curie,
          frequencyLabel: FREQUENCY.occasional.label
        },
        { curie: "HP:0001249", referenceText: "GeneReviews: RERE-Related Disorders" }
      ],
      "MONDO:0032485": [
        {
          curie: "HP:0001249",
          referenceText: "PMID:29740699",
          frequencyCurie: FREQUENCY.obligate.curie,
          frequencyLabel: FREQUENCY.obligate.label
        },
        { curie: "HP:0002474", referenceText: "PMID:29740699" },
        { curie: "HP:0000486", referenceText: "PMID:29740699" },
        { curie: "HP:0000639", referenceText: "PMID:29740699" }
      ]
    }
  }
];

function summarizeRow(row) {
  if (!row) return null;
  return {
    rank: row.rank,
    gene: row.geneLabel,
    score: row.normalizedScore,
    direct: row.directNormalizedScore,
    support: row.diseaseSupportScore,
    supportDisease: row.supportingDiseaseLabel,
    matched: row.matchedPhenotypeCount
  };
}

await withClient(async (client) => {
  const ontologyRows = await loadDxPhenotypeOntologyRows(client);
  const diseasePhenotypeResult = await loadDxDiseasePhenotypeRows(client);
  const genePhenotypeResult = await loadDxGenePhenotypeRows(client);
  const geneDiseaseSupportRows = await loadDxGeneDiseaseSupportRows(client);
  const caseRaw = await fs.readFile(path.join(PHENOPACKET_DIR, CASE_FILE), "utf8");

  const candidateCuries = [...new Set(SCENARIOS.flatMap((scenario) => Object.values(scenario.terms).flatMap((terms) => terms.map((term) => term.curie))))];
  const candidateResult = await client.query(
    "SELECT entity_id, canonical_curie, canonical_label FROM entities WHERE entity_type = $1 AND canonical_curie = ANY($2::text[]) ORDER BY canonical_curie",
    ["phenotype", candidateCuries]
  );

  const diseasePhenotypeRows = diseasePhenotypeResult.rows;
  const genePhenotypeRows = genePhenotypeResult.rows;
  const diseaseMeta = new Map(
    [...diseasePhenotypeRows, ...geneDiseaseSupportRows]
      .filter((row) => row?.disease_curie)
      .map((row) => [
        row.disease_curie,
        {
          id: Number(row.disease_entity_id),
          curie: row.disease_curie,
          label: row.disease_label || row.disease_curie
        }
      ])
  );
  const candidateByCurie = new Map(candidateResult.rows.map((row) => [row.canonical_curie, row]));

  const payload = JSON.parse(caseRaw);
  const phenopacket = payload?.phenopacket || payload;
  const input = extractDxPhenotypeInput({ phenopacket });
  const validationError = validateDxPhenotypeInput(input);
  if (validationError) throw new Error(validationError);
  const truthGeneKeys = extractTruthGeneKeys(phenopacket);

  const baselineIndex = buildDxSimilarityIndex({
    ontologyRows,
    diseasePhenotypeRows,
    genePhenotypeRows,
    geneDiseaseSupportRows
  });
  const baselineRanking = rankGenesByPhenotypeSimilarity(baselineIndex, {
    phenotypeCuries: input.presentPhenotypeCuries,
    excludedPhenotypeCuries: input.excludedPhenotypeCuries,
    limit: 2000
  }).results;
  const baselineTruthRank = findTruthRank(baselineRanking, truthGeneKeys);
  const baselineTruth = baselineTruthRank == null ? null : baselineRanking.find((row) => row.rank === baselineTruthRank) || null;

  const output = {
    caseId: CASE_FILE.replace(/\.json$/, ""),
    baseline: {
      top1: summarizeRow(baselineRanking[0] || null),
      truth: summarizeRow(baselineTruth)
    }
  };

  for (const scenario of SCENARIOS) {
    const existingRows = diseasePhenotypeRows.filter(
      (row) =>
        (row.presence_status || "present") === "present" &&
        (row.phenotype_edge_origin || "direct") === "direct"
    );
    const added = [];
    const skipped = [];

    for (const [diseaseCurie, terms] of Object.entries(scenario.terms)) {
      const existing = new Set(
        existingRows.filter((row) => row.disease_curie === diseaseCurie).map((row) => row.phenotype_curie)
      );
      for (const term of terms) {
        if (existing.has(term.curie)) {
          skipped.push({ diseaseCurie, curie: term.curie });
          continue;
        }
        const phenotype = candidateByCurie.get(term.curie);
        const disease = diseaseMeta.get(diseaseCurie);
        if (!phenotype || !disease) continue;
        added.push({
          disease_entity_id: disease.id,
          disease_curie: disease.curie,
          disease_label: disease.label,
          phenotype_entity_id: Number(phenotype.entity_id),
          phenotype_curie: phenotype.canonical_curie,
          phenotype_label: phenotype.canonical_label,
          presence_status: "present",
          source_key: `shadow_${scenario.id}`,
          source_record_key: `shadow_${scenario.id}:${disease.curie}:${phenotype.canonical_curie}`,
          phenotype_edge_origin: "direct",
          reference_text: term.referenceText,
          evidence_code: "",
          onset_curie: "",
          onset_label: "",
          frequency_curie: term.frequencyCurie || "",
          frequency_label: term.frequencyLabel || "",
          modifier_curie: "",
          modifier_label: "",
          sex: "",
          aspect: "",
          row_source_mode: `shadow_${scenario.id}`
        });
      }
    }

    const shadowIndex = buildDxSimilarityIndex({
      ontologyRows,
      diseasePhenotypeRows: [...diseasePhenotypeRows, ...added],
      genePhenotypeRows,
      geneDiseaseSupportRows
    });
    const shadowRanking = rankGenesByPhenotypeSimilarity(shadowIndex, {
      phenotypeCuries: input.presentPhenotypeCuries,
      excludedPhenotypeCuries: input.excludedPhenotypeCuries,
      limit: 2000
    }).results;
    const truthRank = findTruthRank(shadowRanking, truthGeneKeys);
    const truth = truthRank == null ? null : shadowRanking.find((row) => row.rank === truthRank) || null;

    output[scenario.id] = {
      added: added.map((row) => ({
        disease: row.disease_curie,
        term: row.phenotype_label,
        frequency: row.frequency_label || "",
        referenceText: row.reference_text
      })),
      skipped,
      top1: summarizeRow(shadowRanking[0] || null),
      truth: summarizeRow(truth)
    };
  }

  console.log(JSON.stringify(output, null, 2));
});
