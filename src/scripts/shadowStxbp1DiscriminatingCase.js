import fs from 'node:fs/promises';
import path from 'node:path';
import { withClient } from '../db/pool.js';
import { extractDxPhenotypeInput, validateDxPhenotypeInput } from '../lib/phenopackets.js';
import {
  loadDxDiseasePhenotypeRows,
  loadDxGeneDiseaseSupportRows,
  loadDxGenePhenotypeRows,
  loadDxPhenotypeOntologyRows
} from '../repositories/dxRepository.js';
import {
  buildDxSimilarityIndex,
  computeDiseaseSupportEvidenceWeight,
  rankDiseasesByPhenotypeSimilarity
} from '../services/dx/similarityEngine.js';

const DEFAULTS = Object.freeze({
  casePath: '/Users/ahmedelmorshedy/Genovy/output/pheval-official-sample-100/phenopackets/PMID_35190816_STX_28944233_270001.json',
  baselineAuditJson: '/Users/ahmedelmorshedy/Genovy/output/audit-stxbp1-missed-case-28944233-270001.json',
  outputJson: '/Users/ahmedelmorshedy/Genovy/output/shadow-stxbp1-discriminating-case-20260325.json',
  truthGene: 'STXBP1',
  targetDiseaseCurie: 'MONDO:0012812',
  truthSupportWeight: 0.68,
  targetTerms: ['HP:0000283', 'HP:0007021', 'HP:0001169', 'HP:0100710']
});

const PRESENT_STATUS = 'present';
const DIRECT_EDGE_ORIGIN = 'direct';
const SHADOW_SOURCE_KEY = 'shadow_stxbp1_discriminating_case';
const SHADOW_ROW_SOURCE_MODE = 'shadow_stxbp1_discriminating_case';
const SHADOW_REFERENCE_PREFIX = '[shadow STXBP1 discriminating case]';

function parseArgs(argv) {
  const flags = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith('--')) {
      flags[key] = true;
      continue;
    }
    flags[key] = next;
    index += 1;
  }
  return flags;
}

function parseList(value, fallback) {
  if (!value) return fallback;
  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

async function loadShadowInputs(candidateTermCuries) {
  return withClient(async (client) => {
    const ontologyRows = await loadDxPhenotypeOntologyRows(client);
    const diseasePhenotypeResult = await loadDxDiseasePhenotypeRows(client);
    const genePhenotypeResult = await loadDxGenePhenotypeRows(client);
    const geneDiseaseSupportRows = await loadDxGeneDiseaseSupportRows(client);
    const candidatePhenotypes = await client
      .query(
        `
          SELECT entity_id, canonical_curie, canonical_label
          FROM entities
          WHERE entity_type = 'phenotype'
            AND canonical_curie = ANY($1::text[])
          ORDER BY canonical_curie ASC
        `,
        [candidateTermCuries]
      )
      .then((result) => result.rows);

    return {
      ontologyRows,
      diseasePhenotypeRows: diseasePhenotypeResult.rows,
      genePhenotypeRows: genePhenotypeResult.rows,
      geneDiseaseSupportRows,
      candidatePhenotypes
    };
  });
}

function buildTargetDiseaseMeta(diseasePhenotypeRows, geneDiseaseSupportRows, targetDiseaseCurie) {
  const diseaseRow =
    diseasePhenotypeRows.find((row) => row.disease_curie === targetDiseaseCurie) ||
    geneDiseaseSupportRows.find((row) => row.disease_curie === targetDiseaseCurie);

  if (!diseaseRow) {
    throw new Error(`Unable to resolve target disease metadata for ${targetDiseaseCurie}.`);
  }

  return {
    disease_entity_id: Number(diseaseRow.disease_entity_id),
    disease_curie: targetDiseaseCurie,
    disease_label: diseaseRow.disease_label || targetDiseaseCurie
  };
}

function buildShadowRows(diseasePhenotypeRows, geneDiseaseSupportRows, candidatePhenotypes, targetDiseaseCurie, targetTerms) {
  const diseaseMeta = buildTargetDiseaseMeta(diseasePhenotypeRows, geneDiseaseSupportRows, targetDiseaseCurie);
  const existingDirectPresentRows = diseasePhenotypeRows.filter(
    (row) =>
      row.disease_curie === targetDiseaseCurie &&
      (row.presence_status || PRESENT_STATUS) === PRESENT_STATUS &&
      (row.phenotype_edge_origin || DIRECT_EDGE_ORIGIN) === DIRECT_EDGE_ORIGIN
  );
  const existingPhenotypeCuries = new Set(existingDirectPresentRows.map((row) => row.phenotype_curie));
  const candidateByCurie = new Map(candidatePhenotypes.map((row) => [row.canonical_curie, row]));

  const shadowAddedTerms = [];
  const skippedExistingTerms = [];
  const missingFromOntology = [];

  for (const candidateCurie of targetTerms) {
    if (existingPhenotypeCuries.has(candidateCurie)) {
      const existingRow = existingDirectPresentRows.find((row) => row.phenotype_curie === candidateCurie);
      skippedExistingTerms.push({
        phenotypeCurie: candidateCurie,
        phenotypeLabel: existingRow?.phenotype_label || candidateCurie
      });
      continue;
    }

    const phenotype = candidateByCurie.get(candidateCurie);
    if (!phenotype) {
      missingFromOntology.push(candidateCurie);
      continue;
    }

    shadowAddedTerms.push({
      disease_entity_id: diseaseMeta.disease_entity_id,
      disease_curie: diseaseMeta.disease_curie,
      disease_label: diseaseMeta.disease_label,
      phenotype_entity_id: Number(phenotype.entity_id),
      phenotype_curie: phenotype.canonical_curie,
      phenotype_label: phenotype.canonical_label,
      presence_status: PRESENT_STATUS,
      source_key: SHADOW_SOURCE_KEY,
      source_record_key: `${SHADOW_SOURCE_KEY}:${targetDiseaseCurie}:${phenotype.canonical_curie}`,
      phenotype_edge_origin: DIRECT_EDGE_ORIGIN,
      reference_text: `${SHADOW_REFERENCE_PREFIX} targeted discriminating-term augmentation`,
      evidence_code: '',
      onset_curie: '',
      onset_label: '',
      frequency_curie: '',
      frequency_label: '',
      modifier_curie: '',
      modifier_label: '',
      sex: '',
      aspect: '',
      row_source_mode: SHADOW_ROW_SOURCE_MODE
    });
  }

  return {
    diseaseMeta,
    existingDirectPresentRows,
    shadowAddedTerms,
    skippedExistingTerms,
    missingFromOntology,
    shadowDiseasePhenotypeRows: [...diseasePhenotypeRows, ...shadowAddedTerms]
  };
}

function summarizeDiseaseRow(row) {
  if (!row) return null;
  return {
    rank: row.rank,
    diseaseCurie: row.diseaseCurie,
    diseaseLabel: row.diseaseLabel,
    normalizedScore: row.normalizedScore,
    patientAverageScore: row.patientAverageScore,
    phenotypeAverageScore: row.diseaseAverageScore,
    matchedPhenotypeCount: row.matchedPhenotypeCount,
    profileDirectPhenotypeCount: row.profileDirectPhenotypeCount,
    profilePropagatedPhenotypeCount: row.profilePropagatedPhenotypeCount,
    supportEvidenceWeight: computeDiseaseSupportEvidenceWeight({
      normalizedScore: row.normalizedScore,
      matchedPhenotypeCount: row.matchedPhenotypeCount,
      directPhenotypeEdgeCount: row.profileDirectPhenotypeCount,
      propagatedPhenotypeEdgeCount: row.profilePropagatedPhenotypeCount,
      phenotypeCount: (row.profileDirectPhenotypeCount || 0) + (row.profilePropagatedPhenotypeCount || 0)
    })
  };
}

async function main() {
  const flags = parseArgs(process.argv.slice(2));
  const config = {
    casePath: flags['case-path'] || DEFAULTS.casePath,
    baselineAuditJson: flags['baseline-audit-json'] || DEFAULTS.baselineAuditJson,
    outputJson: flags['output-json'] || DEFAULTS.outputJson,
    truthGene: flags['truth-gene'] || DEFAULTS.truthGene,
    targetDiseaseCurie: flags['target-disease'] || DEFAULTS.targetDiseaseCurie,
    truthSupportWeight: Number(flags['truth-support-weight'] || DEFAULTS.truthSupportWeight),
    targetTerms: parseList(flags['target-terms'], DEFAULTS.targetTerms)
  };

  const payload = JSON.parse(await fs.readFile(config.casePath, 'utf8'));
  const phenopacket = payload?.phenopacket || payload;
  const input = extractDxPhenotypeInput({ phenopacket });
  const validationError = validateDxPhenotypeInput(input);
  if (validationError) {
    throw new Error(validationError);
  }

  const baselineAudit = JSON.parse(await fs.readFile(config.baselineAuditJson, 'utf8'));

  const { ontologyRows, diseasePhenotypeRows, genePhenotypeRows, geneDiseaseSupportRows, candidatePhenotypes } =
    await loadShadowInputs(config.targetTerms);

  const baselineIndex = buildDxSimilarityIndex({
    ontologyRows,
    diseasePhenotypeRows,
    genePhenotypeRows,
    geneDiseaseSupportRows
  });

  const {
    diseaseMeta,
    existingDirectPresentRows,
    shadowAddedTerms,
    skippedExistingTerms,
    missingFromOntology,
    shadowDiseasePhenotypeRows
  } = buildShadowRows(
    diseasePhenotypeRows,
    geneDiseaseSupportRows,
    candidatePhenotypes,
    config.targetDiseaseCurie,
    config.targetTerms
  );

  const shadowIndex = buildDxSimilarityIndex({
    ontologyRows,
    diseasePhenotypeRows: shadowDiseasePhenotypeRows,
    genePhenotypeRows,
    geneDiseaseSupportRows
  });

  const baselineDiseaseRanking = rankDiseasesByPhenotypeSimilarity(baselineIndex, {
    phenotypeCuries: input.presentPhenotypeCuries,
    excludedPhenotypeCuries: input.excludedPhenotypeCuries,
    limit: baselineIndex.totalDiseases
  });
  const shadowDiseaseRanking = rankDiseasesByPhenotypeSimilarity(shadowIndex, {
    phenotypeCuries: input.presentPhenotypeCuries,
    excludedPhenotypeCuries: input.excludedPhenotypeCuries,
    limit: shadowIndex.totalDiseases
  });

  const baselineTargetDisease = summarizeDiseaseRow(
    baselineDiseaseRanking.results.find((row) => row.diseaseCurie === config.targetDiseaseCurie) || null
  );
  const shadowTargetDisease = summarizeDiseaseRow(
    shadowDiseaseRanking.results.find((row) => row.diseaseCurie === config.targetDiseaseCurie) || null
  );

  const baselineTruth = baselineAudit.truth;
  const baselineGeneScore = baselineTruth?.normalizedScore || null;
  const baselineDirectGeneScore = baselineTruth?.directNormalizedScore || null;

  const shadowDerivedDiseaseSupportScore = shadowTargetDisease
    ? Number(
        (
          shadowTargetDisease.normalizedScore *
          config.truthSupportWeight *
          shadowTargetDisease.supportEvidenceWeight
        ).toFixed(6)
      )
    : null;

  const inferredShadowGeneScore =
    baselineDirectGeneScore == null || shadowDerivedDiseaseSupportScore == null
      ? null
      : Number(Math.max(baselineDirectGeneScore, shadowDerivedDiseaseSupportScore).toFixed(6));

  const report = {
    createdAt: new Date().toISOString(),
    caseId: path.basename(config.casePath).replace(/\.json$/, ''),
    truthGene: config.truthGene,
    targetDisease: diseaseMeta,
    targetTermsRequested: config.targetTerms,
    currentDirectTerms: existingDirectPresentRows.map((row) => ({
      phenotypeCurie: row.phenotype_curie,
      phenotypeLabel: row.phenotype_label
    })),
    addedShadowTerms: shadowAddedTerms.map((row) => ({
      phenotypeCurie: row.phenotype_curie,
      phenotypeLabel: row.phenotype_label
    })),
    skippedExistingTerms,
    missingFromOntology,
    baselineTruthFromLiveAudit: baselineTruth,
    baselineTargetDisease,
    shadowTargetDisease,
    inferredShadow: {
      assumedTruthSupportWeight: config.truthSupportWeight,
      baselineGeneScore,
      baselineDirectGeneScore,
      shadowDerivedDiseaseSupportScore,
      inferredShadowGeneScore,
      wouldChangeGeneScore:
        inferredShadowGeneScore != null && baselineGeneScore != null
          ? inferredShadowGeneScore !== baselineGeneScore
          : null
    },
    deltas: {
      targetDiseaseRankDelta:
        baselineTargetDisease && shadowTargetDisease ? baselineTargetDisease.rank - shadowTargetDisease.rank : null,
      targetDiseaseNormalizedScoreDelta:
        baselineTargetDisease && shadowTargetDisease
          ? Number((shadowTargetDisease.normalizedScore - baselineTargetDisease.normalizedScore).toFixed(6))
          : null,
      inferredGeneScoreDelta:
        baselineGeneScore != null && inferredShadowGeneScore != null
          ? Number((inferredShadowGeneScore - baselineGeneScore).toFixed(6))
          : null
    }
  };

  await fs.writeFile(config.outputJson, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error('[shadow-stxbp1-discriminating-case] failed:', error);
  process.exit(1);
});
