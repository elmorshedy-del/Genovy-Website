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
  compareBaselineVsShadow,
  extractTruthGeneKeys,
  findTruthRank,
  summarizeRun
} from './lib/shadowBenchmarkUtils.js';

const DEFAULTS = Object.freeze({
  phenopacketDir:
    '/Users/ahmedelmorshedy/Genovy-phenotype-enrichment-20260316-0914/preservation/original-output-snapshot-20260326/pheval-official-sample-100/phenopackets',
  outputJson:
    '/Users/ahmedelmorshedy/Genovy-phenotype-enrichment-20260316-0914/output/shadow-ankrd11-symmetric-source-terms-20260326.json',
  outputMd:
    '/Users/ahmedelmorshedy/Genovy-phenotype-enrichment-20260316-0914/output/shadow-ankrd11-symmetric-source-terms-20260326.md',
  limit: 2000
});

const TARGET_CASES = Object.freeze(['PMID_36446582_Goldenberg2016_P13.json', 'PMID_36446582_Miyatake2017_P1.json']);
const PRESENT_STATUS = 'present';
const DIRECT_EDGE_ORIGIN = 'direct';

const SCENARIOS = Object.freeze([
  {
    id: 'strict_literal_source',
    label: 'Strict Literal Source Terms',
    description:
      'Only add exact terms that the source literature/curation explicitly supports and that are currently absent from the live direct profile.',
    sourceNote:
      'KBG syndrome gains brachydactyly plus focal-onset seizure; familial temporal lobe epilepsy 8 gains focal-onset seizure.',
    diseaseTerms: {
      'MONDO:0007846': ['HP:0001156', 'HP:0007359'],
      'MONDO:0014650': ['HP:0007359']
    }
  },
  {
    id: 'symmetric_parent_promotion',
    label: 'Symmetric Parent Promotion',
    description:
      'Start from the strict literal-source set, then symmetrically add the parent hand term where both diseases already carry multiple direct hand-specific anomalies.',
    sourceNote:
      'Adds Abnormality of the hand to both KBG syndrome and brachydactyly type A1 as a symmetric parent promotion over existing direct hand-specific terms.',
    diseaseTerms: {
      'MONDO:0007846': ['HP:0001156', 'HP:0007359', 'HP:0001155'],
      'MONDO:0014650': ['HP:0007359'],
      'MONDO:0007215': ['HP:0001155']
    }
  }
]);

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

function flattenUniqueTerms(scenarios) {
  return [...new Set(scenarios.flatMap((scenario) => Object.values(scenario.diseaseTerms).flat()))].sort();
}

function buildBenchmarkRows(results, truthGeneKeys) {
  const truthRank = findTruthRank(results, truthGeneKeys);
  const truthRow = truthRank == null ? null : results.find((row) => row.rank === truthRank) || null;
  return {
    top1: summarizeGeneRow(results[0] || null),
    truth: summarizeGeneRow(truthRow)
  };
}

function summarizeGeneRow(row) {
  if (!row) return null;
  return {
    rank: row.rank,
    geneCurie: row.geneCurie,
    geneLabel: row.geneLabel,
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

function buildDiseaseMetaIndex(diseasePhenotypeRows, geneDiseaseSupportRows) {
  const index = new Map();

  for (const row of [...diseasePhenotypeRows, ...geneDiseaseSupportRows]) {
    if (!row?.disease_curie || index.has(row.disease_curie)) continue;
    index.set(row.disease_curie, {
      disease_entity_id: Number(row.disease_entity_id),
      disease_curie: row.disease_curie,
      disease_label: row.disease_label || row.disease_curie
    });
  }

  return index;
}

function buildScenarioShadowRows({
  scenario,
  diseasePhenotypeRows,
  diseaseMetaIndex,
  candidatePhenotypes
}) {
  const candidateByCurie = new Map(candidatePhenotypes.map((row) => [row.canonical_curie, row]));
  const shadowAddedTerms = [];
  const skippedExistingTerms = [];
  const missingFromOntology = [];

  for (const [diseaseCurie, targetTerms] of Object.entries(scenario.diseaseTerms)) {
    const diseaseMeta = diseaseMetaIndex.get(diseaseCurie);
    if (!diseaseMeta) {
      throw new Error(`Unable to resolve target disease metadata for ${diseaseCurie}.`);
    }

    const existingDirectPresentRows = diseasePhenotypeRows.filter(
      (row) =>
        row.disease_curie === diseaseCurie &&
        (row.presence_status || PRESENT_STATUS) === PRESENT_STATUS &&
        (row.phenotype_edge_origin || DIRECT_EDGE_ORIGIN) === DIRECT_EDGE_ORIGIN
    );
    const existingPhenotypeCuries = new Set(existingDirectPresentRows.map((row) => row.phenotype_curie));

    for (const candidateCurie of targetTerms) {
      if (existingPhenotypeCuries.has(candidateCurie)) {
        const existingRow = existingDirectPresentRows.find((row) => row.phenotype_curie === candidateCurie);
        skippedExistingTerms.push({
          diseaseCurie,
          diseaseLabel: diseaseMeta.disease_label,
          phenotypeCurie: candidateCurie,
          phenotypeLabel: existingRow?.phenotype_label || candidateCurie
        });
        continue;
      }

      const phenotype = candidateByCurie.get(candidateCurie);
      if (!phenotype) {
        missingFromOntology.push({
          diseaseCurie,
          diseaseLabel: diseaseMeta.disease_label,
          phenotypeCurie: candidateCurie
        });
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
        source_key: `shadow_${scenario.id}`,
        source_record_key: `shadow_${scenario.id}:${diseaseMeta.disease_curie}:${phenotype.canonical_curie}`,
        phenotype_edge_origin: DIRECT_EDGE_ORIGIN,
        reference_text: `[shadow ${scenario.id}] symmetric source-backed augmentation`,
        evidence_code: '',
        onset_curie: '',
        onset_label: '',
        frequency_curie: '',
        frequency_label: '',
        modifier_curie: '',
        modifier_label: '',
        sex: '',
        aspect: '',
        row_source_mode: `shadow_${scenario.id}`
      });
    }
  }

  return {
    shadowAddedTerms,
    skippedExistingTerms,
    missingFromOntology,
    shadowDiseasePhenotypeRows: [...diseasePhenotypeRows, ...shadowAddedTerms]
  };
}

function buildScenarioMarkdown(report) {
  const lines = [
    '# ANKRD11 Symmetric Source Shadow',
    '',
    `Created: ${report.createdAt}`,
    '',
    '## Scenarios',
    ''
  ];

  for (const scenario of report.scenarios) {
    lines.push(`### ${scenario.label}`);
    lines.push('');
    lines.push(scenario.description);
    lines.push('');
    lines.push(`Added terms: ${scenario.shadowAddedTerms.length}`);
    lines.push(`Skipped existing: ${scenario.skippedExistingTerms.length}`);
    lines.push(`Missing from ontology: ${scenario.missingFromOntology.length}`);
    lines.push(`Found: ${scenario.baselineSummary.found_pct}% -> ${scenario.shadowSummary.found_pct}%`);
    lines.push(`Top-1: ${scenario.baselineSummary.top1_pct}% -> ${scenario.shadowSummary.top1_pct}%`);
    lines.push(`MRR: ${scenario.baselineSummary.mrr} -> ${scenario.shadowSummary.mrr}`);
    lines.push('');

    for (const row of scenario.perCase) {
      lines.push(`- ${row.case_id}: truth ${row.baseline_rank ?? 'miss'} -> ${row.shadow_rank ?? 'miss'}; top1 ${row.baseline_top1?.geneLabel ?? 'n/a'} -> ${row.shadow_top1?.geneLabel ?? 'n/a'}`);
    }

    lines.push('');
  }

  return lines.join('\n');
}

async function main() {
  const flags = parseArgs(process.argv.slice(2));
  const config = {
    phenopacketDir: flags['phenopacket-dir'] || DEFAULTS.phenopacketDir,
    outputJson: flags['output-json'] || DEFAULTS.outputJson,
    outputMd: flags['output-md'] || DEFAULTS.outputMd,
    limit: Number.parseInt(String(flags.limit || DEFAULTS.limit), 10)
  };

  const candidateTermCuries = flattenUniqueTerms(SCENARIOS);
  const { ontologyRows, diseasePhenotypeRows, genePhenotypeRows, geneDiseaseSupportRows, candidatePhenotypes } =
    await loadShadowInputs(candidateTermCuries);

  const diseaseMetaIndex = buildDiseaseMetaIndex(diseasePhenotypeRows, geneDiseaseSupportRows);
  const baselineIndex = buildDxSimilarityIndex({
    ontologyRows,
    diseasePhenotypeRows,
    genePhenotypeRows,
    geneDiseaseSupportRows
  });

  const cases = [];
  for (const fileName of TARGET_CASES) {
    const casePath = path.join(config.phenopacketDir, fileName);
    const payload = JSON.parse(await fs.readFile(casePath, 'utf8'));
    const phenopacket = payload?.phenopacket || payload;
    const input = extractDxPhenotypeInput({ phenopacket });
    const validationError = validateDxPhenotypeInput(input);
    if (validationError) {
      throw new Error(`${fileName}: ${validationError}`);
    }

    const truthGeneKeys = extractTruthGeneKeys(phenopacket);
    const baselineRanking = rankGenesByPhenotypeSimilarity(baselineIndex, {
      phenotypeCuries: input.presentPhenotypeCuries,
      excludedPhenotypeCuries: input.excludedPhenotypeCuries,
      limit: config.limit
    });

    cases.push({
      caseId: fileName.replace(/\.json$/, ''),
      input,
      truthGeneKeys,
      baselineRows: buildBenchmarkRows(baselineRanking.results, truthGeneKeys)
    });
  }

  const scenarios = [];
  for (const scenario of SCENARIOS) {
    const scenarioShadow = buildScenarioShadowRows({
      scenario,
      diseasePhenotypeRows,
      diseaseMetaIndex,
      candidatePhenotypes
    });

    const shadowIndex = buildDxSimilarityIndex({
      ontologyRows,
      diseasePhenotypeRows: scenarioShadow.shadowDiseasePhenotypeRows,
      genePhenotypeRows,
      geneDiseaseSupportRows
    });

    const perCase = [];
    const baselineRanks = {};
    const shadowRanks = {};

    for (const row of cases) {
      const shadowRanking = rankGenesByPhenotypeSimilarity(shadowIndex, {
        phenotypeCuries: row.input.presentPhenotypeCuries,
        excludedPhenotypeCuries: row.input.excludedPhenotypeCuries,
        limit: config.limit
      });
      const shadowRows = buildBenchmarkRows(shadowRanking.results, row.truthGeneKeys);
      const baselineRank = row.baselineRows.truth?.rank ?? null;
      const shadowRank = shadowRows.truth?.rank ?? null;

      baselineRanks[row.caseId] = baselineRank;
      shadowRanks[row.caseId] = shadowRank;

      perCase.push({
        case_id: row.caseId,
        truth_gene_keys: row.truthGeneKeys,
        baseline_rank: baselineRank,
        shadow_rank: shadowRank,
        baseline_top1: row.baselineRows.top1,
        baseline_truth: row.baselineRows.truth,
        shadow_top1: shadowRows.top1,
        shadow_truth: shadowRows.truth
      });
    }

    scenarios.push({
      id: scenario.id,
      label: scenario.label,
      description: scenario.description,
      sourceNote: scenario.sourceNote,
      requestedDiseaseTerms: scenario.diseaseTerms,
      shadowAddedTerms: scenarioShadow.shadowAddedTerms,
      skippedExistingTerms: scenarioShadow.skippedExistingTerms,
      missingFromOntology: scenarioShadow.missingFromOntology,
      perCase,
      baselineSummary: summarizeRun(baselineRanks),
      shadowSummary: summarizeRun(shadowRanks),
      deltas: compareBaselineVsShadow(perCase)
    });
  }

  const report = {
    createdAt: new Date().toISOString(),
    targetCases: TARGET_CASES.map((fileName) => fileName.replace(/\.json$/, '')),
    scenarios
  };

  await fs.mkdir(path.dirname(config.outputJson), { recursive: true });
  await fs.writeFile(config.outputJson, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await fs.writeFile(config.outputMd, `${buildScenarioMarkdown(report)}\n`, 'utf8');
  console.log(`Wrote ${config.outputJson}`);
  console.log(`Wrote ${config.outputMd}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
