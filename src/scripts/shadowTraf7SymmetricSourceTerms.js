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
    '/Users/ahmedelmorshedy/Genovy-phenotype-enrichment-20260316-0914/output/shadow-traf7-symmetric-source-terms-20260326.json',
  outputMd:
    '/Users/ahmedelmorshedy/Genovy-phenotype-enrichment-20260316-0914/output/shadow-traf7-symmetric-source-terms-20260326.md',
  limit: 2000
});

const TARGET_CASES = Object.freeze(['PMID_32376980_11.json']);
const PRESENT_STATUS = 'present';
const DIRECT_EDGE_ORIGIN = 'direct';

const SCENARIOS = Object.freeze([
  {
    id: 'omim_literal_traf7_dot1l',
    label: 'OMIM Literal Terms',
    description:
      'Add only exact OMIM clinical synopsis terms that are explicitly described for the TRAF7 and DOT1L syndrome branches and currently absent from the live direct disease profile.',
    sourceNote:
      'TRAF7 gains feeding difficulties, hearing impairment, low-set ears, epicanthus, and optic atrophy. DOT1L gains feeding difficulties, hearing impairment, and high forehead.',
    diseaseTerms: {
      'MONDO:0032572': [
        { curie: 'HP:0011968', referenceText: 'OMIM:618164 clinical synopsis' },
        { curie: 'HP:0000365', referenceText: 'OMIM:618164 clinical synopsis' },
        { curie: 'HP:0000369', referenceText: 'OMIM:618164 clinical synopsis' },
        { curie: 'HP:0000286', referenceText: 'OMIM:618164 clinical synopsis' },
        { curie: 'HP:0000648', referenceText: 'OMIM:618164 clinical synopsis' }
      ],
      'MONDO:0979246': [
        { curie: 'HP:0011968', referenceText: 'OMIM:621265 clinical synopsis' },
        { curie: 'HP:0000365', referenceText: 'OMIM:621265 clinical synopsis' },
        { curie: 'HP:0000348', referenceText: 'OMIM:621265 clinical synopsis' }
      ]
    }
  },
  {
    id: 'omim_plus_primary_traf7_dot1l',
    label: 'OMIM Plus Primary Syndrome Papers',
    description:
      'Start from the OMIM literal additions, then layer in exact terms that are explicitly supported by the main TRAF7 and DOT1L syndrome papers and currently absent from the live direct disease profile.',
    sourceNote:
      'TRAF7 keeps the OMIM literal additions and also gains blepharophimosis from the large 2020 TRAF7 cohort paper. DOT1L keeps the OMIM literal additions; its sharper exact terms in this case are already present in the live branch from the 2023 paper.',
    diseaseTerms: {
      'MONDO:0032572': [
        { curie: 'HP:0011968', referenceText: 'OMIM:618164 clinical synopsis' },
        { curie: 'HP:0000365', referenceText: 'OMIM:618164 clinical synopsis' },
        { curie: 'HP:0000369', referenceText: 'OMIM:618164 clinical synopsis' },
        { curie: 'HP:0000286', referenceText: 'OMIM:618164 clinical synopsis' },
        { curie: 'HP:0000648', referenceText: 'OMIM:618164 clinical synopsis' },
        { curie: 'HP:0000581', referenceText: 'PMID:32376980' }
      ],
      'MONDO:0979246': [
        { curie: 'HP:0011968', referenceText: 'OMIM:621265 clinical synopsis' },
        { curie: 'HP:0000365', referenceText: 'OMIM:621265 clinical synopsis' },
        { curie: 'HP:0000348', referenceText: 'OMIM:621265 clinical synopsis' }
      ]
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

  return {
    shadowAddedTerms,
    skippedExistingTerms,
    missingFromOntology,
    shadowDiseasePhenotypeRows: [...diseasePhenotypeRows, ...shadowAddedTerms]
  };
}

function buildScenarioMarkdown(report) {
  const lines = [
    '# TRAF7 Symmetric Source Shadow',
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
      lines.push(
        `- ${row.case_id}: truth ${row.baseline_rank ?? 'miss'} -> ${row.shadow_rank ?? 'miss'}; top1 ${row.baseline_top1?.geneLabel ?? 'n/a'} -> ${row.shadow_top1?.geneLabel ?? 'n/a'}`
      );
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
    limit: Number(flags.limit || DEFAULTS.limit)
  };

  const candidateTermCuries = flattenUniqueTerms(SCENARIOS);
  const { ontologyRows, diseasePhenotypeRows, genePhenotypeRows, geneDiseaseSupportRows, candidatePhenotypes } =
    await loadShadowInputs(candidateTermCuries);
  const diseaseMetaIndex = buildDiseaseMetaIndex(diseasePhenotypeRows, geneDiseaseSupportRows);

  const caseResults = [];

  for (const caseFile of TARGET_CASES) {
    const caseRaw = await fs.readFile(path.join(config.phenopacketDir, caseFile), 'utf8');
    const payload = JSON.parse(caseRaw);
    const phenopacket = payload?.phenopacket || payload;
    const input = extractDxPhenotypeInput({ phenopacket });
    const validationError = validateDxPhenotypeInput(input);
    if (validationError) throw new Error(`${caseFile}: ${validationError}`);
    const truthGeneKeys = extractTruthGeneKeys(phenopacket);

    const baselineIndex = buildDxSimilarityIndex({
      ontologyRows,
      diseasePhenotypeRows,
      genePhenotypeRows,
      geneDiseaseSupportRows
    });
    const baselineResults = rankGenesByPhenotypeSimilarity(baselineIndex, {
      phenotypeCuries: input.presentPhenotypeCuries,
      excludedPhenotypeCuries: input.excludedPhenotypeCuries,
      limit: config.limit
    }).results;

    caseResults.push({
      caseId: caseFile.replace(/\.json$/, ''),
      truthGeneKeys,
      input,
      baselineResults
    });
  }

  const report = {
    createdAt: new Date().toISOString(),
    scenarios: []
  };

  for (const scenario of SCENARIOS) {
    const { shadowAddedTerms, skippedExistingTerms, missingFromOntology, shadowDiseasePhenotypeRows } =
      buildScenarioShadowRows({ scenario, diseasePhenotypeRows, diseaseMetaIndex, candidatePhenotypes });

    const perCase = [];

    for (const caseResult of caseResults) {
      const baselineRows = buildBenchmarkRows(caseResult.baselineResults, caseResult.truthGeneKeys);
      const shadowIndex = buildDxSimilarityIndex({
        ontologyRows,
        diseasePhenotypeRows: shadowDiseasePhenotypeRows,
        genePhenotypeRows,
        geneDiseaseSupportRows
      });
      const shadowResults = rankGenesByPhenotypeSimilarity(shadowIndex, {
        phenotypeCuries: caseResult.input.presentPhenotypeCuries,
        excludedPhenotypeCuries: caseResult.input.excludedPhenotypeCuries,
        limit: config.limit
      }).results;
      const shadowRows = buildBenchmarkRows(shadowResults, caseResult.truthGeneKeys);

      perCase.push({
        case_id: caseResult.caseId,
        baseline_rank: baselineRows.truth?.rank ?? null,
        shadow_rank: shadowRows.truth?.rank ?? null,
        baseline_top1: baselineRows.top1,
        shadow_top1: shadowRows.top1,
        baseline_truth: baselineRows.truth,
        shadow_truth: shadowRows.truth
      });
    }

    const baselineSummary = summarizeRun(
      perCase.map((row) => ({ truth_rank: row.baseline_rank })),
      { limit: config.limit }
    );
    const shadowSummary = summarizeRun(
      perCase.map((row) => ({ truth_rank: row.shadow_rank })),
      { limit: config.limit }
    );

    report.scenarios.push({
      id: scenario.id,
      label: scenario.label,
      description: scenario.description,
      sourceNote: scenario.sourceNote,
      shadowAddedTerms: shadowAddedTerms.map((row) => ({
        diseaseCurie: row.disease_curie,
        diseaseLabel: row.disease_label,
        phenotypeCurie: row.phenotype_curie,
        phenotypeLabel: row.phenotype_label,
        referenceText: row.reference_text
      })),
      skippedExistingTerms,
      missingFromOntology,
      baselineSummary,
      shadowSummary,
      comparison: compareBaselineVsShadow(
        perCase.map((row) => ({ case_id: row.case_id, truth_rank: row.baseline_rank })),
        perCase.map((row) => ({ case_id: row.case_id, truth_rank: row.shadow_rank }))
      ),
      perCase
    });
  }

  await fs.writeFile(config.outputJson, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await fs.writeFile(config.outputMd, `${buildScenarioMarkdown(report)}\n`, 'utf8');
  console.log(JSON.stringify({ outputJson: config.outputJson, outputMd: config.outputMd }, null, 2));
}

await main();
