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
import { extractTruthGeneKeys, findTruthRank } from './lib/shadowBenchmarkUtils.js';

const DEFAULTS = Object.freeze({
  phenopacketDir:
    '/Users/ahmedelmorshedy/Genovy-phenotype-enrichment-20260316-0914/preservation/original-output-snapshot-20260326/pheval-official-sample-100/phenopackets',
  outputJson:
    '/Users/ahmedelmorshedy/Genovy-phenotype-enrichment-20260316-0914/output/shadow-rere-behavior-diagnostic-20260326.json',
  outputMd:
    '/Users/ahmedelmorshedy/Genovy-phenotype-enrichment-20260316-0914/output/shadow-rere-behavior-diagnostic-20260326.md',
  limit: 2000
});

const CASE_FILE = 'PMID_29330883_Subject9.json';
const RERE_DISEASE = 'MONDO:0014857';
const MED13_DISEASE = 'MONDO:0032485';
const ADHD = 'HP:0007018';
const COMPULSIVE = 'HP:0000722';

const SCENARIOS = Object.freeze([
  {
    id: 'remove_med13_adhd_only',
    label: 'Remove Wrong-Side ADHD Only',
    description:
      'Diagnostic shadow that removes the MED13 ADHD term, which was acting as a weak semantic fallback for compulsive behavior.',
    addToRere: [],
    removeFromMed13: [ADHD]
  },
  {
    id: 'add_rere_compulsive_only',
    label: 'Add Right-Side Compulsive Behavior Only',
    description:
      'Diagnostic shadow that adds exact compulsive behavior to the RERE disease branch without changing the outranker branch.',
    addToRere: [{ curie: COMPULSIVE, referenceText: 'diagnostic shadow' }],
    removeFromMed13: []
  },
  {
    id: 'remove_wrong_add_right',
    label: 'Remove Wrong Side And Add Right Side',
    description:
      'Diagnostic shadow that removes MED13 ADHD and adds exact compulsive behavior to the RERE disease branch.',
    addToRere: [{ curie: COMPULSIVE, referenceText: 'diagnostic shadow' }],
    removeFromMed13: [ADHD]
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

function summarizeRow(row) {
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
    matchedPhenotypeCount: row.matchedPhenotypeCount
  };
}

function buildMarkdown(report) {
  const lines = [];
  lines.push('# RERE Behavior Diagnostic Shadow');
  lines.push('');
  lines.push(`Created: ${report.createdAt}`);
  lines.push('');
  lines.push(`Case: ${report.caseId}`);
  lines.push('');
  lines.push('## Baseline');
  lines.push('');
  lines.push(`- Truth rank: ${report.baseline.truth?.rank ?? 'miss'}`);
  lines.push(`- Truth gene: ${report.baseline.truth?.geneLabel ?? 'n/a'}`);
  lines.push(`- Top-1 gene: ${report.baseline.top1?.geneLabel ?? 'n/a'}`);
  lines.push('');
  lines.push('## Scenarios');
  lines.push('');

  for (const scenario of report.scenarios) {
    lines.push(`### ${scenario.label}`);
    lines.push('');
    lines.push(scenario.description);
    lines.push('');
    lines.push(`- Added to RERE: ${scenario.addedToRere.length ? scenario.addedToRere.join(', ') : 'none'}`);
    lines.push(
      `- Removed from MED13: ${scenario.removedFromMed13.length ? scenario.removedFromMed13.join(', ') : 'none'}`
    );
    lines.push(`- Truth rank: ${scenario.truth?.rank ?? 'miss'}`);
    lines.push(`- Top-1 gene: ${scenario.top1?.geneLabel ?? 'n/a'}`);
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

  const report = await withClient(async (client) => {
    const ontologyRows = await loadDxPhenotypeOntologyRows(client);
    const diseasePhenotypeResult = await loadDxDiseasePhenotypeRows(client);
    const genePhenotypeResult = await loadDxGenePhenotypeRows(client);
    const geneDiseaseSupportRows = await loadDxGeneDiseaseSupportRows(client);
    const caseRaw = await fs.readFile(path.join(phenopacketDir, CASE_FILE), 'utf8');
    const candidateResult = await client.query(
      `
        SELECT entity_id, canonical_curie, canonical_label
        FROM entities
        WHERE entity_type = 'phenotype'
          AND canonical_curie = $1
      `,
      [COMPULSIVE]
    );

    const diseasePhenotypeRows = diseasePhenotypeResult.rows;
    const genePhenotypeRows = genePhenotypeResult.rows;
    const compulsivePhenotype = candidateResult.rows[0] || null;
    const diseaseMeta = new Map(
      [...diseasePhenotypeRows, ...geneDiseaseSupportRows]
        .filter((row) => row?.disease_curie)
        .map((row) => [
          row.disease_curie,
          {
            diseaseEntityId: Number(row.disease_entity_id),
            diseaseCurie: row.disease_curie,
            diseaseLabel: row.disease_label || row.disease_curie
          }
        ])
    );

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
      limit
    }).results;
    const baselineTruthRank = findTruthRank(baselineRanking, truthGeneKeys);
    const baselineTruth =
      baselineTruthRank == null ? null : baselineRanking.find((row) => row.rank === baselineTruthRank) || null;

    const scenarios = [];

    for (const scenario of SCENARIOS) {
      let shadowDiseasePhenotypeRows = diseasePhenotypeRows.filter((row) => {
        if ((row.presence_status || 'present') !== 'present') return true;
        if ((row.phenotype_edge_origin || 'direct') !== 'direct') return true;
        if (row.disease_curie === MED13_DISEASE && scenario.removeFromMed13.includes(row.phenotype_curie)) {
          return false;
        }
        return true;
      });

      const added = [];
      if (scenario.addToRere.length && compulsivePhenotype) {
        const rere = diseaseMeta.get(RERE_DISEASE);
        const existing = new Set(
          shadowDiseasePhenotypeRows
            .filter(
              (row) =>
                row.disease_curie === RERE_DISEASE &&
                (row.presence_status || 'present') === 'present' &&
                (row.phenotype_edge_origin || 'direct') === 'direct'
            )
            .map((row) => row.phenotype_curie)
        );
        for (const term of scenario.addToRere) {
          if (!rere || existing.has(term.curie)) continue;
          added.push({
            disease_entity_id: rere.diseaseEntityId,
            disease_curie: rere.diseaseCurie,
            disease_label: rere.diseaseLabel,
            phenotype_entity_id: Number(compulsivePhenotype.entity_id),
            phenotype_curie: compulsivePhenotype.canonical_curie,
            phenotype_label: compulsivePhenotype.canonical_label,
            presence_status: 'present',
            source_key: `shadow_${scenario.id}`,
            source_record_key: `shadow_${scenario.id}:${rere.diseaseCurie}:${compulsivePhenotype.canonical_curie}`,
            phenotype_edge_origin: 'direct',
            reference_text: term.referenceText,
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

      shadowDiseasePhenotypeRows = [...shadowDiseasePhenotypeRows, ...added];

      const shadowIndex = buildDxSimilarityIndex({
        ontologyRows,
        diseasePhenotypeRows: shadowDiseasePhenotypeRows,
        genePhenotypeRows,
        geneDiseaseSupportRows
      });
      const shadowRanking = rankGenesByPhenotypeSimilarity(shadowIndex, {
        phenotypeCuries: input.presentPhenotypeCuries,
        excludedPhenotypeCuries: input.excludedPhenotypeCuries,
        limit
      }).results;
      const truthRank = findTruthRank(shadowRanking, truthGeneKeys);
      const truth = truthRank == null ? null : shadowRanking.find((row) => row.rank === truthRank) || null;

      scenarios.push({
        id: scenario.id,
        label: scenario.label,
        description: scenario.description,
        removedFromMed13: scenario.removeFromMed13,
        addedToRere: added.map((row) => row.phenotype_label),
        top1: summarizeRow(shadowRanking[0] || null),
        truth: summarizeRow(truth)
      });
    }

    return {
      createdAt: new Date().toISOString(),
      caseId: CASE_FILE.replace(/\.json$/, ''),
      baseline: {
        top1: summarizeRow(baselineRanking[0] || null),
        truth: summarizeRow(baselineTruth)
      },
      scenarios
    };
  });

  await fs.mkdir(path.dirname(outputJson), { recursive: true });
  await fs.writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await fs.writeFile(outputMd, buildMarkdown(report), 'utf8');
  console.log(JSON.stringify({ outputJson, outputMd }, null, 2));
}

await main();
