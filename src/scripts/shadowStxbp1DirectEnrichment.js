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
  selectShardFiles,
  summarizeRun,
  topMoves
} from './lib/shadowBenchmarkUtils.js';

const DEFAULTS = Object.freeze({
  phenopacketDir: '/Users/ahmedelmorshedy/Genovy/output/pheval-official-sample-100/phenopackets',
  benchmarkJson: '/Users/ahmedelmorshedy/Genovy/output/official-benchmark-post-clinvar-run54.json',
  outputJson: '/Users/ahmedelmorshedy/Genovy/output/shadow-stxbp1-direct-enrichment.json',
  outputMd: '/Users/ahmedelmorshedy/Genovy/output/shadow-stxbp1-direct-enrichment.md',
  limit: 100
});

const TARGET_GENE_KEY = 'symbol:STXBP1';
const TARGET_DISEASE_CURIE = 'MONDO:0012812';
const SHADOW_ROW_SOURCE_MODE = 'shadow_stxbp1_direct_enrichment';
const SHADOW_SOURCE_KEY = 'shadow_stxbp1_direct_enrichment';
const SHADOW_REFERENCE_PREFIX = '[shadow STXBP1 direct enrichment]';
const PRESENT_STATUS = 'present';
const DIRECT_EDGE_ORIGIN = 'direct';

const CANDIDATE_TERMS = Object.freeze([
  'HP:0011968', // Feeding difficulties
  'HP:0002019', // Constipation
  'HP:0002020', // Gastroesophageal reflux
  'HP:0000718', // Aggressive behavior
  'HP:0100716', // Self-injurious behavior
  'HP:0003763', // Bruxism
  'HP:0000712', // Emotional lability
  'HP:0002346', // Head tremor
  'HP:0002078', // Truncal ataxia
  'HP:0001332', // Dystonia
  'HP:0100660', // Dyskinesia
  'HP:0007021', // Pain insensitivity
  'HP:0002104', // Apnea
  'HP:0002883', // Hyperventilation
  'HP:0005941', // Intermittent hyperpnea at rest
  'HP:0010055', // Broad hallux
  'HP:0001169', // Broad palm
  'HP:0000253', // Progressive microcephaly
  'HP:0030891' // Periventricular white matter hyperintensities
]);

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

function isTargetCase(truthGeneKeys) {
  return truthGeneKeys.includes(TARGET_GENE_KEY);
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

function buildShadowRows(diseasePhenotypeRows, geneDiseaseSupportRows, candidatePhenotypes) {
  const diseaseMeta = buildTargetDiseaseMeta(diseasePhenotypeRows, geneDiseaseSupportRows);
  const existingDirectPresentRows = diseasePhenotypeRows.filter(
    (row) =>
      row.disease_curie === TARGET_DISEASE_CURIE &&
      (row.presence_status || PRESENT_STATUS) === PRESENT_STATUS &&
      (row.phenotype_edge_origin || DIRECT_EDGE_ORIGIN) === DIRECT_EDGE_ORIGIN
  );
  const existingPhenotypeCuries = new Set(existingDirectPresentRows.map((row) => row.phenotype_curie));
  const candidateByCurie = new Map(candidatePhenotypes.map((row) => [row.canonical_curie, row]));

  const missingFromOntology = CANDIDATE_TERMS.filter((curie) => !candidateByCurie.has(curie));
  const shadowAddedTerms = [];
  const skippedExistingTerms = [];

  for (const candidateCurie of CANDIDATE_TERMS) {
    if (existingPhenotypeCuries.has(candidateCurie)) {
      const existingRow = existingDirectPresentRows.find((row) => row.phenotype_curie === candidateCurie);
      skippedExistingTerms.push({
        phenotype_curie: candidateCurie,
        phenotype_label: existingRow?.phenotype_label || candidateCurie
      });
      continue;
    }

    const phenotype = candidateByCurie.get(candidateCurie);
    if (!phenotype) continue;

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
      reference_text: `${SHADOW_REFERENCE_PREFIX} GeneReviews-informed direct augmentation`,
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

function buildMarkdownReport({
  createdAt,
  baselineSummary,
  shadowSummary,
  deltas,
  targetDisease,
  currentDirectTerms,
  addedTerms,
  skippedExistingTerms,
  missingFromOntology,
  perCase
}) {
  const metadataLines = [
    `Target disease: ${targetDisease.disease_curie} (${targetDisease.disease_label})`,
    `Current direct terms: ${currentDirectTerms.length}`,
    `Added shadow direct terms: ${addedTerms.length}`,
    `Skipped already-present candidates: ${skippedExistingTerms.length}`,
    `Missing candidate curies in ontology/entities: ${missingFromOntology.length}`
  ];
  const header = buildShadowMarkdown({
    title: 'STXBP1 Direct Enrichment Shadow Benchmark',
    createdAt,
    baselineSummary,
    shadowSummary,
    deltas,
    metadataLines
  });

  const sections = [header, '', '## Added Terms', ''];
  if (addedTerms.length) {
    for (const term of addedTerms) {
      sections.push(`- ${term.phenotype_curie} ${term.phenotype_label}`);
    }
  } else {
    sections.push('- None');
  }

  sections.push('', '## Existing Direct Terms', '');
  for (const term of currentDirectTerms) {
    sections.push(`- ${term.phenotype_curie} ${term.phenotype_label}`);
  }

  if (skippedExistingTerms.length) {
    sections.push('', '## Candidate Terms Already Present', '');
    for (const term of skippedExistingTerms) {
      sections.push(`- ${term.phenotype_curie} ${term.phenotype_label}`);
    }
  }

  if (missingFromOntology.length) {
    sections.push('', '## Candidate Curies Missing From Ontology Entities', '');
    for (const curie of missingFromOntology) {
      sections.push(`- ${curie}`);
    }
  }

  sections.push('', '## Per-Case Results', '', '| Case | Baseline | Shadow | Exomiser | Supporting disease (baseline) | Supporting disease (shadow) |', '|---|---:|---:|---:|---|---|');
  for (const row of perCase) {
    sections.push(
      `| ${row.case_id} | ${row.baseline_rank ?? 'miss'} | ${row.shadow_rank ?? 'miss'} | ${row.exomiser_rank ?? 'miss'} | ${row.baseline_supporting_disease_curie || ''} | ${row.shadow_supporting_disease_curie || ''} |`
    );
  }

  return sections.join('\n');
}

async function main() {
  const flags = parseArgs(process.argv.slice(2));
  const config = {
    phenopacketDir: flags['phenopacket-dir'] || DEFAULTS.phenopacketDir,
    benchmarkJson: flags['benchmark-json'] || DEFAULTS.benchmarkJson,
    outputJson: flags['output-json'] || DEFAULTS.outputJson,
    outputMd: flags['output-md'] || DEFAULTS.outputMd,
    limit: Number.parseInt(String(flags.limit || DEFAULTS.limit), 10),
    shardIndex: Number.parseInt(String(flags['shard-index'] ?? 0), 10),
    shardCount: Number.parseInt(String(flags['shard-count'] ?? 1), 10)
  };

  const benchmarkReference = buildBenchmarkReferenceMap(
    JSON.parse(await fs.readFile(config.benchmarkJson, 'utf8'))
  );
  const { ontologyRows, diseasePhenotypeRows, genePhenotypeRows, geneDiseaseSupportRows, candidatePhenotypes } =
    await loadShadowInputs(CANDIDATE_TERMS);

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
  } = buildShadowRows(diseasePhenotypeRows, geneDiseaseSupportRows, candidatePhenotypes);

  const shadowIndex = buildDxSimilarityIndex({
    ontologyRows,
    diseasePhenotypeRows: shadowDiseasePhenotypeRows,
    genePhenotypeRows,
    geneDiseaseSupportRows
  });

  const baselineRanks = {};
  const shadowRanks = {};
  const perCase = [];
  const allPhenopacketFiles = (await fs.readdir(config.phenopacketDir)).filter((name) => name.endsWith('.json')).sort();
  const phenopacketFiles = selectShardFiles(allPhenopacketFiles, config.shardIndex, config.shardCount);

  for (let indexValue = 0; indexValue < phenopacketFiles.length; indexValue += 1) {
    const fileName = phenopacketFiles[indexValue];
    const payload = JSON.parse(await fs.readFile(path.join(config.phenopacketDir, fileName), 'utf8'));
    const phenopacket = payload?.phenopacket || payload;
    const input = extractDxPhenotypeInput({ phenopacket });
    if (validateDxPhenotypeInput(input)) continue;

    const caseId = fileName.replace(/\.json$/, '');
    const truthGeneKeys = extractTruthGeneKeys(phenopacket);
    if (!isTargetCase(truthGeneKeys)) continue;

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

    const baselineRank = findTruthRank(baseline.results, truthGeneKeys);
    const shadowRank = findTruthRank(shadow.results, truthGeneKeys);
    const reference = benchmarkReference.get(caseId) || {};
    const baselineTruthRow =
      baseline.results.find((row) => findTruthRank([row], truthGeneKeys) != null) || null;
    const shadowTruthRow =
      shadow.results.find((row) => findTruthRank([row], truthGeneKeys) != null) || null;

    baselineRanks[caseId] = baselineRank;
    shadowRanks[caseId] = shadowRank;
    perCase.push({
      case_id: caseId,
      truth_gene_keys: truthGeneKeys,
      baseline_rank: baselineRank,
      shadow_rank: shadowRank,
      exomiser_rank: reference.exomiser_rank ?? null,
      reference_current_genovy_rank: reference.current_genovy_rank ?? null,
      baseline_supporting_disease_curie: baselineTruthRow?.supportingDiseaseCurie || '',
      baseline_supporting_disease_label: baselineTruthRow?.supportingDiseaseLabel || '',
      shadow_supporting_disease_curie: shadowTruthRow?.supportingDiseaseCurie || '',
      shadow_supporting_disease_label: shadowTruthRow?.supportingDiseaseLabel || ''
    });

    console.log(
      `[${indexValue + 1}/${phenopacketFiles.length}] ${fileName} baseline=${baselineRank ?? 'miss'} shadow=${shadowRank ?? 'miss'}`
    );
  }

  perCase.sort((left, right) => left.case_id.localeCompare(right.case_id));

  const baselineSummary = summarizeRun(baselineRanks);
  const shadowSummary = summarizeRun(shadowRanks);
  const deltas = compareBaselineVsShadow(perCase);
  const createdAt = new Date().toISOString();

  const report = {
    created_at: createdAt,
    target_gene_key: TARGET_GENE_KEY,
    target_disease: diseaseMeta,
    benchmark_json: config.benchmarkJson,
    candidate_terms_requested: CANDIDATE_TERMS,
    current_direct_terms: existingDirectPresentRows
      .map((row) => ({ phenotype_curie: row.phenotype_curie, phenotype_label: row.phenotype_label }))
      .sort((left, right) => left.phenotype_label.localeCompare(right.phenotype_label)),
    added_shadow_terms: shadowAddedTerms
      .map((row) => ({ phenotype_curie: row.phenotype_curie, phenotype_label: row.phenotype_label }))
      .sort((left, right) => left.phenotype_label.localeCompare(right.phenotype_label)),
    skipped_existing_terms: skippedExistingTerms.sort((left, right) =>
      left.phenotype_label.localeCompare(right.phenotype_label)
    ),
    missing_candidate_terms: missingFromOntology,
    baseline_summary: baselineSummary,
    shadow_summary: shadowSummary,
    deltas,
    top_improvements: topMoves(perCase, 'improved', 10),
    top_regressions: topMoves(perCase, 'worsened', 10),
    per_case: perCase
  };

  await fs.writeFile(config.outputJson, `${JSON.stringify(report, null, 2)}\n`);
  await fs.writeFile(
    config.outputMd,
    `${buildMarkdownReport({
      createdAt,
      baselineSummary,
      shadowSummary,
      deltas,
      targetDisease: diseaseMeta,
      currentDirectTerms: report.current_direct_terms,
      addedTerms: report.added_shadow_terms,
      skippedExistingTerms: report.skipped_existing_terms,
      missingFromOntology,
      perCase
    })}\n`
  );

  console.log(
    JSON.stringify(
      {
        outputJson: config.outputJson,
        outputMd: config.outputMd,
        baselineSummary,
        shadowSummary,
        deltas,
        addedTermCount: shadowAddedTerms.length,
        skippedExistingTermCount: skippedExistingTerms.length,
        missingCandidateTermCount: missingFromOntology.length
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error('[shadow-stxbp1-direct-enrichment] failed:', error);
  process.exit(1);
});
