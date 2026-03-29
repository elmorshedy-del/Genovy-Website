import fs from 'node:fs/promises';
import path from 'node:path';
import { withClient } from '../db/pool.js';
import { extractDxPhenotypeInput, validateDxPhenotypeInput } from '../lib/phenopackets.js';
import { loadDxSimilarityIndex, rankDiseasesByPhenotypeSimilarity } from '../services/dx/similarityEngine.js';

const DEFAULTS = Object.freeze({
  casePath: '/Users/ahmedelmorshedy/Genovy/output/pheval-official-sample-100/phenopackets/PMID_35190816_STX_28944233_270001.json',
  truthGene: 'STXBP1',
  targetDiseaseCuries: ['MONDO:0012812', 'MONDO:0100062'],
  targetPhenotypeCuries: ['HP:0000283', 'HP:0007021', 'HP:0001169', 'HP:0100710'],
  outputJson: '/Users/ahmedelmorshedy/Genovy/output/audit-stxbp1-disease-branch-selection-20260325.json'
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

function normalizeGeneLabel(value) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, ' ');
}

function parseList(value, fallback) {
  if (!value) return fallback;
  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildBestTermMatch(index, queryTerm, diseasePhenotypes) {
  let bestMatch = {
    patientPhenotypeCurie: queryTerm.phenotypeCurie,
    patientPhenotypeLabel: queryTerm.phenotypeLabel,
    diseasePhenotypeCurie: '',
    diseasePhenotypeLabel: '',
    micaCurie: '',
    micaLabel: '',
    score: 0,
    weightedScore: 0,
    phenotypeWeight: 0,
    edgeOrigin: '',
    evidenceCode: '',
    referenceText: '',
    frequencyCurie: '',
    frequencyLabel: ''
  };

  for (const diseasePhenotype of diseasePhenotypes) {
    const similarity = index.resolveSimilarity(queryTerm.phenotypeCurie, diseasePhenotype.phenotypeCurie);
    const phenotypeWeight = diseasePhenotype.phenotypeWeight || 1;
    const weightedScore = similarity.score * phenotypeWeight;
    if (weightedScore < bestMatch.weightedScore) {
      continue;
    }

    bestMatch = {
      patientPhenotypeCurie: queryTerm.phenotypeCurie,
      patientPhenotypeLabel: queryTerm.phenotypeLabel,
      diseasePhenotypeCurie: diseasePhenotype.phenotypeCurie,
      diseasePhenotypeLabel: diseasePhenotype.phenotypeLabel,
      micaCurie: similarity.micaCurie,
      micaLabel: index.labelByCurie.get(similarity.micaCurie) || similarity.micaCurie,
      score: similarity.score,
      weightedScore,
      phenotypeWeight,
      edgeOrigin: diseasePhenotype.edgeOrigin || '',
      evidenceCode: diseasePhenotype.evidenceCode || '',
      referenceText: diseasePhenotype.referenceText || '',
      frequencyCurie: diseasePhenotype.frequencyCurie || '',
      frequencyLabel: diseasePhenotype.frequencyLabel || ''
    };
  }

  return bestMatch;
}

function getDiseaseProfile(index, diseaseCurie) {
  return index.diseaseProfiles.find((row) => row.entityCurie === diseaseCurie) || null;
}

function buildDiseaseTermPresence(index, profile, targetPhenotypeCuries) {
  const targetCurieSet = new Set(targetPhenotypeCuries);
  const termRows = profile
    ? profile.phenotypes
        .filter((phenotype) => targetCurieSet.has(phenotype.phenotypeCurie))
        .map((phenotype) => ({
          phenotypeCurie: phenotype.phenotypeCurie,
          phenotypeLabel: phenotype.phenotypeLabel,
          edgeOrigin: phenotype.edgeOrigin || 'direct',
          frequencyLabel: phenotype.frequencyLabel || '',
          referenceText: phenotype.referenceText || ''
        }))
    : [];

  const directTerms = termRows.filter((row) => row.edgeOrigin !== 'propagated').map((row) => row.phenotypeLabel);
  const propagatedTerms = termRows.filter((row) => row.edgeOrigin === 'propagated').map((row) => row.phenotypeLabel);

  return {
    directTerms,
    propagatedTerms,
    terms: termRows
  };
}

function buildExactDirectOverlap(index, profile, patientCurieSet) {
  if (!profile) {
    return {
      exactDirectOverlapCount: 0,
      exactDirectOverlapTerms: []
    };
  }

  const exactDirectOverlapTerms = profile.phenotypes
    .filter((phenotype) => phenotype.edgeOrigin !== 'propagated' && patientCurieSet.has(phenotype.phenotypeCurie))
    .map((phenotype) => ({
      phenotypeCurie: phenotype.phenotypeCurie,
      phenotypeLabel: phenotype.phenotypeLabel,
      annotationCount: index.annotationCountByCurie.get(phenotype.phenotypeCurie) || null,
      infoContent: Number((index.infoContentByCurie.get(phenotype.phenotypeCurie) || 0).toFixed(6))
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
    exactDirectOverlapCount: exactDirectOverlapTerms.length,
    exactDirectOverlapTerms
  };
}

function buildMatchedPatientTerms(index, profile, patientPhenotypes) {
  if (!profile) return [];
  return patientPhenotypes
    .map((queryTerm) => buildBestTermMatch(index, queryTerm, profile.phenotypes))
    .filter((match) => match.score > 0)
    .map((match) => ({
      patientPhenotypeCurie: match.patientPhenotypeCurie,
      patientPhenotypeLabel: match.patientPhenotypeLabel,
      diseasePhenotypeCurie: match.diseasePhenotypeCurie,
      diseasePhenotypeLabel: match.diseasePhenotypeLabel,
      micaCurie: match.micaCurie,
      micaLabel: match.micaLabel,
      score: Number(match.score.toFixed(6)),
      weightedScore: Number(match.weightedScore.toFixed(6)),
      edgeOrigin: match.edgeOrigin,
      exact: match.patientPhenotypeCurie === match.diseasePhenotypeCurie
    }))
    .sort((left, right) => right.weightedScore - left.weightedScore);
}

function summarizeDiseaseScore(index, diseaseRow, patientPhenotypes, patientCurieSet) {
  const profile = getDiseaseProfile(index, diseaseRow.diseaseCurie);
  return {
    diseaseCurie: diseaseRow.diseaseCurie,
    diseaseLabel: diseaseRow.diseaseLabel,
    rank: diseaseRow.rank,
    normalizedScore: diseaseRow.normalizedScore,
    patientAverageScore: diseaseRow.patientAverageScore,
    phenotypeAverageScore: diseaseRow.diseaseAverageScore,
    matchedPhenotypeCount: diseaseRow.matchedPhenotypeCount,
    profileDirectPhenotypeCount: diseaseRow.profileDirectPhenotypeCount,
    profilePropagatedPhenotypeCount: diseaseRow.profilePropagatedPhenotypeCount,
    ...buildExactDirectOverlap(index, profile, patientCurieSet),
    matchedPatientTerms: buildMatchedPatientTerms(index, profile, patientPhenotypes)
  };
}

async function main() {
  const flags = parseArgs(process.argv.slice(2));
  const config = {
    casePath: flags['case-path'] || DEFAULTS.casePath,
    truthGene: flags['truth-gene'] || DEFAULTS.truthGene,
    targetDiseaseCuries: parseList(flags['target-diseases'], DEFAULTS.targetDiseaseCuries),
    targetPhenotypeCuries: parseList(flags['target-phenotypes'], DEFAULTS.targetPhenotypeCuries),
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
    const patientPhenotypes = input.presentPhenotypeCuries
      .filter((curie) => index.labelByCurie.has(curie))
      .map((curie) => ({
        phenotypeCurie: curie,
        phenotypeLabel: index.labelByCurie.get(curie) || curie
      }));
    const patientCurieSet = new Set(input.presentPhenotypeCuries);

    const stxbp1DiseaseLinks = [];
    for (const [diseaseCurie, links] of index.geneDiseaseSupportIndex.entries()) {
      const matchedLink = links.find((link) => normalizeGeneLabel(link.geneLabel) === normalizeGeneLabel(config.truthGene));
      if (!matchedLink) continue;
      const profile = getDiseaseProfile(index, diseaseCurie);
      stxbp1DiseaseLinks.push({
        diseaseCurie,
        diseaseLabel: matchedLink.diseaseLabel,
        classification: matchedLink.classification,
        supportWeight: matchedLink.supportWeight,
        ...buildDiseaseTermPresence(index, profile, config.targetPhenotypeCuries)
      });
    }

    stxbp1DiseaseLinks.sort((left, right) => left.diseaseLabel.localeCompare(right.diseaseLabel));

    const diseaseRanking = rankDiseasesByPhenotypeSimilarity(index, {
      phenotypeCuries: input.presentPhenotypeCuries,
      excludedPhenotypeCuries: input.excludedPhenotypeCuries,
      limit: index.totalDiseases
    });

    const targetDiseaseScores = config.targetDiseaseCuries.map((diseaseCurie) => {
      const diseaseRow = diseaseRanking.results.find((row) => row.diseaseCurie === diseaseCurie);
      if (!diseaseRow) {
        return {
          diseaseCurie,
          diseaseLabel: '',
          missingFromRanking: true
        };
      }
      return summarizeDiseaseScore(index, diseaseRow, patientPhenotypes, patientCurieSet);
    });

    return {
      createdAt: new Date().toISOString(),
      caseId: path.basename(config.casePath).replace(/\.json$/, ''),
      truthGene: config.truthGene,
      targetPhenotypes: config.targetPhenotypeCuries.map((curie) => ({
        phenotypeCurie: curie,
        phenotypeLabel: index.labelByCurie.get(curie) || curie,
        annotationCount: index.annotationCountByCurie.get(curie) || null,
        infoContent: Number((index.infoContentByCurie.get(curie) || 0).toFixed(6))
      })),
      stxbp1LinkedDiseases: stxbp1DiseaseLinks,
      targetDiseaseScores
    };
  });

  await fs.writeFile(config.outputJson, `${JSON.stringify(result, null, 2)}\n`);
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
