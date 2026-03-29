import fs from 'node:fs/promises';
import path from 'node:path';
import { withClient } from '../db/pool.js';
import { extractDxPhenotypeInput, validateDxPhenotypeInput } from '../lib/phenopackets.js';
import { loadDxPhenotypeOntologyRows } from '../repositories/dxRepository.js';
import { buildDxSimilarityIndex, rankGenesByPhenotypeSimilarity } from '../services/dx/similarityEngine.js';
import { extractTruthGeneKeys, findTruthRank } from './lib/shadowBenchmarkUtils.js';

const DEFAULTS = Object.freeze({
  phenopacketDir:
    '/Users/ahmedelmorshedy/Genovy-phenotype-enrichment-20260316-0914/preservation/original-output-snapshot-20260326/pheval-official-sample-100/phenopackets',
  outputJson:
    '/Users/ahmedelmorshedy/Genovy-phenotype-enrichment-20260316-0914/output/shadow-ppp2r1a-truth-headtohead-20260327.json',
  outputMd:
    '/Users/ahmedelmorshedy/Genovy-phenotype-enrichment-20260316-0914/output/shadow-ppp2r1a-truth-headtohead-20260327.md'
});

const TARGET_CASES = Object.freeze([
  {
    fileName: 'PMID_37761890_41.json',
    rivalGeneCurie: 'NCBIGene:3183',
    rivalGeneLabel: 'HNRNPC'
  },
  {
    fileName: 'PMID_37761890_43.json',
    rivalGeneCurie: 'NCBIGene:23499',
    rivalGeneLabel: 'MACF1'
  }
]);

const TRUTH_GENE_CURIE = 'NCBIGene:5518';
const TARGET_DISEASE_CURIE = 'MONDO:0014605';
const PRESENT_STATUS = 'present';
const DIRECT_EDGE_ORIGIN = 'direct';
const PROPAGATED_EDGE_ORIGIN = 'propagated';
const TARGET_DISEASE_CURES = Object.freeze(['MONDO:0014605', 'MONDO:0958203', 'MONDO:0032677']);

const TRUTH_TERMS = Object.freeze([
  { curie: 'HP:0001263', referenceText: 'OMIM:616362 / GeneReviews:NBK580243' },
  { curie: 'HP:0000750', referenceText: 'GeneReviews:NBK580243' },
  { curie: 'HP:0001270', referenceText: 'GeneReviews:NBK580243' },
  { curie: 'HP:0001252', referenceText: 'OMIM:616362 / GeneReviews:NBK580243' },
  { curie: 'HP:0011968', referenceText: 'GeneReviews:NBK580243 / PMID:37761890' },
  { curie: 'HP:0001250', referenceText: 'OMIM:616362 / GeneReviews:NBK580243 / PMID:37761890' },
  { curie: 'HP:0000252', referenceText: 'GeneReviews:NBK580243 / PMID:37761890' },
  { curie: 'HP:0001274', referenceText: 'OMIM:616362 / GeneReviews:NBK580243' },
  { curie: 'HP:0002079', referenceText: 'OMIM:616362 / GeneReviews:NBK580243' },
  { curie: 'HP:0007018', referenceText: 'GeneReviews:NBK580243' },
  { curie: 'HP:0004322', referenceText: 'GeneReviews:NBK580243' },
  { curie: 'HP:0002342', referenceText: 'GeneReviews:NBK580243' }
]);

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

async function loadNarrowInputs(geneCuries) {
  return withClient(async (client) => {
    const ontologyRows = await loadDxPhenotypeOntologyRows(client);
    const typedDiseaseRows = await client
      .query(
        `
          SELECT DISTINCT ON (disease.entity_id, phenotype.entity_id, clinical_phenotype_assertions.presence_status)
            disease.entity_id AS disease_entity_id,
            disease.canonical_curie AS disease_curie,
            disease.canonical_label AS disease_label,
            phenotype.entity_id AS phenotype_entity_id,
            phenotype.canonical_curie AS phenotype_curie,
            phenotype.canonical_label AS phenotype_label,
            clinical_phenotype_assertions.presence_status AS presence_status,
            clinical_phenotype_assertions.source_key AS source_key,
            clinical_phenotype_assertions.source_record_key AS source_record_key,
            '${DIRECT_EDGE_ORIGIN}' AS phenotype_edge_origin,
            clinical_phenotype_assertions.reference_text AS reference_text,
            clinical_phenotype_assertions.evidence_code AS evidence_code,
            onset.canonical_curie AS onset_curie,
            onset.canonical_label AS onset_label,
            COALESCE(frequency.canonical_curie, NULLIF(clinical_phenotype_assertions.payload_json->>'frequency', '')) AS frequency_curie,
            COALESCE(frequency.canonical_label, NULLIF(clinical_phenotype_assertions.payload_json->>'frequency', '')) AS frequency_label,
            modifier.canonical_curie AS modifier_curie,
            modifier.canonical_label AS modifier_label,
            COALESCE(clinical_phenotype_assertions.sex, '') AS sex,
            COALESCE(clinical_phenotype_assertions.aspect, '') AS aspect,
            'typed_assertions' AS row_source_mode
          FROM clinical_phenotype_assertions
          INNER JOIN entities disease
            ON disease.entity_id = clinical_phenotype_assertions.subject_entity_id
          INNER JOIN entities phenotype
            ON phenotype.entity_id = clinical_phenotype_assertions.phenotype_entity_id
          LEFT JOIN entities onset
            ON onset.entity_id = clinical_phenotype_assertions.onset_entity_id
          LEFT JOIN entities frequency
            ON frequency.entity_id = clinical_phenotype_assertions.frequency_entity_id
          LEFT JOIN entities modifier
            ON modifier.entity_id = clinical_phenotype_assertions.modifier_entity_id
          WHERE disease.entity_type = 'disease'
            AND disease.is_placeholder = FALSE
            AND disease.canonical_curie = ANY($1::text[])
          ORDER BY disease.entity_id, phenotype.entity_id, clinical_phenotype_assertions.presence_status,
            clinical_phenotype_assertions.observed_at DESC
        `,
        [TARGET_DISEASE_CURES]
      )
      .then((result) => result.rows)
      .catch((error) => {
        if (!['42P01', '42703'].includes(error?.code)) {
          throw error;
        }
        return [];
      });

    const fallbackDiseaseRows = await client
      .query(
        `
          SELECT DISTINCT ON (disease.entity_id, phenotype.entity_id, rel.predicate_key)
            disease.entity_id AS disease_entity_id,
            disease.canonical_curie AS disease_curie,
            disease.canonical_label AS disease_label,
            phenotype.entity_id AS phenotype_entity_id,
            phenotype.canonical_curie AS phenotype_curie,
            phenotype.canonical_label AS phenotype_label,
            CASE
              WHEN rel.predicate_key = 'lacks_phenotype' THEN 'absent'
              ELSE 'present'
            END AS presence_status,
            COALESCE(evidence.source_key, rel.primary_source_key, '') AS source_key,
            COALESCE(evidence.source_record_key, '') AS source_record_key,
            CASE
              WHEN COALESCE(evidence.source_record_key, '') LIKE 'phenotype-propagation:%' THEN '${PROPAGATED_EDGE_ORIGIN}'
              ELSE '${DIRECT_EDGE_ORIGIN}'
            END AS phenotype_edge_origin,
            COALESCE(evidence.payload_json->>'reference', '') AS reference_text,
            COALESCE(evidence.evidence_code, '') AS evidence_code,
            NULLIF(evidence.payload_json->>'onset', '') AS onset_curie,
            NULLIF(evidence.payload_json->>'onset', '') AS onset_label,
            NULLIF(evidence.payload_json->>'frequency', '') AS frequency_curie,
            NULLIF(evidence.payload_json->>'frequency', '') AS frequency_label,
            NULLIF(evidence.payload_json->>'modifier', '') AS modifier_curie,
            NULLIF(evidence.payload_json->>'modifier', '') AS modifier_label,
            COALESCE(evidence.payload_json->>'sex', '') AS sex,
            COALESCE(evidence.payload_json->>'aspect', '') AS aspect,
            'relationship_fallback' AS row_source_mode
          FROM relationships rel
          INNER JOIN entities disease
            ON disease.entity_id = rel.subject_entity_id
          INNER JOIN entities phenotype
            ON phenotype.entity_id = rel.object_entity_id
          LEFT JOIN LATERAL (
            SELECT
              relationship_evidence.source_key,
              relationship_evidence.source_record_key,
              relationship_evidence.evidence_code,
              relationship_evidence.payload_json,
              relationship_evidence.observed_at
            FROM relationship_evidence
            WHERE relationship_evidence.relationship_id = rel.relationship_id
            ORDER BY relationship_evidence.observed_at DESC
            LIMIT 1
          ) AS evidence
            ON TRUE
          WHERE rel.predicate_key IN ('has_phenotype', 'lacks_phenotype')
            AND disease.entity_type = 'disease'
            AND disease.is_placeholder = FALSE
            AND phenotype.entity_type = 'phenotype'
            AND disease.canonical_curie = ANY($1::text[])
          ORDER BY disease.entity_id, phenotype.entity_id, rel.predicate_key, evidence.observed_at DESC NULLS LAST
        `,
        [TARGET_DISEASE_CURES]
      )
      .then((result) => result.rows);

    const diseaseRowByKey = new Map();
    for (const row of [...fallbackDiseaseRows, ...typedDiseaseRows]) {
      const key = `${row.disease_entity_id}|${row.phenotype_entity_id}|${row.presence_status || PRESENT_STATUS}`;
      if (!diseaseRowByKey.has(key) || row.row_source_mode === 'typed_assertions') {
        diseaseRowByKey.set(key, row);
      }
    }
    const diseasePhenotypeRows = [...diseaseRowByKey.values()];

    const filteredSupportRows = await client
      .query(
        `
          SELECT DISTINCT ON (gene.entity_id, disease.entity_id)
            gene.entity_id AS gene_entity_id,
            gene.canonical_curie AS gene_curie,
            gene.canonical_label AS gene_label,
            disease.entity_id AS disease_entity_id,
            disease.canonical_curie AS disease_curie,
            disease.canonical_label AS disease_label,
            COALESCE(validity.classification, '') AS classification,
            COALESCE(validity.mode_of_inheritance, '') AS mode_of_inheritance,
            COALESCE(evidence.evidence_code, '') AS evidence_code
          FROM relationships rel
          INNER JOIN entities gene
            ON gene.entity_id = rel.subject_entity_id
          INNER JOIN entities disease
            ON disease.entity_id = rel.object_entity_id
          LEFT JOIN LATERAL (
            SELECT
              relationship_evidence.evidence_code,
              relationship_evidence.observed_at
            FROM relationship_evidence
            WHERE relationship_evidence.relationship_id = rel.relationship_id
            ORDER BY relationship_evidence.observed_at DESC
            LIMIT 1
          ) AS evidence
            ON TRUE
          LEFT JOIN LATERAL (
            SELECT
              clinical_gene_disease_validity_assertions.classification,
              clinical_gene_disease_validity_assertions.mode_of_inheritance,
              clinical_gene_disease_validity_assertions.classification_date
            FROM clinical_gene_disease_validity_assertions
            WHERE clinical_gene_disease_validity_assertions.gene_entity_id = gene.entity_id
              AND clinical_gene_disease_validity_assertions.disease_entity_id = disease.entity_id
            ORDER BY clinical_gene_disease_validity_assertions.classification_date DESC NULLS LAST,
              clinical_gene_disease_validity_assertions.observed_at DESC
            LIMIT 1
          ) AS validity
            ON TRUE
          WHERE rel.predicate_key = 'associated_with_disease'
            AND gene.entity_type = 'gene'
            AND gene.is_placeholder = FALSE
            AND disease.entity_type = 'disease'
            AND disease.is_placeholder = FALSE
            AND gene.canonical_curie = ANY($1::text[])
            AND disease.canonical_curie = ANY($2::text[])
          ORDER BY gene.entity_id, disease.entity_id,
            CASE COALESCE(validity.classification, '')
              WHEN 'Definitive' THEN 7
              WHEN 'Strong' THEN 6
              WHEN 'Moderate' THEN 5
              WHEN 'Limited' THEN 4
              WHEN 'Disputed' THEN 2
              WHEN 'Refuted' THEN 1
              ELSE 3
            END DESC,
            evidence.observed_at DESC NULLS LAST
        `,
        [[TRUTH_GENE_CURIE, ...geneCuries], TARGET_DISEASE_CURES]
      )
      .then((result) => result.rows);
    const genePhenotypeRows = await client
      .query(
        `
          SELECT DISTINCT ON (gene.entity_id, phenotype.entity_id)
            gene.entity_id AS gene_entity_id,
            gene.canonical_curie AS gene_curie,
            gene.canonical_label AS gene_label,
            phenotype.entity_id AS phenotype_entity_id,
            phenotype.canonical_curie AS phenotype_curie,
            phenotype.canonical_label AS phenotype_label,
            COALESCE(evidence.payload_json->>'disease_id', '') AS reference_context,
            COALESCE(evidence.evidence_code, '') AS evidence_code
          FROM relationships rel
          INNER JOIN entities gene
            ON gene.entity_id = rel.subject_entity_id
          INNER JOIN entities phenotype
            ON phenotype.entity_id = rel.object_entity_id
          LEFT JOIN LATERAL (
            SELECT
              relationship_evidence.evidence_code,
              relationship_evidence.payload_json,
              relationship_evidence.observed_at
            FROM relationship_evidence
            WHERE relationship_evidence.relationship_id = rel.relationship_id
            ORDER BY relationship_evidence.observed_at DESC
            LIMIT 1
          ) AS evidence
            ON TRUE
          WHERE rel.predicate_key = 'associated_with_phenotype'
            AND gene.entity_type = 'gene'
            AND gene.is_placeholder = FALSE
            AND phenotype.entity_type = 'phenotype'
            AND gene.canonical_curie = ANY($1::text[])
          ORDER BY gene.entity_id, phenotype.entity_id, evidence.observed_at DESC NULLS LAST
        `,
        [[TRUTH_GENE_CURIE, ...geneCuries]]
      )
      .then((result) => result.rows);

    const candidatePhenotypes = await client
      .query(
        `
          SELECT entity_id, canonical_curie, canonical_label
          FROM entities
          WHERE entity_type = 'phenotype'
            AND canonical_curie = ANY($1::text[])
          ORDER BY canonical_curie ASC
        `,
        [TRUTH_TERMS.map((term) => term.curie)]
      )
      .then((result) => result.rows);

    return {
      ontologyRows,
      diseasePhenotypeRows,
      geneDiseaseSupportRows: filteredSupportRows,
      genePhenotypeRows,
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

function buildShadowRows({ diseasePhenotypeRows, diseaseMetaIndex, candidatePhenotypes }) {
  const diseaseMeta = diseaseMetaIndex.get(TARGET_DISEASE_CURIE);
  if (!diseaseMeta) {
    throw new Error(`Unable to resolve target disease metadata for ${TARGET_DISEASE_CURIE}.`);
  }

  const candidateByCurie = new Map(candidatePhenotypes.map((row) => [row.canonical_curie, row]));
  const existingDirectPresentRows = diseasePhenotypeRows.filter(
    (row) =>
      row.disease_curie === TARGET_DISEASE_CURIE &&
      (row.presence_status || PRESENT_STATUS) === PRESENT_STATUS &&
      (row.phenotype_edge_origin || DIRECT_EDGE_ORIGIN) === DIRECT_EDGE_ORIGIN
  );
  const existingPhenotypeCuries = new Set(existingDirectPresentRows.map((row) => row.phenotype_curie));

  const shadowAddedTerms = [];
  const skippedExistingTerms = [];
  const missingFromOntology = [];

  for (const targetTerm of TRUTH_TERMS) {
    if (existingPhenotypeCuries.has(targetTerm.curie)) {
      skippedExistingTerms.push(targetTerm.curie);
      continue;
    }

    const phenotype = candidateByCurie.get(targetTerm.curie);
    if (!phenotype) {
      missingFromOntology.push(targetTerm.curie);
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
      source_key: 'shadow_ppp2r1a_truth_headtohead',
      source_record_key: `shadow_ppp2r1a_truth_headtohead:${diseaseMeta.disease_curie}:${phenotype.canonical_curie}`,
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
      row_source_mode: 'shadow_ppp2r1a_truth_headtohead'
    });
  }

  return { shadowAddedTerms, skippedExistingTerms, missingFromOntology };
}

function buildFilteredIndex(index, allowedLabels) {
  return {
    ...index,
    geneProfiles: index.geneProfiles.filter((profile) => allowedLabels.has(profile.entityLabel))
  };
}

function buildCaseResult(results, truthGeneKeys) {
  const truthRank = findTruthRank(results, truthGeneKeys);
  const truthRow = truthRank == null ? null : results.find((row) => row.rank === truthRank) || null;
  return {
    truth: summarizeGeneRow(truthRow),
    top1: summarizeGeneRow(results[0] || null)
  };
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# PPP2R1A Truth Head-to-Head Shadow');
  lines.push('');
  lines.push(`Created: ${report.createdAt}`);
  lines.push('');
  lines.push(`Added terms: ${report.shadowAddedTerms.length}`);
  lines.push(`Skipped existing: ${report.skippedExistingTerms.length}`);
  lines.push(`Missing from ontology: ${report.missingFromOntology.length}`);
  lines.push('');

  for (const item of report.perCase) {
    lines.push(`## ${item.caseId}`);
    lines.push('');
    lines.push(
      `- baseline truth ${item.baseline.truth?.rank ?? 'miss'} / top1 ${item.baseline.top1?.geneLabel ?? 'n/a'}`
    );
    lines.push(
      `- shadow truth ${item.shadow.truth?.rank ?? 'miss'} / top1 ${item.shadow.top1?.geneLabel ?? 'n/a'}`
    );
    lines.push('');
  }

  return `${lines.join('\n')}\n`;
}

async function main() {
  const flags = parseArgs(process.argv.slice(2));
  const phenopacketDir = flags['phenopacket-dir'] || DEFAULTS.phenopacketDir;
  const outputJson = flags['output-json'] || DEFAULTS.outputJson;
  const outputMd = flags['output-md'] || DEFAULTS.outputMd;

  const targetCases = await Promise.all(TARGET_CASES.map(async (item) => ({ ...item, ...(await loadCasePacket(phenopacketDir, item.fileName)) })));
  const rivalGeneCuries = new Set(targetCases.map((item) => item.rivalGeneCurie));
  const rivalGeneLabels = new Set(targetCases.map((item) => item.rivalGeneLabel));

  const { ontologyRows, diseasePhenotypeRows, genePhenotypeRows, geneDiseaseSupportRows, candidatePhenotypes } =
    await loadNarrowInputs(rivalGeneCuries);
  const diseaseMetaIndex = buildDiseaseMetaIndex(diseasePhenotypeRows, geneDiseaseSupportRows);
  const { shadowAddedTerms, skippedExistingTerms, missingFromOntology } = buildShadowRows({
    diseasePhenotypeRows,
    diseaseMetaIndex,
    candidatePhenotypes
  });

  const baselineIndex = buildFilteredIndex(
    buildDxSimilarityIndex({
      ontologyRows,
      diseasePhenotypeRows,
      genePhenotypeRows,
      geneDiseaseSupportRows
    }),
    new Set(['PPP2R1A', ...rivalGeneLabels])
  );

  const shadowIndex = buildFilteredIndex(
    buildDxSimilarityIndex({
      ontologyRows,
      diseasePhenotypeRows: [...diseasePhenotypeRows, ...shadowAddedTerms],
      genePhenotypeRows,
      geneDiseaseSupportRows
    }),
    new Set(['PPP2R1A', ...rivalGeneLabels])
  );

  const perCase = [];

  for (const targetCase of targetCases) {
    const baselineResults = rankGenesByPhenotypeSimilarity(baselineIndex, {
      phenotypeCuries: targetCase.phenotypeCuries,
      excludedPhenotypeCuries: targetCase.excludedPhenotypeCuries,
      limit: 10
    }).results;
    const shadowResults = rankGenesByPhenotypeSimilarity(shadowIndex, {
      phenotypeCuries: targetCase.phenotypeCuries,
      excludedPhenotypeCuries: targetCase.excludedPhenotypeCuries,
      limit: 10
    }).results;

    perCase.push({
      caseId: targetCase.caseId,
      rivalGeneLabel: targetCase.rivalGeneLabel,
      baseline: buildCaseResult(baselineResults, targetCase.truthGeneKeys),
      shadow: buildCaseResult(shadowResults, targetCase.truthGeneKeys)
    });
  }

  const report = {
    createdAt: new Date().toISOString(),
    shadowAddedTerms,
    skippedExistingTerms,
    missingFromOntology,
    perCase
  };

  await fs.mkdir(path.dirname(outputJson), { recursive: true });
  await fs.writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await fs.writeFile(outputMd, renderMarkdown(report), 'utf8');

  console.log(JSON.stringify({ outputJson, outputMd }, null, 2));
}

await main();
