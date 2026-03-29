import fs from 'node:fs/promises';
import path from 'node:path';
import { DX_QUERY_DEFAULTS, DX_SIMILARITY_DEFAULTS } from '../constants/dx.js';
import { withClient } from '../db/pool.js';
import { extractDxPhenotypeInput, validateDxPhenotypeInput } from '../lib/phenopackets.js';
import { loadDxSimilarityIndex, rankGenesByPhenotypeSimilarity } from '../services/dx/similarityEngine.js';
import { extractTruthGeneKeys, normalizeGeneKey, parseArgs } from './lib/shadowBenchmarkUtils.js';

const DEFAULTS = Object.freeze({
  casePath: '/Users/ahmedelmorshedy/Genovy/output/pheval-official-sample-100/phenopackets/PMID_36331550_Family16Patient21.json',
  outputJson: '/Users/ahmedelmorshedy/Genovy/output/shadow-sptan1-topk-gene-profile.json',
  outputMd: '/Users/ahmedelmorshedy/Genovy/output/shadow-sptan1-topk-gene-profile.md',
  limit: 2000,
  topKValues: [4, 8, 12, 16, 24, 32, 48, 64]
});

function average(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function weightedAverage(entries) {
  if (!entries.length) return 0;
  const totalWeight = entries.reduce((sum, entry) => sum + Math.max(0, entry.weight || 0), 0);
  if (totalWeight <= 0) return 0;
  return entries.reduce((sum, entry) => sum + (entry.value || 0) * Math.max(0, entry.weight || 0), 0) / totalWeight;
}

function clamp(value, minValue, maxValue) {
  return Math.max(minValue, Math.min(maxValue, value));
}

function normalizeSimilarityScore(index, rawScore) {
  if (index.maxInfoContent <= 0) return 0;
  return rawScore / index.maxInfoContent;
}

function buildPatientPhenotypeTerms(index, phenotypeCuries) {
  return phenotypeCuries
    .filter((curie) => index.labelByCurie.has(curie))
    .map((curie) => ({
      phenotypeCurie: curie,
      phenotypeLabel: index.labelByCurie.get(curie) || curie
    }));
}

function buildBestTermMatch(index, queryTerm, profilePhenotypes) {
  let bestMatch = {
    score: DX_SIMILARITY_DEFAULTS.rootSimilarityFloor,
    weightedScore: DX_SIMILARITY_DEFAULTS.rootSimilarityFloor
  };

  for (const phenotype of profilePhenotypes) {
    const similarity = index.resolveSimilarity(queryTerm.phenotypeCurie, phenotype.phenotypeCurie);
    const phenotypeWeight = phenotype.phenotypeWeight || DX_SIMILARITY_DEFAULTS.defaultPhenotypeWeight;
    const weightedScore = similarity.score * phenotypeWeight;
    if (weightedScore < bestMatch.weightedScore) {
      continue;
    }
    bestMatch = {
      score: similarity.score,
      weightedScore,
      phenotypeWeight
    };
  }

  return bestMatch;
}

function buildSymmetricGeneMatch(index, phenotype, queryPhenotypes) {
  let bestScore = DX_SIMILARITY_DEFAULTS.rootSimilarityFloor;
  for (const queryPhenotype of queryPhenotypes) {
    const similarity = index.resolveSimilarity(phenotype.phenotypeCurie, queryPhenotype.phenotypeCurie);
    if (similarity.score > bestScore) {
      bestScore = similarity.score;
    }
  }
  return {
    score: bestScore,
    weightedScore: bestScore * (phenotype.phenotypeWeight || DX_SIMILARITY_DEFAULTS.defaultPhenotypeWeight),
    phenotypeWeight: phenotype.phenotypeWeight || DX_SIMILARITY_DEFAULTS.defaultPhenotypeWeight
  };
}

function buildShadowDirectRanking(index, queryPhenotypes, topK) {
  const combinedByGeneKey = new Map();

  for (const profile of index.geneProfiles) {
    const patientToGeneMatches = queryPhenotypes.map((queryPhenotype) => buildBestTermMatch(index, queryPhenotype, profile.phenotypes));
    const geneToPatientMatches = profile.phenotypes.map((phenotype) => buildSymmetricGeneMatch(index, phenotype, queryPhenotypes));
    const topKMatches = [...geneToPatientMatches]
      .sort((left, right) => right.weightedScore - left.weightedScore)
      .slice(0, Math.max(1, topK));

    const patientAverageScore = average(patientToGeneMatches.map((match) => match.weightedScore));
    const phenotypeAverageScore = weightedAverage(
      topKMatches.map((match) => ({ value: match.score, weight: match.phenotypeWeight }))
    );
    const bmaScore = (patientAverageScore + phenotypeAverageScore) / 2;
    const normalizedScore = Number(
      clamp(normalizeSimilarityScore(index, bmaScore), 0, 1).toFixed(DX_SIMILARITY_DEFAULTS.normalizedScorePrecision)
    );

    const geneKey = normalizeGeneKey(profile.entityLabel || profile.entityCurie);
    const existing = combinedByGeneKey.get(geneKey);
    if (!existing || normalizedScore > existing.directNormalizedScore) {
      combinedByGeneKey.set(geneKey, {
        geneCurie: profile.entityCurie,
        geneLabel: profile.entityLabel,
        geneSymbol: profile.entityLabel,
        directNormalizedScore: normalizedScore,
        patientAverageScore,
        phenotypeAverageScore,
        directPhenotypeCount: profile.phenotypes.length,
        matchedPhenotypeCount: patientToGeneMatches.filter((match) => match.score > 0).length,
        topKUsed: Math.min(profile.phenotypes.length, Math.max(1, topK))
      });
    }
  }

  return combinedByGeneKey;
}

function buildCombinedShadowRanking(baselineRanking, shadowDirectByGeneKey, limit) {
  const rows = baselineRanking.results.map((row) => {
    const geneKey = normalizeGeneKey(row.geneLabel || row.geneCurie);
    const shadowDirect = shadowDirectByGeneKey.get(geneKey);
    const shadowDirectNormalizedScore = shadowDirect?.directNormalizedScore ?? row.directNormalizedScore ?? 0;
    const shadowNormalizedScore = Number(
      Math.max(shadowDirectNormalizedScore, row.diseaseSupportScore || 0).toFixed(DX_SIMILARITY_DEFAULTS.normalizedScorePrecision)
    );

    return {
      ...row,
      shadowDirectNormalizedScore,
      shadowNormalizedScore,
      shadowPatientAverageScore: shadowDirect?.patientAverageScore ?? row.patientAverageScore ?? 0,
      shadowPhenotypeAverageScore: shadowDirect?.phenotypeAverageScore ?? row.phenotypeAverageScore ?? 0,
      shadowTopKUsed: shadowDirect?.topKUsed ?? null
    };
  });

  return rows
    .sort((left, right) => {
      if (right.shadowNormalizedScore !== left.shadowNormalizedScore) {
        return right.shadowNormalizedScore - left.shadowNormalizedScore;
      }
      if (right.shadowDirectNormalizedScore !== left.shadowDirectNormalizedScore) {
        return right.shadowDirectNormalizedScore - left.shadowDirectNormalizedScore;
      }
      if ((right.diseaseSupportScore || 0) !== (left.diseaseSupportScore || 0)) {
        return (right.diseaseSupportScore || 0) - (left.diseaseSupportScore || 0);
      }
      return String(left.geneLabel || '').localeCompare(String(right.geneLabel || ''));
    })
    .slice(0, limit)
    .map((row, indexValue) => ({
      ...row,
      shadowRank: indexValue + 1
    }));
}

function findTruthRow(rows, truthGeneKeys, rankField) {
  const truthKeySet = new Set(truthGeneKeys);
  return (
    rows.find((row) =>
      [
        normalizeGeneKey(row.geneLabel),
        normalizeGeneKey(row.geneSymbol),
        normalizeGeneKey(row.geneCurie),
        normalizeGeneKey(row.geneIdentifier)
      ].some((key) => truthKeySet.has(key))
    ) || null
  );
}

function buildMarkdown({ caseId, truthGene, baselineTruthRow, variants, presentPhenotypes, excludedCount }) {
  const lines = [
    '# SPTAN1 Top-K Gene-Profile Shadow Test',
    '',
    `Case: ${caseId}`,
    `Truth gene: ${truthGene}`,
    `Present phenotypes: ${presentPhenotypes.join(', ')}`,
    `Excluded phenotype count: ${excludedCount}`,
    '',
    '## Baseline Truth Row',
    '',
    `- baseline rank: ${baselineTruthRow?.rank ?? 'miss'}`,
    `- normalized score: ${baselineTruthRow?.normalizedScore ?? 'n/a'}`,
    `- direct normalized score: ${baselineTruthRow?.directNormalizedScore ?? 'n/a'}`,
    `- disease support score: ${baselineTruthRow?.diseaseSupportScore ?? 'n/a'}`,
    `- direct phenotype count: ${baselineTruthRow?.directPhenotypeCount ?? 'n/a'}`,
    `- supporting disease: ${baselineTruthRow?.supportingDiseaseCurie || ''} ${baselineTruthRow?.supportingDiseaseLabel || ''}`,
    '',
    '## Shadow Variants',
    '',
    '| Top-K | Truth rank | Shadow direct | Final score | Top gene | Top gene score |', 
    '|---:|---:|---:|---:|---|---:|'
  ];

  for (const variant of variants) {
    lines.push(
      `| ${variant.topK} | ${variant.truthRank ?? 'miss'} | ${variant.truthRow?.shadowDirectNormalizedScore ?? 'n/a'} | ${variant.truthRow?.shadowNormalizedScore ?? 'n/a'} | ${variant.topGenes[0]?.geneLabel || ''} | ${variant.topGenes[0]?.shadowNormalizedScore ?? 'n/a'} |`
    );
  }

  for (const variant of variants) {
    lines.push('', `## Top-K ${variant.topK}`, '');
    lines.push(
      `- truth rank: ${variant.truthRank ?? 'miss'}`
    );
    lines.push(
      `- truth direct score: ${variant.truthRow?.shadowDirectNormalizedScore ?? 'n/a'}`
    );
    lines.push(
      `- truth final score: ${variant.truthRow?.shadowNormalizedScore ?? 'n/a'}`
    );
    lines.push('', '| Rank | Gene | Final score | Direct score | Disease support | Direct phenotypes |', '|---:|---|---:|---:|---:|---:|');
    for (const row of variant.topGenes) {
      lines.push(
        `| ${row.shadowRank} | ${row.geneLabel} | ${row.shadowNormalizedScore} | ${row.shadowDirectNormalizedScore} | ${row.diseaseSupportScore} | ${row.directPhenotypeCount} |`
      );
    }
  }

  return lines.join('\n');
}

async function main() {
  const flags = parseArgs(process.argv.slice(2));
  const config = {
    casePath: flags['case-path'] || DEFAULTS.casePath,
    outputJson: flags['output-json'] || DEFAULTS.outputJson,
    outputMd: flags['output-md'] || DEFAULTS.outputMd,
    limit: Number.parseInt(String(flags.limit || DEFAULTS.limit), 10),
    topKValues: String(flags['top-k'] || DEFAULTS.topKValues.join(','))
      .split(',')
      .map((value) => Number.parseInt(value.trim(), 10))
      .filter((value) => Number.isInteger(value) && value > 0)
  };

  const payload = JSON.parse(await fs.readFile(config.casePath, 'utf8'));
  const phenopacket = payload?.phenopacket || payload;
  const caseId = path.basename(config.casePath).replace(/\.json$/, '');
  const input = extractDxPhenotypeInput({ phenopacket });
  const validationError = validateDxPhenotypeInput(input);
  if (validationError) {
    throw new Error(validationError);
  }
  const truthGeneKeys = extractTruthGeneKeys(phenopacket);
  const truthGene = truthGeneKeys.find((key) => key.startsWith('symbol:'))?.split(':', 2)[1] || truthGeneKeys[0] || 'unknown';

  const result = await withClient(async (client) => {
    const index = await loadDxSimilarityIndex(client, { forceRefresh: true });
    const queryPhenotypes = buildPatientPhenotypeTerms(index, input.presentPhenotypeCuries);
    const baselineRanking = rankGenesByPhenotypeSimilarity(index, {
      phenotypeCuries: input.presentPhenotypeCuries,
      excludedPhenotypeCuries: input.excludedPhenotypeCuries,
      limit: config.limit
    });
    const baselineTruthRow = findTruthRow(baselineRanking.results, truthGeneKeys, 'rank');

    const variants = config.topKValues.map((topK) => {
      const shadowDirectByGeneKey = buildShadowDirectRanking(index, queryPhenotypes, topK);
      const shadowRows = buildCombinedShadowRanking(baselineRanking, shadowDirectByGeneKey, config.limit);
      const truthRow = findTruthRow(shadowRows, truthGeneKeys, 'shadowRank');
      return {
        topK,
        truthRank: truthRow?.shadowRank ?? null,
        truthRow: truthRow
          ? {
              shadowRank: truthRow.shadowRank,
              shadowNormalizedScore: truthRow.shadowNormalizedScore,
              shadowDirectNormalizedScore: truthRow.shadowDirectNormalizedScore,
              diseaseSupportScore: truthRow.diseaseSupportScore,
              shadowPatientAverageScore: truthRow.shadowPatientAverageScore,
              shadowPhenotypeAverageScore: truthRow.shadowPhenotypeAverageScore,
              directPhenotypeCount: truthRow.directPhenotypeCount
            }
          : null,
        topGenes: shadowRows.slice(0, 10).map((row) => ({
          shadowRank: row.shadowRank,
          geneLabel: row.geneLabel,
          shadowNormalizedScore: row.shadowNormalizedScore,
          shadowDirectNormalizedScore: row.shadowDirectNormalizedScore,
          diseaseSupportScore: row.diseaseSupportScore,
          directPhenotypeCount: row.directPhenotypeCount
        }))
      };
    });

    return {
      case_id: caseId,
      truth_gene: truthGene,
      truth_gene_keys: truthGeneKeys,
      patient_present_phenotype_curies: input.presentPhenotypeCuries,
      patient_excluded_phenotype_count: input.excludedPhenotypeCuries.length,
      baseline_truth_row: baselineTruthRow,
      variants
    };
  });

  const markdown = buildMarkdown({
    caseId: result.case_id,
    truthGene: result.truth_gene,
    baselineTruthRow: result.baseline_truth_row,
    variants: result.variants,
    presentPhenotypes: result.patient_present_phenotype_curies,
    excludedCount: result.patient_excluded_phenotype_count
  });

  await fs.mkdir(path.dirname(config.outputJson), { recursive: true });
  await Promise.all([
    fs.writeFile(
      config.outputJson,
      JSON.stringify(
        {
          created_at: new Date().toISOString(),
          case_path: config.casePath,
          top_k_values: config.topKValues,
          ...result
        },
        null,
        2
      )
    ),
    fs.writeFile(config.outputMd, markdown)
  ]);

  console.log(
    JSON.stringify(
      {
        outputJson: config.outputJson,
        outputMd: config.outputMd,
        baselineTruthRank: result.baseline_truth_row?.rank ?? null,
        variants: result.variants.map((variant) => ({
          topK: variant.topK,
          truthRank: variant.truthRank,
          truthFinalScore: variant.truthRow?.shadowNormalizedScore ?? null
        }))
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
