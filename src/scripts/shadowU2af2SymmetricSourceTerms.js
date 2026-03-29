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
import { extractTruthGeneKeys, findTruthRank, parseArgs } from './lib/shadowBenchmarkUtils.js';

const DEFAULTS = Object.freeze({
  phenopacketPath:
    '/Users/ahmedelmorshedy/Genovy-phenotype-enrichment-20260316-0914/output/u2af2-case-slice-phenopackets-20260326/PMID_37962958_43.json',
  outputJson:
    '/Users/ahmedelmorshedy/Genovy-phenotype-enrichment-20260316-0914/output/shadow-u2af2-symmetric-source-terms-20260327.json',
  outputMd:
    '/Users/ahmedelmorshedy/Genovy-phenotype-enrichment-20260316-0914/output/shadow-u2af2-symmetric-source-terms-20260327.md',
  rankingLimit: 1200
});

const TRUTH_GENE_KEY = 'symbol:U2AF2';
const TRUTH_DISEASE_CURIE = 'MONDO:0957810';
const RIVAL_GENE_KEY = 'symbol:LRRC7';
const RIVAL_DISEASE_CURIE = 'MONDO:0980748';
const PRESENT_STATUS = 'present';
const DIRECT_EDGE_ORIGIN = 'direct';
const SHADOW_SOURCE_KEY = 'shadow_u2af2_symmetric_source_terms';
const SHADOW_ROW_SOURCE_MODE = 'shadow_u2af2_symmetric_source_terms';

const TRUTH_TERMS = Object.freeze([
  {
    curie: 'HP:0001249',
    referenceText: 'OMIM:620535; OMIM:191318; U2AF2 manual OMIM extract 2026-03-26'
  },
  {
    curie: 'HP:0000750',
    referenceText: 'OMIM:620535; OMIM:191318; U2AF2 manual OMIM extract 2026-03-26'
  },
  {
    curie: 'HP:0010862',
    referenceText: 'OMIM:620535 clinical features; walked at 21 months / delayed fine motor development'
  },
  {
    curie: 'HP:0031936',
    referenceText: 'OMIM:620535 clinical features; walked at 21 months / delayed ability to walk'
  },
  {
    curie: 'HP:0002069',
    referenceText: 'OMIM:620535; early-onset seizures / bilateral tonic-clonic seizure'
  },
  {
    curie: 'HP:0002020',
    referenceText: 'OMIM:620535 clinical features; gastroesophageal reflux'
  },
  {
    curie: 'HP:0011968',
    referenceText: 'OMIM:620535 clinical features; poor feeding / feeding difficulties'
  },
  {
    curie: 'HP:0012745',
    referenceText: 'OMIM:620535 clinical features; short palpebral fissures'
  },
  {
    curie: 'HP:0001488',
    referenceText: 'OMIM:620535 clinical features; bilateral ptosis'
  },
  {
    curie: 'HP:0007687',
    referenceText: 'OMIM:620535 clinical features; unilateral ptosis'
  }
]);

const RIVAL_TERMS = Object.freeze([]);

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

function findRowByGeneKey(rows, geneKey) {
  const truthRank = findTruthRank(rows, [geneKey]);
  if (truthRank == null) return null;
  return rows.find((row) => row.rank === truthRank) || null;
}

function buildDiseaseTermSet(diseasePhenotypeRows, diseaseCurie, { includedStatus = PRESENT_STATUS } = {}) {
  const rows = diseasePhenotypeRows.filter(
    (row) =>
      row.disease_curie === diseaseCurie &&
      (row.presence_status || PRESENT_STATUS) === includedStatus &&
      (row.phenotype_edge_origin || DIRECT_EDGE_ORIGIN) === DIRECT_EDGE_ORIGIN
  );
  const set = new Map();
  for (const row of rows) {
    set.set(row.phenotype_curie, row.phenotype_label || row.phenotype_curie);
  }
  return set;
}

function summarizeExactOverlap(termIds, labelByCurie, diseaseTermMap) {
  return termIds
    .filter((curie) => diseaseTermMap.has(curie))
    .map((curie) => ({
      phenotypeCurie: curie,
      patientLabel: labelByCurie.get(curie) || curie,
      diseaseLabel: diseaseTermMap.get(curie) || curie
    }));
}

function buildShadowRowsForDisease({
  diseasePhenotypeRows,
  candidatePhenotypes,
  targetDiseaseCurie,
  termDefinitions
}) {
  const diseaseMeta = diseasePhenotypeRows.find((row) => row.disease_curie === targetDiseaseCurie);
  if (!diseaseMeta) {
    throw new Error(`Unable to resolve disease metadata for ${targetDiseaseCurie}`);
  }

  const existingDirectPresentRows = diseasePhenotypeRows.filter(
    (row) =>
      row.disease_curie === targetDiseaseCurie &&
      (row.presence_status || PRESENT_STATUS) === PRESENT_STATUS &&
      (row.phenotype_edge_origin || DIRECT_EDGE_ORIGIN) === DIRECT_EDGE_ORIGIN
  );
  const existingCuries = new Set(existingDirectPresentRows.map((row) => row.phenotype_curie));
  const phenotypeByCurie = new Map(candidatePhenotypes.map((row) => [row.canonical_curie, row]));

  const added = [];
  const skipped = [];
  const missing = [];

  for (const term of termDefinitions) {
    if (existingCuries.has(term.curie)) {
      const existing = existingDirectPresentRows.find((row) => row.phenotype_curie === term.curie);
      skipped.push({
        phenotypeCurie: term.curie,
        phenotypeLabel: existing?.phenotype_label || term.curie
      });
      continue;
    }

    const phenotype = phenotypeByCurie.get(term.curie);
    if (!phenotype) {
      missing.push(term.curie);
      continue;
    }

    added.push({
      disease_entity_id: Number(diseaseMeta.disease_entity_id),
      disease_curie: diseaseMeta.disease_curie,
      disease_label: diseaseMeta.disease_label,
      phenotype_entity_id: Number(phenotype.entity_id),
      phenotype_curie: phenotype.canonical_curie,
      phenotype_label: phenotype.canonical_label,
      presence_status: PRESENT_STATUS,
      source_key: SHADOW_SOURCE_KEY,
      source_record_key: `${SHADOW_SOURCE_KEY}:${targetDiseaseCurie}:${phenotype.canonical_curie}`,
      phenotype_edge_origin: DIRECT_EDGE_ORIGIN,
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
      row_source_mode: SHADOW_ROW_SOURCE_MODE
    });
  }

  return {
    added,
    skipped,
    missing
  };
}

function buildMarkdown({
  createdAt,
  caseId,
  patientPresent,
  patientExcluded,
  baselineTop10,
  baselineTruth,
  baselineRival,
  shadowTop10,
  shadowTruth,
  shadowRival,
  truthExactPresentBaseline,
  truthExactPresentShadow,
  truthExactExcludedBaseline,
  truthExactExcludedShadow,
  rivalExactPresentBaseline,
  rivalExactPresentShadow,
  rivalExactExcludedBaseline,
  rivalExactExcludedShadow,
  truthAdded,
  truthSkipped,
  rivalAdded,
  rivalSkipped
}) {
  const lines = [
    '# U2AF2 Symmetric Source Shadow',
    '',
    `Created: ${createdAt}`,
    `Case: ${caseId}`,
    'Truth source stack: OMIM 191318 + OMIM 620535 + existing U2AF2 manual OMIM extract',
    'Rival source stack: OMIM 621415 + PMID:39256359 (no GeneReviews chapter found)',
    'Symmetry rule: the same source discipline was checked on both truth and outranker; no promotable packet-relevant rival additions were found beyond the live graph surface.',
    '',
    '## Patient Packet',
    '',
    `Present terms (${patientPresent.length}): ${patientPresent.map((term) => term.label).join(', ')}`,
    `Excluded terms (${patientExcluded.length}): ${patientExcluded.map((term) => term.label).join(', ')}`,
    '',
    '## Baseline',
    '',
    `Top outranker: ${baselineTop10[0]?.geneLabel || 'n/a'} / ${baselineTop10[0]?.supportingDiseaseLabel || 'n/a'} (rank ${baselineTop10[0]?.rank || 'n/a'})`,
    `Truth: ${baselineTruth?.geneLabel || 'U2AF2'} rank ${baselineTruth?.rank ?? 'miss'} score ${baselineTruth?.normalizedScore ?? 'n/a'}`,
    `Rival: ${baselineRival?.geneLabel || 'LRRC7'} rank ${baselineRival?.rank ?? 'miss'} score ${baselineRival?.normalizedScore ?? 'n/a'}`,
    '',
    '## Shadow Additions',
    '',
    `Truth added (${truthAdded.length}): ${truthAdded.map((term) => term.phenotypeLabel).join(', ') || 'none'}`,
    `Truth skipped existing (${truthSkipped.length}): ${truthSkipped.map((term) => term.phenotypeLabel).join(', ') || 'none'}`,
    `Rival added (${rivalAdded.length}): ${rivalAdded.map((term) => term.phenotypeLabel).join(', ') || 'none'}`,
    `Rival skipped existing (${rivalSkipped.length}): ${rivalSkipped.map((term) => term.phenotypeLabel).join(', ') || 'none'}`,
    '',
    '## Exact Packet Fit',
    '',
    '| Branch | Present exact before | Present exact after | Excluded contradictions before | Excluded contradictions after |',
    '|---|---|---|---|---|',
    `| U2AF2 / MONDO:0957810 | ${truthExactPresentBaseline.map((term) => term.patientLabel).join(', ') || 'none'} | ${truthExactPresentShadow.map((term) => term.patientLabel).join(', ') || 'none'} | ${truthExactExcludedBaseline.map((term) => term.patientLabel).join(', ') || 'none'} | ${truthExactExcludedShadow.map((term) => term.patientLabel).join(', ') || 'none'} |`,
    `| LRRC7 / MONDO:0980748 | ${rivalExactPresentBaseline.map((term) => term.patientLabel).join(', ') || 'none'} | ${rivalExactPresentShadow.map((term) => term.patientLabel).join(', ') || 'none'} | ${rivalExactExcludedBaseline.map((term) => term.patientLabel).join(', ') || 'none'} | ${rivalExactExcludedShadow.map((term) => term.patientLabel).join(', ') || 'none'} |`,
    '',
    '## Rank Outcome',
    '',
    '| Branch | Baseline rank | Shadow rank | Baseline score | Shadow score |',
    '|---|---:|---:|---:|---:|',
    `| U2AF2 | ${baselineTruth?.rank ?? 'miss'} | ${shadowTruth?.rank ?? 'miss'} | ${baselineTruth?.normalizedScore ?? 'n/a'} | ${shadowTruth?.normalizedScore ?? 'n/a'} |`,
    `| LRRC7 | ${baselineRival?.rank ?? 'miss'} | ${shadowRival?.rank ?? 'miss'} | ${baselineRival?.normalizedScore ?? 'n/a'} | ${shadowRival?.normalizedScore ?? 'n/a'} |`,
    '',
    '## Top 10 After Shadow',
    '',
    '| Rank | Gene | Score | Support disease |',
    '|---:|---|---:|---|'
  ];

  for (const row of shadowTop10) {
    lines.push(`| ${row.rank} | ${row.geneLabel} | ${row.normalizedScore} | ${row.supportingDiseaseLabel || ''} |`);
  }

  return lines.join('\n');
}

async function main() {
  const flags = parseArgs(process.argv.slice(2));
  const config = {
    phenopacketPath: flags['phenopacket-path'] || DEFAULTS.phenopacketPath,
    outputJson: flags['output-json'] || DEFAULTS.outputJson,
    outputMd: flags['output-md'] || DEFAULTS.outputMd,
    rankingLimit: Number.parseInt(String(flags['ranking-limit'] || DEFAULTS.rankingLimit), 10)
  };

  const raw = JSON.parse(await fs.readFile(config.phenopacketPath, 'utf8'));
  const phenopacket = raw.phenopacket || raw;
  const input = extractDxPhenotypeInput({ phenopacket });
  const validationError = validateDxPhenotypeInput(input);
  if (validationError) {
    throw new Error(validationError);
  }

  const truthGeneKeys = extractTruthGeneKeys(phenopacket);
  const patientPresent = (phenopacket.phenotypicFeatures || [])
    .filter((feature) => !feature?.excluded)
    .map((feature) => ({ curie: feature.type?.id, label: feature.type?.label || feature.type?.id }))
    .filter((term) => term.curie);
  const patientExcluded = (phenopacket.phenotypicFeatures || [])
    .filter((feature) => Boolean(feature?.excluded))
    .map((feature) => ({ curie: feature.type?.id, label: feature.type?.label || feature.type?.id }))
    .filter((term) => term.curie);

  const uniqueCandidateTerms = [...new Set([...TRUTH_TERMS, ...RIVAL_TERMS].map((term) => term.curie))];

  const {
    ontologyRows,
    diseasePhenotypeRows,
    genePhenotypeRows,
    geneDiseaseSupportRows,
    candidatePhenotypes
  } = await withClient(async (client) => {
    const loadedOntologyRows = await loadDxPhenotypeOntologyRows(client);
    const diseaseResult = await loadDxDiseasePhenotypeRows(client);
    const genePhenoResult = await loadDxGenePhenotypeRows(client);
    const geneDiseaseRows = await loadDxGeneDiseaseSupportRows(client);
    const candidateResult = uniqueCandidateTerms.length
      ? await client.query(
          `
            SELECT entity_id, canonical_curie, canonical_label
            FROM entities
            WHERE entity_type = 'phenotype'
              AND canonical_curie = ANY($1::text[])
          `,
          [uniqueCandidateTerms]
        )
      : { rows: [] };

    return {
      ontologyRows: loadedOntologyRows,
      diseasePhenotypeRows: diseaseResult.rows,
      genePhenotypeRows: genePhenoResult.rows,
      geneDiseaseSupportRows: geneDiseaseRows,
      candidatePhenotypes: candidateResult.rows
    };
  });

  const truthShadow = buildShadowRowsForDisease({
    diseasePhenotypeRows,
    candidatePhenotypes,
    targetDiseaseCurie: TRUTH_DISEASE_CURIE,
    termDefinitions: TRUTH_TERMS
  });
  const rivalShadow = buildShadowRowsForDisease({
    diseasePhenotypeRows,
    candidatePhenotypes,
    targetDiseaseCurie: RIVAL_DISEASE_CURIE,
    termDefinitions: RIVAL_TERMS
  });

  const shadowDiseasePhenotypeRows = [
    ...diseasePhenotypeRows,
    ...truthShadow.added,
    ...rivalShadow.added
  ];

  const baselineIndex = buildDxSimilarityIndex({
    ontologyRows,
    diseasePhenotypeRows,
    genePhenotypeRows,
    geneDiseaseSupportRows
  });
  const shadowIndex = buildDxSimilarityIndex({
    ontologyRows,
    diseasePhenotypeRows: shadowDiseasePhenotypeRows,
    genePhenotypeRows,
    geneDiseaseSupportRows
  });

  const baselineRanking = rankGenesByPhenotypeSimilarity(baselineIndex, {
    phenotypeCuries: input.presentPhenotypeCuries,
    excludedPhenotypeCuries: input.excludedPhenotypeCuries,
    limit: config.rankingLimit
  });
  const shadowRanking = rankGenesByPhenotypeSimilarity(shadowIndex, {
    phenotypeCuries: input.presentPhenotypeCuries,
    excludedPhenotypeCuries: input.excludedPhenotypeCuries,
    limit: config.rankingLimit
  });

  const baselineTruth = summarizeGeneRow(findRowByGeneKey(baselineRanking.results, TRUTH_GENE_KEY));
  const shadowTruth = summarizeGeneRow(findRowByGeneKey(shadowRanking.results, TRUTH_GENE_KEY));
  const baselineRival = summarizeGeneRow(findRowByGeneKey(baselineRanking.results, RIVAL_GENE_KEY));
  const shadowRival = summarizeGeneRow(findRowByGeneKey(shadowRanking.results, RIVAL_GENE_KEY));

  const patientPresentIds = patientPresent.map((term) => term.curie);
  const patientExcludedIds = patientExcluded.map((term) => term.curie);
  const labelByCurie = new Map([...patientPresent, ...patientExcluded].map((term) => [term.curie, term.label]));

  const truthBaselineTerms = buildDiseaseTermSet(diseasePhenotypeRows, TRUTH_DISEASE_CURIE);
  const truthShadowTerms = buildDiseaseTermSet(shadowDiseasePhenotypeRows, TRUTH_DISEASE_CURIE);
  const rivalBaselineTerms = buildDiseaseTermSet(diseasePhenotypeRows, RIVAL_DISEASE_CURIE);
  const rivalShadowTerms = buildDiseaseTermSet(shadowDiseasePhenotypeRows, RIVAL_DISEASE_CURIE);

  const result = {
    createdAt: new Date().toISOString(),
    caseId: phenopacket.id || path.basename(config.phenopacketPath, '.json'),
    truthGeneKeys,
    truthGeneKey: TRUTH_GENE_KEY,
    rivalGeneKey: RIVAL_GENE_KEY,
    truthDiseaseCurie: TRUTH_DISEASE_CURIE,
    rivalDiseaseCurie: RIVAL_DISEASE_CURIE,
    sourceStack: {
      truth: ['OMIM:191318', 'OMIM:620535', 'U2AF2 manual OMIM extract 2026-03-26'],
      rival: ['OMIM:621415', 'PMID:39256359'],
      note: 'GeneReviews chapter not found for LRRC7; packet-relevant rival additions beyond the live graph surface were not supported.'
    },
    patientPresent,
    patientExcluded,
    truthShadow: {
      added: truthShadow.added.map((term) => ({
        phenotypeCurie: term.phenotype_curie,
        phenotypeLabel: term.phenotype_label,
        referenceText: term.reference_text
      })),
      skipped: truthShadow.skipped,
      missing: truthShadow.missing
    },
    rivalShadow: {
      added: rivalShadow.added.map((term) => ({
        phenotypeCurie: term.phenotype_curie,
        phenotypeLabel: term.phenotype_label,
        referenceText: term.reference_text
      })),
      skipped: rivalShadow.skipped,
      missing: rivalShadow.missing
    },
    baseline: {
      top10: baselineRanking.results.slice(0, 10).map(summarizeGeneRow),
      truth: baselineTruth,
      rival: baselineRival
    },
    shadow: {
      top10: shadowRanking.results.slice(0, 10).map(summarizeGeneRow),
      truth: shadowTruth,
      rival: shadowRival
    },
    exactFit: {
      truth: {
        presentBefore: summarizeExactOverlap(patientPresentIds, labelByCurie, truthBaselineTerms),
        presentAfter: summarizeExactOverlap(patientPresentIds, labelByCurie, truthShadowTerms),
        excludedBefore: summarizeExactOverlap(patientExcludedIds, labelByCurie, truthBaselineTerms),
        excludedAfter: summarizeExactOverlap(patientExcludedIds, labelByCurie, truthShadowTerms)
      },
      rival: {
        presentBefore: summarizeExactOverlap(patientPresentIds, labelByCurie, rivalBaselineTerms),
        presentAfter: summarizeExactOverlap(patientPresentIds, labelByCurie, rivalShadowTerms),
        excludedBefore: summarizeExactOverlap(patientExcludedIds, labelByCurie, rivalBaselineTerms),
        excludedAfter: summarizeExactOverlap(patientExcludedIds, labelByCurie, rivalShadowTerms)
      }
    }
  };

  const markdown = buildMarkdown({
    createdAt: result.createdAt,
    caseId: result.caseId,
    patientPresent,
    patientExcluded,
    baselineTop10: result.baseline.top10,
    baselineTruth,
    baselineRival,
    shadowTop10: result.shadow.top10,
    shadowTruth,
    shadowRival,
    truthExactPresentBaseline: result.exactFit.truth.presentBefore,
    truthExactPresentShadow: result.exactFit.truth.presentAfter,
    truthExactExcludedBaseline: result.exactFit.truth.excludedBefore,
    truthExactExcludedShadow: result.exactFit.truth.excludedAfter,
    rivalExactPresentBaseline: result.exactFit.rival.presentBefore,
    rivalExactPresentShadow: result.exactFit.rival.presentAfter,
    rivalExactExcludedBaseline: result.exactFit.rival.excludedBefore,
    rivalExactExcludedShadow: result.exactFit.rival.excludedAfter,
    truthAdded: result.truthShadow.added,
    truthSkipped: result.truthShadow.skipped,
    rivalAdded: result.rivalShadow.added,
    rivalSkipped: result.rivalShadow.skipped
  });

  await fs.writeFile(config.outputJson, JSON.stringify(result, null, 2));
  await fs.writeFile(config.outputMd, `${markdown}\n`);

  console.log(
    JSON.stringify(
      {
        outputJson: config.outputJson,
        outputMd: config.outputMd,
        baselineTruth,
        shadowTruth,
        baselineRival,
        shadowRival
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
