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
  rankDiseasesByPhenotypeSimilarity,
  rankGenesByPhenotypeSimilarity,
  shouldReplaceSupportingDisease
} from '../services/dx/similarityEngine.js';
import {
  buildShadowMarkdown,
  compareBaselineVsShadow,
  extractTruthGeneKeys,
  findTruthRank,
  normalizeGeneKey,
  parseArgs,
  summarizeRun
} from './lib/shadowBenchmarkUtils.js';

const DEFAULTS = Object.freeze({
  phenopacketDir: '/Users/ahmedelmorshedy/Genovy/output/pheval-official-sample-100/phenopackets',
  benchmarkJson: '/Users/ahmedelmorshedy/Genovy/output/official-benchmark-post-clinvar-run54.json',
  outputJson: '/Users/ahmedelmorshedy/Genovy/output/shadow-stxbp1-case-slice-handoff-floor-20260325.json',
  outputMd: '/Users/ahmedelmorshedy/Genovy/output/shadow-stxbp1-case-slice-handoff-floor-20260325.md',
  limit: 500,
  overrideWeightFloor: 0.9
});

const TARGET_GENE_KEY = 'symbol:STXBP1';
const TARGET_DISEASE_CURIE = 'MONDO:0012812';
const SHADOW_ROW_SOURCE_MODE = 'shadow_stxbp1_case_slice_handoff_floor';
const SHADOW_SOURCE_KEY = 'shadow_stxbp1_case_slice_handoff_floor';
const SHADOW_REFERENCE_PREFIX = '[shadow STXBP1 case-slice handoff floor]';
const PRESENT_STATUS = 'present';
const DIRECT_EDGE_ORIGIN = 'direct';
const TARGET_TERMS = Object.freeze([
  'HP:0000283', // Broad face
  'HP:0007021', // Pain insensitivity
  'HP:0001169', // Broad palm
  'HP:0100710' // Impulsivity
]);

function isTargetCase(truthGeneKeys) {
  return truthGeneKeys.includes(TARGET_GENE_KEY);
}

function roundScore(value) {
  return Number((value || 0).toFixed(6));
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

  const missingFromOntology = TARGET_TERMS.filter((curie) => !candidateByCurie.has(curie));
  const shadowAddedTerms = [];
  const skippedExistingTerms = [];

  for (const candidateCurie of TARGET_TERMS) {
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
      reference_text: `${SHADOW_REFERENCE_PREFIX} discriminating-term augmentation`,
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

function countExactOverlap(patientTerms, phenotypeRows, { directOnly = false } = {}) {
  const patientSet = new Set(patientTerms);
  let overlap = 0;
  for (const row of phenotypeRows || []) {
    if (directOnly && row.edgeOrigin === 'propagated') continue;
    if (patientSet.has(row.phenotypeCurie)) {
      overlap += 1;
    }
  }
  return overlap;
}

function chooseBestSupportCandidate(candidates) {
  if (!candidates.length) return null;
  let bestCandidate = candidates[0];
  for (let index = 1; index < candidates.length; index += 1) {
    const candidate = candidates[index];
    if (shouldReplaceSupportingDisease(bestCandidate, candidate)) {
      bestCandidate = candidate;
    }
  }
  return bestCandidate;
}

function buildEmptyGeneRow(candidate) {
  return {
    rank: 0,
    geneCurie: candidate?.geneCurie || '',
    geneLabel: candidate?.geneLabel || candidate?.geneCurie || '',
    geneSymbol: candidate?.geneLabel || candidate?.geneCurie || '',
    geneEntityId: candidate?.geneEntityId || 0,
    bmaScore: 0,
    normalizedScore: 0,
    patientAverageScore: 0,
    phenotypeAverageScore: 0,
    directPhenotypeCount: 0,
    matchedPhenotypeCount: 0,
    trace: [],
    directNormalizedScore: 0,
    diseaseSupportScore: 0,
    supportingDiseaseEvidenceWeight: 0,
    supportingDiseaseCurie: '',
    supportingDiseaseLabel: '',
    supportingDiseaseClassification: '',
    supportingDiseaseDirectPhenotypeCount: 0,
    supportingDiseasePropagatedPhenotypeCount: 0
  };
}

function buildSupportCandidate(link, diseaseResult, diseaseProfile, patientTerms, overrideWeightFloor) {
  const directPhenotypeEdgeCount = diseaseResult.profileDirectPhenotypeCount || 0;
  const propagatedPhenotypeEdgeCount = diseaseResult.profilePropagatedPhenotypeCount || 0;
  const phenotypeCount =
    diseaseResult.phenotypeCount || directPhenotypeEdgeCount + propagatedPhenotypeEdgeCount;
  const evidenceWeight = computeDiseaseSupportEvidenceWeight({
    normalizedScore: diseaseResult.normalizedScore,
    phenotypeCount,
    matchedPhenotypeCount: diseaseResult.matchedPhenotypeCount,
    directPhenotypeEdgeCount,
    propagatedPhenotypeEdgeCount
  });
  const exactDirectPatientOverlap = countExactOverlap(patientTerms, diseaseProfile?.phenotypes, { directOnly: true });
  const overrideApplied =
    link.diseaseCurie === TARGET_DISEASE_CURIE &&
    directPhenotypeEdgeCount > 0 &&
    exactDirectPatientOverlap > 0 &&
    (link.supportWeight || 0) < overrideWeightFloor;
  const supportWeight = overrideApplied ? overrideWeightFloor : link.supportWeight || 0;

  return {
    geneCurie: link.geneCurie,
    geneLabel: link.geneLabel,
    geneEntityId: link.geneEntityId,
    diseaseCurie: link.diseaseCurie,
    diseaseLabel: link.diseaseLabel,
    classification: link.classification || '',
    supportWeight,
    originalSupportWeight: link.supportWeight || 0,
    overrideApplied,
    evidenceWeight,
    normalizedScore: diseaseResult.normalizedScore,
    diseaseSupportScore: roundScore(diseaseResult.normalizedScore * supportWeight * evidenceWeight),
    directPhenotypeEdgeCount,
    propagatedPhenotypeEdgeCount,
    exactPatientOverlap: countExactOverlap(patientTerms, diseaseProfile?.phenotypes),
    exactDirectPatientOverlap
  };
}

function buildShadowGeneRanking(index, { phenotypeCuries, excludedPhenotypeCuries = [], limit, overrideWeightFloor }) {
  const directOnlyIndex = {
    ...index,
    geneDiseaseSupportIndex: new Map()
  };
  const directRanking = rankGenesByPhenotypeSimilarity(directOnlyIndex, {
    phenotypeCuries,
    excludedPhenotypeCuries,
    limit: index.totalGenes || limit
  });
  const diseaseRanking = rankDiseasesByPhenotypeSimilarity(index, {
    phenotypeCuries,
    excludedPhenotypeCuries,
    limit: index.totalDiseases || limit
  });
  const diseaseProfileMap = new Map(index.diseaseProfiles.map((profile) => [profile.entityCurie, profile]));
  const directRowsByGeneKey = new Map();
  const supportCandidatesByGeneKey = new Map();

  for (const row of directRanking.results) {
    const geneKey = normalizeGeneKey(row.geneCurie) || normalizeGeneKey(row.geneLabel);
    if (!geneKey) continue;
    directRowsByGeneKey.set(geneKey, { ...row });
  }

  for (const diseaseResult of diseaseRanking.results) {
    const links = index.geneDiseaseSupportIndex.get(diseaseResult.diseaseCurie) || [];
    if (!links.length) continue;
    const diseaseProfile = diseaseProfileMap.get(diseaseResult.diseaseCurie);
    for (const link of links) {
      const geneKey = normalizeGeneKey(link.geneCurie) || normalizeGeneKey(link.geneLabel);
      if (!geneKey) continue;
      if (!supportCandidatesByGeneKey.has(geneKey)) {
        supportCandidatesByGeneKey.set(geneKey, []);
      }
      supportCandidatesByGeneKey
        .get(geneKey)
        .push(buildSupportCandidate(link, diseaseResult, diseaseProfile, phenotypeCuries, overrideWeightFloor));
    }
  }

  const allGeneKeys = new Set([...directRowsByGeneKey.keys(), ...supportCandidatesByGeneKey.keys()]);
  const shadowResults = [];

  for (const geneKey of allGeneKeys) {
    const directRow = directRowsByGeneKey.get(geneKey);
    const supportCandidates = supportCandidatesByGeneKey.get(geneKey) || [];
    const shadowSupport = chooseBestSupportCandidate(supportCandidates);
    const baseRow = directRow ? { ...directRow } : buildEmptyGeneRow(shadowSupport);
    baseRow.diseaseSupportScore = shadowSupport?.diseaseSupportScore || 0;
    baseRow.supportingDiseaseEvidenceWeight = shadowSupport?.evidenceWeight || 0;
    baseRow.supportingDiseaseCurie = shadowSupport?.diseaseCurie || '';
    baseRow.supportingDiseaseLabel = shadowSupport?.diseaseLabel || '';
    baseRow.supportingDiseaseClassification = shadowSupport?.classification || '';
    baseRow.supportingDiseaseDirectPhenotypeCount = shadowSupport?.directPhenotypeEdgeCount || 0;
    baseRow.supportingDiseasePropagatedPhenotypeCount = shadowSupport?.propagatedPhenotypeEdgeCount || 0;
    baseRow.normalizedScore = roundScore(
      Math.max(baseRow.directNormalizedScore || 0, baseRow.diseaseSupportScore || 0)
    );
    baseRow._shadowSupport = shadowSupport || null;
    shadowResults.push(baseRow);
  }

  const cappedLimit = Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : DEFAULTS.limit;
  return shadowResults
    .sort((left, right) => {
      if (right.normalizedScore !== left.normalizedScore) {
        return right.normalizedScore - left.normalizedScore;
      }
      if ((right.directNormalizedScore || 0) !== (left.directNormalizedScore || 0)) {
        return (right.directNormalizedScore || 0) - (left.directNormalizedScore || 0);
      }
      if ((right.diseaseSupportScore || 0) !== (left.diseaseSupportScore || 0)) {
        return (right.diseaseSupportScore || 0) - (left.diseaseSupportScore || 0);
      }
      return String(left.geneLabel || '').localeCompare(String(right.geneLabel || ''));
    })
    .slice(0, cappedLimit)
    .map((row, indexValue) => ({
      ...row,
      rank: indexValue + 1
    }));
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
  overrideWeightFloor,
  perCase
}) {
  const metadataLines = [
    `Target disease: ${targetDisease.disease_curie} (${targetDisease.disease_label})`,
    `Current direct terms: ${currentDirectTerms.length}`,
    `Added shadow direct terms: ${addedTerms.length}`,
    `Skipped already-present candidates: ${skippedExistingTerms.length}`,
    `Missing candidate curies in ontology/entities: ${missingFromOntology.length}`,
    `Support handoff floor: ${overrideWeightFloor}`
  ];
  const header = buildShadowMarkdown({
    title: 'STXBP1 Case-Slice Handoff Floor Shadow',
    createdAt,
    baselineSummary,
    shadowSummary,
    deltas,
    metadataLines
  });

  const sections = [header, '', '## Per-Case Results', '', '| Case | Baseline | Shadow | Exomiser | Baseline support | Shadow support | Override applied |', '|---|---:|---:|---:|---|---|---|'];
  for (const row of perCase) {
    sections.push(
      `| ${row.case_id} | ${row.baseline_rank ?? 'miss'} | ${row.shadow_rank ?? 'miss'} | ${row.exomiser_rank ?? 'miss'} | ${row.baseline_supporting_disease_curie || ''} | ${row.shadow_supporting_disease_curie || ''} | ${row.override_applied ? 'yes' : 'no'} |`
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
    overrideWeightFloor: Number(flags['override-weight-floor'] || DEFAULTS.overrideWeightFloor)
  };

  const benchmarkReference = buildBenchmarkReferenceMap(
    JSON.parse(await fs.readFile(config.benchmarkJson, 'utf8'))
  );
  const { ontologyRows, diseasePhenotypeRows, genePhenotypeRows, geneDiseaseSupportRows, candidatePhenotypes } =
    await loadShadowInputs(TARGET_TERMS);

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
  const phenopacketFiles = (await fs.readdir(config.phenopacketDir)).filter((name) => name.endsWith('.json')).sort();

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
    const shadow = buildShadowGeneRanking(shadowIndex, {
      phenotypeCuries: input.presentPhenotypeCuries,
      excludedPhenotypeCuries: input.excludedPhenotypeCuries,
      limit: config.limit,
      overrideWeightFloor: config.overrideWeightFloor
    });

    const baselineRank = findTruthRank(baseline.results, truthGeneKeys);
    const shadowRank = findTruthRank(shadow, truthGeneKeys);
    const reference = benchmarkReference.get(caseId) || {};
    const baselineTruthRow =
      baseline.results.find((row) => findTruthRank([row], truthGeneKeys) != null) || null;
    const shadowTruthRow =
      shadow.find((row) => findTruthRank([row], truthGeneKeys) != null) || null;

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
      shadow_supporting_disease_label: shadowTruthRow?.supportingDiseaseLabel || '',
      override_applied: Boolean(shadowTruthRow?._shadowSupport?.overrideApplied),
      baseline_gene_score: baselineTruthRow?.normalizedScore ?? null,
      shadow_gene_score: shadowTruthRow?.normalizedScore ?? null,
      baseline_disease_support_score: baselineTruthRow?.diseaseSupportScore ?? null,
      shadow_disease_support_score: shadowTruthRow?.diseaseSupportScore ?? null,
      shadow_support_weight: shadowTruthRow?._shadowSupport?.supportWeight ?? null,
      shadow_original_support_weight: shadowTruthRow?._shadowSupport?.originalSupportWeight ?? null
    });

    console.log(
      `[${indexValue + 1}/${phenopacketFiles.length}] ${fileName} baseline=${baselineRank ?? 'miss'} shadow=${shadowRank ?? 'miss'} override=${shadowTruthRow?._shadowSupport?.overrideApplied ? 'yes' : 'no'}`
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
    candidate_terms_requested: TARGET_TERMS,
    override_weight_floor: config.overrideWeightFloor,
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
      overrideWeightFloor: config.overrideWeightFloor,
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
        overrideWeightFloor: config.overrideWeightFloor
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error('[shadow-stxbp1-case-slice-handoff-floor] failed:', error);
  process.exit(1);
});
