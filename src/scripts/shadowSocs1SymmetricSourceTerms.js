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
    '/Users/ahmedelmorshedy/Genovy-phenotype-enrichment-20260316-0914/output/shadow-socs1-symmetric-source-terms-20260326.json',
  outputMd:
    '/Users/ahmedelmorshedy/Genovy-phenotype-enrichment-20260316-0914/output/shadow-socs1-symmetric-source-terms-20260326.md',
  limit: 2000
});

const TARGET_CASES = Object.freeze(['PMID_37156989_P1.json']);
const PRESENT_STATUS = 'present';
const DIRECT_EDGE_ORIGIN = 'direct';

const SCENARIOS = Object.freeze([
  {
    id: 'omim_literal_socs1_ctla4',
    label: 'OMIM Literal Terms',
    description:
      'Add the narrow exact source-backed disease terms supported by OMIM and the core syndrome papers for SOCS1 and CTLA4, without borrowing packet terms that the sources do not literally support.',
    sourceNote:
      'SOCS1 gains autoimmunity, otitis media, chronic colitis, and eczematoid dermatitis from OMIM 619375 and the Lee et al. 2020 case series cited there. CTLA4 gains the missing literal autoimmunity term from OMIM 616100; its Crohn, psoriasiform dermatitis, and eczema-family terms are already present.',
    diseaseTerms: {
      'MONDO:0800130': [
        { curie: 'HP:0002960', referenceText: 'OMIM:619375' },
        { curie: 'HP:0000388', referenceText: 'OMIM:619375 / Lee et al. 2020' },
        { curie: 'HP:0100281', referenceText: 'OMIM:619375' },
        { curie: 'HP:0000964', referenceText: 'OMIM:619375' }
      ],
      'MONDO:0014493': [{ curie: 'HP:0002960', referenceText: 'OMIM:616100' }]
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
  return [
    ...new Set(
      scenarios.flatMap((scenario) =>
        Object.values(scenario.diseaseTerms).flatMap((terms) => terms.map((term) => term.curie))
      )
    )
  ].sort();
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
    supportingDiseaseEvidenceWeight: row.supportingDiseaseEvidenceWeight,
    matchedPhenotypeCount: row.matchedPhenotypeCount
  };
}

function buildBenchmarkRows(results, truthGeneKeys) {
  const truthRank = findTruthRank(results, truthGeneKeys);
  const truthRow = truthRank == null ? null : results.find((row) => row.rank === truthRank) || null;
  return {
    top1: summarizeGeneRow(results[0] || null),
    truth: summarizeGeneRow(truthRow)
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

function buildScenarioShadowRows({ scenario, diseasePhenotypeRows, diseaseMetaIndex, candidatePhenotypes }) {
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

    for (const targetTerm of targetTerms) {
      if (existingPhenotypeCuries.has(targetTerm.curie)) {
        const existingRow = existingDirectPresentRows.find((row) => row.phenotype_curie === targetTerm.curie);
        skippedExistingTerms.push({
          diseaseCurie,
          diseaseLabel: diseaseMeta.disease_label,
          phenotypeCurie: targetTerm.curie,
          phenotypeLabel: existingRow?.phenotype_label || targetTerm.curie
        });
        continue;
      }

      const phenotype = candidateByCurie.get(targetTerm.curie);
      if (!phenotype) {
        missingFromOntology.push({
          diseaseCurie,
          diseaseLabel: diseaseMeta.disease_label,
          phenotypeCurie: targetTerm.curie
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
        reference_text: targetTerm.referenceText,
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

  return { shadowAddedTerms, skippedExistingTerms, missingFromOntology };
}

async function loadCasePacket(phenopacketDir, fileName) {
  const raw = await fs.readFile(path.join(phenopacketDir, fileName), 'utf8');
  const payload = JSON.parse(raw);
  const phenopacket = payload?.phenopacket || payload;
  const input = extractDxPhenotypeInput({ phenopacket });
  const validationError = validateDxPhenotypeInput(input);
  if (validationError) {
    throw new Error(`Invalid phenopacket ${fileName}: ${validationError}`);
  }
  return {
    caseId: fileName.replace(/\.json$/, ''),
    truthGeneKeys: extractTruthGeneKeys(phenopacket),
    phenotypeCuries: input.presentPhenotypeCuries,
    excludedPhenotypeCuries: input.excludedPhenotypeCuries
  };
}

function renderMarkdownReport(report) {
  const lines = [];
  lines.push('# SOCS1 Symmetric Source Shadow');
  lines.push('');
  lines.push(`Created: ${report.createdAt}`);
  lines.push('');
  lines.push('## Scenarios');
  lines.push('');

  for (const scenario of report.scenarios) {
    lines.push(`### ${scenario.label}`);
    lines.push('');
    lines.push(scenario.description);
    lines.push('');
    lines.push(`Added terms: ${scenario.shadowAddedTerms.length}`);
    lines.push(`Skipped existing: ${scenario.skippedExistingTerms.length}`);
    lines.push(`Missing from ontology: ${scenario.missingFromOntology.length}`);
    lines.push(
      `Found: ${scenario.baselineSummary.found_pct}% -> ${scenario.shadowSummary.found_pct}%`
    );
    lines.push(
      `Top-1: ${scenario.baselineSummary.top1_pct}% -> ${scenario.shadowSummary.top1_pct}%`
    );
    lines.push(`MRR: ${scenario.baselineSummary.mrr ?? 'NaN'} -> ${scenario.shadowSummary.mrr ?? 'NaN'}`);
    lines.push('');

    for (const caseResult of scenario.perCase) {
      lines.push(
        `- ${caseResult.case_id}: truth ${caseResult.baseline_rank ?? 'miss'} -> ${caseResult.shadow_rank ?? 'miss'}; top1 ${caseResult.baseline_top1?.geneLabel ?? 'n/a'} -> ${caseResult.shadow_top1?.geneLabel ?? 'n/a'}`
      );
    }

    lines.push('');
  }

  return `${lines.join('\n')}\n`;
}

async function main() {
  const flags = parseArgs(process.argv.slice(2));
  const phenopacketDir = flags['phenopacket-dir'] || DEFAULTS.phenopacketDir;
  const outputJson = flags['output-json'] || DEFAULTS.outputJson;
  const outputMd = flags['output-md'] || DEFAULTS.outputMd;
  const limit = Number.parseInt(flags.limit || `${DEFAULTS.limit}`, 10);

  const targetCases = await Promise.all(TARGET_CASES.map((fileName) => loadCasePacket(phenopacketDir, fileName)));

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

  const scenarios = [];

  for (const scenario of SCENARIOS) {
    const { shadowAddedTerms, skippedExistingTerms, missingFromOntology } = buildScenarioShadowRows({
      scenario,
      diseasePhenotypeRows,
      diseaseMetaIndex,
      candidatePhenotypes
    });
    const shadowDiseasePhenotypeRows = [...diseasePhenotypeRows, ...shadowAddedTerms];
    const shadowIndex = buildDxSimilarityIndex({
      ontologyRows,
      diseasePhenotypeRows: shadowDiseasePhenotypeRows,
      genePhenotypeRows,
      geneDiseaseSupportRows
    });

    const baselineRuns = [];
    const shadowRuns = [];
    const perCase = [];

    for (const targetCase of targetCases) {
      const baselineResults = rankGenesByPhenotypeSimilarity(baselineIndex, {
        phenotypeCuries: targetCase.phenotypeCuries,
        excludedPhenotypeCuries: targetCase.excludedPhenotypeCuries,
        limit
      }).results;
      const shadowResults = rankGenesByPhenotypeSimilarity(shadowIndex, {
        phenotypeCuries: targetCase.phenotypeCuries,
        excludedPhenotypeCuries: targetCase.excludedPhenotypeCuries,
        limit
      }).results;

      baselineRuns.push({
        case_id: targetCase.caseId,
        truth_rank: findTruthRank(baselineResults, targetCase.truthGeneKeys)
      });
      shadowRuns.push({
        case_id: targetCase.caseId,
        truth_rank: findTruthRank(shadowResults, targetCase.truthGeneKeys)
      });

      const baselineRows = buildBenchmarkRows(baselineResults, targetCase.truthGeneKeys);
      const shadowRows = buildBenchmarkRows(shadowResults, targetCase.truthGeneKeys);

      perCase.push({
        case_id: targetCase.caseId,
        baseline_rank: baselineRows.truth?.rank ?? null,
        shadow_rank: shadowRows.truth?.rank ?? null,
        baseline_top1: baselineRows.top1,
        shadow_top1: shadowRows.top1,
        baseline_truth: baselineRows.truth,
        shadow_truth: shadowRows.truth
      });
    }

    scenarios.push({
      id: scenario.id,
      label: scenario.label,
      description: scenario.description,
      sourceNote: scenario.sourceNote,
      shadowAddedTerms,
      skippedExistingTerms,
      missingFromOntology,
      baselineSummary: summarizeRun(baselineRuns),
      shadowSummary: summarizeRun(shadowRuns),
      comparison: compareBaselineVsShadow(baselineRuns, shadowRuns),
      perCase
    });
  }

  const report = {
    createdAt: new Date().toISOString(),
    scenarios
  };

  await fs.mkdir(path.dirname(outputJson), { recursive: true });
  await fs.writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await fs.writeFile(outputMd, renderMarkdownReport(report), 'utf8');

  console.log(JSON.stringify({ outputJson, outputMd }, null, 2));
}

await main();
