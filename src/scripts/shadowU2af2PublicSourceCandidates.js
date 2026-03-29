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
import { buildDxSimilarityIndex, rankGenesByPhenotypeSimilarity } from '../services/dx/similarityEngine.js';
import {
  buildShadowMarkdown,
  compareBaselineVsShadow,
  extractTruthGeneKeys,
  findTruthRank,
  parseArgs,
  summarizeRun
} from './lib/shadowBenchmarkUtils.js';

const DEFAULTS = Object.freeze({
  phenopacketDir: '/Users/ahmedelmorshedy/Genovy/output/pheval-official-sample-100/phenopackets',
  benchmarkJson: '/Users/ahmedelmorshedy/Genovy/output/handoff-floor-1.0.json',
  outputJson: '/Users/ahmedelmorshedy/Genovy/output/shadow-u2af2-public-source-candidates-20260326.json',
  outputMd: '/Users/ahmedelmorshedy/Genovy/output/shadow-u2af2-public-source-candidates-20260326.md',
  limit: 2000
});

const TARGET_CASES = Object.freeze(['PMID_36747105_proband.json', 'PMID_37962958_43.json']);
const TARGET_GENE_KEY = 'symbol:U2AF2';
const TARGET_DISEASE_CURIE = 'MONDO:0957810';
const PRESENT_STATUS = 'present';
const DIRECT_EDGE_ORIGIN = 'direct';
const SHADOW_SOURCE_KEY = 'shadow_u2af2_public_source_candidates';
const SHADOW_ROW_SOURCE_MODE = 'shadow_u2af2_public_source_candidates';
const SHADOW_REFERENCE_PREFIX = '[shadow U2AF2 public-source candidates]';
const TARGET_TERMS = Object.freeze([
  'HP:0001249', // Intellectual disability
  'HP:0000750', // Delayed speech and language development
  'HP:0010862', // Delayed fine motor development
  'HP:0031936', // Delayed ability to walk
  'HP:0002069', // Bilateral tonic-clonic seizure
  'HP:0000739', // Anxiety
  'HP:0008770', // Obsessive-compulsive trait
  'HP:0030084', // Clinodactyly
  'HP:0012745', // Short palpebral fissure
  'HP:0000316', // Hypertelorism
  'HP:0001488', // Bilateral ptosis
  'HP:0007687', // Unilateral ptosis
  'HP:0000470', // Short neck
  'HP:0000365' // Hearing impairment
]);

function parseList(value, fallback) {
  if (!value) return fallback;
  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildBenchmarkReferenceMap(report) {
  if (!report?.per_case || !Array.isArray(report.per_case)) {
    return new Map();
  }
  return new Map(
    report.per_case.map((row) => [
      row.case_id,
      {
        current_genovy_rank: row.genovy_rank ?? null,
        exomiser_rank: row.exomiser_rank ?? null
      }
    ])
  );
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

function buildTargetDiseaseMeta(diseasePhenotypeRows, geneDiseaseSupportRows) {
  const diseaseRow =
    diseasePhenotypeRows.find((row) => row.disease_curie === TARGET_DISEASE_CURIE) ||
    geneDiseaseSupportRows.find((row) => row.disease_curie === TARGET_DISEASE_CURIE);

  if (!diseaseRow) {
    throw new Error(`Unable to resolve target disease metadata for ${TARGET_DISEASE_CURIE}.`);
  }

  return {
    disease_entity_id: Number(diseaseRow.disease_entity_id),
    disease_curie: TARGET_DISEASE_CURIE,
    disease_label: diseaseRow.disease_label || TARGET_DISEASE_CURIE
  };
}

function buildShadowRows(diseasePhenotypeRows, geneDiseaseSupportRows, candidatePhenotypes, targetTermCuries) {
  const diseaseMeta = buildTargetDiseaseMeta(diseasePhenotypeRows, geneDiseaseSupportRows);
  const existingDirectPresentRows = diseasePhenotypeRows.filter(
    (row) =>
      row.disease_curie === TARGET_DISEASE_CURIE &&
      (row.presence_status || PRESENT_STATUS) === PRESENT_STATUS &&
      (row.phenotype_edge_origin || DIRECT_EDGE_ORIGIN) === DIRECT_EDGE_ORIGIN
  );
  const existingPhenotypeCuries = new Set(existingDirectPresentRows.map((row) => row.phenotype_curie));
  const candidateByCurie = new Map(candidatePhenotypes.map((row) => [row.canonical_curie, row]));

  const shadowAddedTerms = [];
  const skippedExistingTerms = [];
  const missingFromOntology = [];

  for (const candidateCurie of targetTermCuries) {
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
      source_record_key: `${SHADOW_SOURCE_KEY}:${TARGET_DISEASE_CURIE}:${phenotype.canonical_curie}`,
      phenotype_edge_origin: DIRECT_EDGE_ORIGIN,
      reference_text: `${SHADOW_REFERENCE_PREFIX} public-source-backed candidate augmentation`,
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

function summarizeTruthRow(row) {
  if (!row) return null;
  return {
    geneCurie: row.geneCurie,
    geneLabel: row.geneLabel,
    rank: row.rank,
    normalizedScore: row.normalizedScore,
    directNormalizedScore: row.directNormalizedScore,
    diseaseSupportScore: row.diseaseSupportScore,
    supportingDiseaseCurie: row.supportingDiseaseCurie,
    supportingDiseaseLabel: row.supportingDiseaseLabel,
    supportingDiseaseClassification: row.supportingDiseaseClassification,
    supportingDiseaseEvidenceWeight: row.supportingDiseaseEvidenceWeight,
    supportingDiseaseDirectPhenotypeCount: row.supportingDiseaseDirectPhenotypeCount,
    supportingDiseasePropagatedPhenotypeCount: row.supportingDiseasePropagatedPhenotypeCount,
    matchedPhenotypeCount: row.matchedPhenotypeCount
  };
}

function findTruthRow(rows, truthGeneKeys) {
  const rank = findTruthRank(rows, truthGeneKeys);
  if (rank == null) return null;
  return rows.find((row) => row.rank === rank) || null;
}

async function main() {
  const flags = parseArgs(process.argv.slice(2));
  const config = {
    phenopacketDir: flags['phenopacket-dir'] || DEFAULTS.phenopacketDir,
    benchmarkJson: flags['benchmark-json'] || DEFAULTS.benchmarkJson,
    outputJson: flags['output-json'] || DEFAULTS.outputJson,
    outputMd: flags['output-md'] || DEFAULTS.outputMd,
    limit: Number.parseInt(String(flags.limit || DEFAULTS.limit), 10),
    targetTerms: parseList(flags['target-terms'], TARGET_TERMS)
  };

  const benchmarkReference = buildBenchmarkReferenceMap(
    JSON.parse(await fs.readFile(config.benchmarkJson, 'utf8'))
  );
  const { ontologyRows, diseasePhenotypeRows, genePhenotypeRows, geneDiseaseSupportRows, candidatePhenotypes } =
    await loadShadowInputs(config.targetTerms);

  const baselineIndex = buildDxSimilarityIndex({
    ontologyRows,
    diseasePhenotypeRows,
    genePhenotypeRows,
    geneDiseaseSupportRows
  });

  const {
    shadowAddedTerms,
    skippedExistingTerms,
    missingFromOntology,
    shadowDiseasePhenotypeRows
  } = buildShadowRows(diseasePhenotypeRows, geneDiseaseSupportRows, candidatePhenotypes, config.targetTerms);

  const shadowIndex = buildDxSimilarityIndex({
    ontologyRows,
    diseasePhenotypeRows: shadowDiseasePhenotypeRows,
    genePhenotypeRows,
    geneDiseaseSupportRows
  });

  const baselineRanks = {};
  const shadowRanks = {};
  const perCase = [];

  for (const fileName of TARGET_CASES) {
    const payload = JSON.parse(await fs.readFile(path.join(config.phenopacketDir, fileName), 'utf8'));
    const phenopacket = payload?.phenopacket || payload;
    const input = extractDxPhenotypeInput({ phenopacket });
    const validationError = validateDxPhenotypeInput(input);
    if (validationError) {
      throw new Error(`Invalid phenopacket ${fileName}: ${validationError}`);
    }

    const caseId = fileName.replace(/\.json$/, '');
    const truthGeneKeys = extractTruthGeneKeys(phenopacket);
    if (!truthGeneKeys.includes(TARGET_GENE_KEY)) {
      throw new Error(`Target case ${caseId} does not resolve to ${TARGET_GENE_KEY}.`);
    }

    const baseline = rankGenesByPhenotypeSimilarity(baselineIndex, {
      phenotypeCuries: input.presentPhenotypeCuries,
      excludedPhenotypeCuries: input.excludedPhenotypeCuries,
      limit: config.limit
    });
    const shadow = rankGenesByPhenotypeSimilarity(shadowIndex, {
      phenotypeCuries: input.presentPhenotypeCuries,
      excludedPhenotypeCuries: input.excludedPhenotypeCuries,
      limit: config.limit
    });

    baselineRanks[caseId] = findTruthRank(baseline.results, truthGeneKeys);
    shadowRanks[caseId] = findTruthRank(shadow.results, truthGeneKeys);

    const reference = benchmarkReference.get(caseId) || {};
    perCase.push({
      case_id: caseId,
      truth_gene_keys: truthGeneKeys,
      baseline_rank: baselineRanks[caseId],
      shadow_rank: shadowRanks[caseId],
      exomiser_rank: reference.exomiser_rank ?? null,
      reference_current_genovy_rank: reference.current_genovy_rank ?? null,
      baseline_truth_row: summarizeTruthRow(findTruthRow(baseline.results, truthGeneKeys)),
      shadow_truth_row: summarizeTruthRow(findTruthRow(shadow.results, truthGeneKeys))
    });

    console.log(
      `${caseId} baseline=${baselineRanks[caseId] ?? 'miss'} shadow=${shadowRanks[caseId] ?? 'miss'}`
    );
  }

  const baselineSummary = summarizeRun(baselineRanks);
  const shadowSummary = summarizeRun(shadowRanks);
  const deltas = compareBaselineVsShadow(perCase);
  const metadataLines = [
    `Target gene: ${TARGET_GENE_KEY}`,
    `Target disease: ${TARGET_DISEASE_CURIE}`,
    `Candidate terms requested: ${config.targetTerms.length}`,
    `Shadow terms added: ${shadowAddedTerms.length}`,
    `Skipped existing terms: ${skippedExistingTerms.length}`,
    `Missing from ontology: ${missingFromOntology.length}`
  ];

  const report = {
    created_at: new Date().toISOString(),
    benchmark_reference_json: config.benchmarkJson,
    target_gene_key: TARGET_GENE_KEY,
    target_disease_curie: TARGET_DISEASE_CURIE,
    target_case_files: TARGET_CASES,
    target_terms: config.targetTerms,
    shadow_added_terms: shadowAddedTerms.map((row) => ({
      phenotype_curie: row.phenotype_curie,
      phenotype_label: row.phenotype_label
    })),
    skipped_existing_terms: skippedExistingTerms,
    missing_from_ontology: missingFromOntology,
    baseline_summary: baselineSummary,
    shadow_summary: shadowSummary,
    delta_vs_baseline: deltas,
    per_case: perCase
  };

  await fs.mkdir(path.dirname(config.outputJson), { recursive: true });
  await fs.writeFile(config.outputJson, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await fs.writeFile(
    config.outputMd,
    `${buildShadowMarkdown({
      title: 'U2AF2 Public-Source Candidate Shadow',
      createdAt: report.created_at,
      baselineSummary,
      shadowSummary,
      deltas,
      metadataLines
    })}\n`,
    'utf8'
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
