import fs from 'node:fs/promises';
import path from 'node:path';
import { withClient } from '../db/pool.js';
import { extractDxPhenotypeInput, validateDxPhenotypeInput } from '../lib/phenopackets.js';
import { loadDxSimilarityIndex, rankGenesByPhenotypeSimilarity } from '../services/dx/similarityEngine.js';

const DEFAULTS = Object.freeze({
  casePath: '/Users/ahmedelmorshedy/Genovy/output/pheval-official-sample-100/phenopackets/PMID_35190816_STX_28944233_270001.json',
  truthGene: 'STXBP1',
  limit: 10000,
  outputJson: '/Users/ahmedelmorshedy/Genovy/output/audit-stxbp1-missed-case-28944233-270001.json'
});

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

function overlapDetails(index, supportDiseaseCurie, patientCurieSet) {
  const profile = index.diseaseProfiles.find((row) => row.entityCurie === supportDiseaseCurie);
  if (!profile) {
    return {
      directPhenotypeCount: 0,
      exactOverlapCount: 0,
      overlaps: []
    };
  }

  const overlaps = profile.phenotypes
    .filter((phenotype) => phenotype.edgeOrigin !== 'propagated' && patientCurieSet.has(phenotype.phenotypeCurie))
    .map((phenotype) => ({
      phenotypeCurie: phenotype.phenotypeCurie,
      phenotypeLabel: phenotype.phenotypeLabel,
      annotationCount: index.annotationCountByCurie.get(phenotype.phenotypeCurie) || null,
      infoContent: Number((index.infoContentByCurie.get(phenotype.phenotypeCurie) || 0).toFixed(6)),
      frequencyLabel: phenotype.frequencyLabel || '',
      referenceText: phenotype.referenceText || ''
    }))
    .sort((left, right) => {
      const leftCount = left.annotationCount ?? Number.MAX_SAFE_INTEGER;
      const rightCount = right.annotationCount ?? Number.MAX_SAFE_INTEGER;
      if (leftCount !== rightCount) {
        return leftCount - rightCount;
      }
      return right.infoContent - left.infoContent;
    });

  return {
    directPhenotypeCount: profile.directPhenotypeEdgeCount,
    exactOverlapCount: overlaps.length,
    overlaps
  };
}

function normalizePhenotypeDetails(index, phenotypeCuries) {
  return phenotypeCuries.map((curie) => ({
    phenotypeCurie: curie,
    phenotypeLabel: index.labelByCurie.get(curie) || curie,
    annotationCount: index.annotationCountByCurie.get(curie) || null,
    infoContent: Number((index.infoContentByCurie.get(curie) || 0).toFixed(6))
  }));
}

function summarizeRow(index, row, patientCurieSet) {
  if (!row) return null;
  return {
    rank: row.rank,
    geneLabel: row.geneLabel,
    normalizedScore: row.normalizedScore,
    directNormalizedScore: row.directNormalizedScore,
    diseaseSupportScore: row.diseaseSupportScore,
    patientAverageScore: row.patientAverageScore,
    phenotypeAverageScore: row.phenotypeAverageScore,
    directPhenotypeCount: row.directPhenotypeCount,
    matchedPhenotypeCount: row.matchedPhenotypeCount,
    supportingDiseaseCurie: row.supportingDiseaseCurie,
    supportingDiseaseLabel: row.supportingDiseaseLabel,
    supportingDiseaseClassification: row.supportingDiseaseClassification,
    supportingDiseaseEvidenceWeight: row.supportingDiseaseEvidenceWeight,
    supportOverlap: overlapDetails(index, row.supportingDiseaseCurie, patientCurieSet),
    trace: row.trace
  };
}

async function main() {
  const flags = parseArgs(process.argv.slice(2));
  const config = {
    casePath: flags['case-path'] || DEFAULTS.casePath,
    truthGene: flags['truth-gene'] || DEFAULTS.truthGene,
    limit: Number.parseInt(String(flags.limit || DEFAULTS.limit), 10),
    outputJson: flags['output-json'] || DEFAULTS.outputJson
  };

  const payload = JSON.parse(await fs.readFile(config.casePath, 'utf8'));
  const phenopacket = payload?.phenopacket || payload;
  const input = extractDxPhenotypeInput({ phenopacket });
  const validationError = validateDxPhenotypeInput(input);
  if (validationError) {
    throw new Error(validationError);
  }

  const result = await withClient(async (client) => {
    const index = await loadDxSimilarityIndex(client);
    const ranking = rankGenesByPhenotypeSimilarity(index, {
      phenotypeCuries: input.presentPhenotypeCuries,
      excludedPhenotypeCuries: input.excludedPhenotypeCuries,
      limit: config.limit
    });
    const patientCurieSet = new Set(input.presentPhenotypeCuries);
    const top1 = ranking.results[0] || null;
    const truth = ranking.results.find((row) => row.geneLabel === config.truthGene) || null;

    return {
      createdAt: new Date().toISOString(),
      caseId: path.basename(config.casePath).replace(/\.json$/, ''),
      truthGene: config.truthGene,
      totalDiseases: index.totalDiseases,
      patientPresentPhenotypes: normalizePhenotypeDetails(index, input.presentPhenotypeCuries),
      patientExcludedPhenotypes: normalizePhenotypeDetails(index, input.excludedPhenotypeCuries),
      top1: summarizeRow(index, top1, patientCurieSet),
      truth: summarizeRow(index, truth, patientCurieSet)
    };
  });

  await fs.writeFile(config.outputJson, `${JSON.stringify(result, null, 2)}\n`);
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
