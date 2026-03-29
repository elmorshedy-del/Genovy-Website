import fs from 'node:fs/promises';
import path from 'node:path';
import { withClient } from '../db/pool.js';
import { extractDxPhenotypeInput } from '../lib/phenopackets.js';
import { loadDxDiseasePhenotypeRows } from '../repositories/dxRepository.js';
import { normalizeGeneKey } from './lib/shadowBenchmarkUtils.js';

const BENCHMARK_PATH =
  '/Users/ahmedelmorshedy/Genovy-phenotype-enrichment-20260316-0914/output/official-real-v1-working-handoff-floor-1.0-20260326.json';
const PHENOPACKET_DIR =
  '/Users/ahmedelmorshedy/Genovy-phenotype-enrichment-20260316-0914/preservation/original-output-snapshot-20260326/pheval-official-sample-100/phenopackets';
const OUTPUT_JSON =
  '/Users/ahmedelmorshedy/Genovy-phenotype-enrichment-20260316-0914/output/unsolved-miss-bulk-reopen-20260327.json';
const OUTPUT_MD =
  '/Users/ahmedelmorshedy/Genovy-phenotype-enrichment-20260316-0914/docs/unsolved-miss-bulk-reopen-20260327.md';

const CASES = [
  {
    caseId: 'PMID_29330883_Subject9',
    truthGeneKey: 'symbol:RERE',
    truthGeneLabel: 'RERE',
    truthDiseaseCurie: 'MONDO:0014857',
    truthDiseaseLabel: 'neurodevelopmental disorder with or without anomalies of the brain, eye, or heart',
    rivalGeneKey: 'symbol:MED13',
    rivalGeneLabel: 'MED13',
    rivalDiseaseCurie: 'MONDO:0032485',
    rivalDiseaseLabel: 'intellectual developmental disorder 61',
    status: 'Symmetric case-series presence shadow moved truth 238 -> 82, but MED13 stayed 1; now looks like frequency/contradiction handling after exact recovery.'
  },
  {
    caseId: 'PMID_30580808_Lo_twin_2-Fam-52',
    truthGeneKey: 'symbol:SMARCC2',
    truthGeneLabel: 'SMARCC2',
    truthDiseaseCurie: 'MONDO:0032702',
    truthDiseaseLabel: 'Coffin-Siris syndrome 8',
    rivalGeneKey: 'symbol:NLGN1',
    rivalGeneLabel: 'NLGN1',
    rivalDiseaseCurie: 'MONDO:0030004',
    rivalDiseaseLabel: 'autism, susceptibility to, 20',
    status: 'Sparse ranking plus negative-evidence case; not an enrichment-first target.'
  },
  {
    caseId: 'PMID_32376980_11',
    truthGeneKey: 'symbol:TRAF7',
    truthGeneLabel: 'TRAF7',
    truthDiseaseCurie: 'MONDO:0032572',
    truthDiseaseLabel: 'cardiac, facial, and digital anomalies with developmental delay',
    rivalGeneKey: 'symbol:DOT1L',
    rivalGeneLabel: 'DOT1L',
    rivalDiseaseCurie: 'MONDO:0979246',
    rivalDiseaseLabel: 'Nil-Deshwar neurodevelopmental syndrome',
    status: 'Symmetric source pass was a null; sharp eye/feeding/hearing exacts still favor DOT1L.'
  },
  {
    caseId: 'PMID_35190816_STX_26865513_Patient_45',
    truthGeneKey: 'symbol:STXBP1',
    truthGeneLabel: 'STXBP1',
    truthDiseaseCurie: 'MONDO:0012812',
    truthDiseaseLabel: 'developmental and epileptic encephalopathy, 4',
    rivalGeneKey: '',
    rivalGeneLabel: '',
    rivalDiseaseCurie: '',
    rivalDiseaseLabel: '',
    status: 'Still undercoverage-looking; no fresh current outranker trace was recovered because the heavy live audit path failed on infrastructure capacity.'
  },
  {
    caseId: 'PMID_35190816_STX_28944233_270001',
    truthGeneKey: 'symbol:STXBP1',
    truthGeneLabel: 'STXBP1',
    truthDiseaseCurie: 'MONDO:0008939',
    truthDiseaseLabel: 'isolated cerebellar hypoplasia/agenesis',
    rivalGeneKey: 'symbol:RAI1',
    rivalGeneLabel: 'RAI1',
    rivalDiseaseCurie: 'MONDO:0008434',
    rivalDiseaseLabel: 'Smith-Magenis syndrome',
    status: 'Proven strong mimic case; branch weakness plus a genuinely strong RAI1 packet fit.'
  },
  {
    caseId: 'PMID_36331550_Family16Patient21',
    truthGeneKey: 'symbol:SPTAN1',
    truthGeneLabel: 'SPTAN1',
    truthDiseaseCurie: 'MONDO:0957815',
    truthDiseaseLabel: 'developmental delay with or without epilepsy',
    rivalGeneKey: 'symbol:ZBTB11',
    rivalGeneLabel: 'ZBTB11',
    rivalDiseaseCurie: 'MONDO:0032715',
    rivalDiseaseLabel: 'intellectual developmental disorder, autosomal recessive 69',
    status: 'True ranking/specificity failure; tiny positive packet and weak use of negatives.'
  },
  {
    caseId: 'PMID_36446582_Goldenberg2016_P13',
    truthGeneKey: 'symbol:ANKRD11',
    truthGeneLabel: 'ANKRD11',
    truthDiseaseCurie: 'MONDO:0007846',
    truthDiseaseLabel: 'KBG syndrome',
    rivalGeneKey: 'symbol:GDF5',
    rivalGeneLabel: 'GDF5',
    rivalDiseaseCurie: 'MONDO:0007215',
    rivalDiseaseLabel: 'brachydactyly type A1',
    status: 'Symmetric source/OMIM shadow helped but did not rescue; still mostly truth-branch thinness.'
  },
  {
    caseId: 'PMID_36446582_Miyatake2017_P1',
    truthGeneKey: 'symbol:ANKRD11',
    truthGeneLabel: 'ANKRD11',
    truthDiseaseCurie: 'MONDO:0007846',
    truthDiseaseLabel: 'KBG syndrome',
    rivalGeneKey: 'symbol:GAL',
    rivalGeneLabel: 'GAL',
    rivalDiseaseCurie: 'MONDO:0014650',
    rivalDiseaseLabel: 'familial temporal lobe epilepsy 8',
    status: 'Hybrid case: partial truthful lift, but narrow seizure mimic still wins.'
  },
  {
    caseId: 'PMID_37156989_P1',
    truthGeneKey: 'symbol:SOCS1',
    truthGeneLabel: 'SOCS1',
    truthDiseaseCurie: 'MONDO:0800130',
    truthDiseaseLabel: 'autoinflammatory syndrome with immunodeficiency',
    rivalGeneKey: 'symbol:CTLA4',
    rivalGeneLabel: 'CTLA4',
    rivalDiseaseCurie: 'MONDO:0014493',
    rivalDiseaseLabel: 'autoimmune lymphoproliferative syndrome due to CTLA4 haploinsufficiency',
    status: 'Truthful source repair lifted truth 400 -> 48, but CTLA4 still owns the sharpest inflammatory exacts.'
  },
  {
    caseId: 'PMID_37761890_41',
    truthGeneKey: 'symbol:PPP2R1A',
    truthGeneLabel: 'PPP2R1A',
    truthDiseaseCurie: 'MONDO:0014605',
    truthDiseaseLabel: 'Houge-Janssens syndrome 2',
    rivalGeneKey: 'symbol:HNRNPC',
    rivalGeneLabel: 'HNRNPC',
    rivalDiseaseCurie: 'MONDO:0958203',
    rivalDiseaseLabel: 'intellectual developmental disorder, autosomal dominant 74',
    status: 'Truthful head-to-head repair improved truth 3 -> 2, but HNRNPC still wins.'
  },
  {
    caseId: 'PMID_37761890_43',
    truthGeneKey: 'symbol:PPP2R1A',
    truthGeneLabel: 'PPP2R1A',
    truthDiseaseCurie: 'MONDO:0014605',
    truthDiseaseLabel: 'Houge-Janssens syndrome 2',
    rivalGeneKey: 'symbol:MACF1',
    rivalGeneLabel: 'MACF1',
    rivalDiseaseCurie: 'MONDO:0032677',
    rivalDiseaseLabel: 'lissencephaly 9 with complex brainstem malformation',
    status: 'Truthful head-to-head repair flipped truth 2 -> 1, but this still needs symmetric confirmation before treating it as fully solved.'
  },
  {
    caseId: 'PMID_37962958_43',
    truthGeneKey: 'symbol:U2AF2',
    truthGeneLabel: 'U2AF2',
    truthDiseaseCurie: 'MONDO:0957810',
    truthDiseaseLabel: 'neurodevelopmental disorder with poor growth and dysmorphic facies',
    rivalGeneKey: 'symbol:LRRC7',
    rivalGeneLabel: 'LRRC7',
    rivalDiseaseCurie: 'MONDO:0980748',
    rivalDiseaseLabel: 'intellectual developmental disorder, autosomal dominant 77',
    status: 'Truthful symmetric source repair moved truth 959 -> 2, but LRRC7 stays 1 despite multiple exact excluded contradictions.'
  }
];

function buildFeatureLabelMap(phenopacket) {
  const map = new Map();
  for (const feature of phenopacket?.phenotypicFeatures || []) {
    const curie = feature?.type?.id || feature?.type?.identifier || feature?.id || '';
    const label = feature?.type?.label || feature?.label || curie;
    if (curie) map.set(curie, label);
  }
  return map;
}

function exactTermsFromSet(termCuries, labelMap, directSet) {
  return termCuries
    .filter((curie) => directSet?.has(curie))
    .map((curie) => ({
      curie,
      label: labelMap.get(curie) || curie
    }));
}

function summarizeOwnership(termCuries, labelMap, truthSet, rivalSet) {
  const truthOnly = [];
  const rivalOnly = [];
  const shared = [];
  for (const curie of termCuries) {
    const inTruth = truthSet?.has(curie) || false;
    const inRival = rivalSet?.has(curie) || false;
    const label = labelMap.get(curie) || curie;
    if (inTruth && inRival) shared.push(label);
    else if (inTruth) truthOnly.push(label);
    else if (inRival) rivalOnly.push(label);
  }
  return { truthOnly, rivalOnly, shared };
}

function toSetByKey(rows, keyField, valueField = 'phenotype_curie') {
  const byKey = new Map();
  for (const row of rows) {
    const key = row[keyField];
    if (!key) continue;
    if (!byKey.has(key)) byKey.set(key, new Set());
    byKey.get(key).add(row[valueField]);
  }
  return byKey;
}

function formatList(values) {
  return values.length ? values.join(', ') : 'none';
}

function buildMarkdown({ createdAt, skipped, cases }) {
  const lines = [
    '# Unsolved Miss Bulk Reopen - 2026-03-27',
    '',
    `Created: ${createdAt}`,
    'Method:',
    '- preserved official 100-case phenopackets',
    '- current live direct disease-phenotype surface from the real `v1-working` DB',
    '- current live narrow direct gene-phenotype edges for the truth and top outranker only',
    '- existing saved audit/shadow notes for per-case status',
    '',
    'Skipped from this unresolved batch:',
    ...skipped.map((item) => `- ${item}`),
    ''
  ];

  for (const item of cases) {
    lines.push(`## ${item.caseId}`);
    lines.push(`- Truth: \`${item.truthGeneLabel}\` / \`${item.truthDiseaseLabel}\``);
    lines.push(
      item.rivalGeneLabel
        ? `- Outranker: \`${item.rivalGeneLabel}\` / \`${item.rivalDiseaseLabel}\``
        : '- Outranker: unavailable in saved current artifacts'
    );
    lines.push(`- Exomiser rank: \`${item.exomiserRank}\``);
    lines.push(`- Current read: ${item.status}`);
    lines.push('');
    lines.push('| Surface | Truth present exact | Rival present exact | Truth excluded contradictions | Rival excluded contradictions |');
    lines.push('|---|---|---|---|---|');
    lines.push(
      `| Disease direct | ${formatList(item.disease.truthPresent)} | ${formatList(item.disease.rivalPresent)} | ${formatList(item.disease.truthExcluded)} | ${formatList(item.disease.rivalExcluded)} |`
    );
    lines.push(
      `| Gene direct | ${formatList(item.gene.truthPresent)} | ${formatList(item.gene.rivalPresent)} | ${formatList(item.gene.truthExcluded)} | ${formatList(item.gene.rivalExcluded)} |`
    );
    lines.push('');
    lines.push('- Disease direct ownership, present:');
    lines.push(`  - truth-only: ${formatList(item.disease.presentOwnership.truthOnly)}`);
    lines.push(`  - rival-only: ${formatList(item.disease.presentOwnership.rivalOnly)}`);
    lines.push(`  - shared: ${formatList(item.disease.presentOwnership.shared)}`);
    lines.push('- Gene direct ownership, present:');
    lines.push(`  - truth-only: ${formatList(item.gene.presentOwnership.truthOnly)}`);
    lines.push(`  - rival-only: ${formatList(item.gene.presentOwnership.rivalOnly)}`);
    lines.push(`  - shared: ${formatList(item.gene.presentOwnership.shared)}`);
    lines.push('');
  }

  lines.push('## Evidence Boundaries');
  lines.push('- Inspected: official benchmark JSON, preserved phenopackets, existing saved audit/shadow notes, live narrow direct disease/gene exact surfaces.');
  lines.push('- Intentionally not inspected: no broad Railway data crawl, no raw mounted-data scan, no fresh heavy full reranks for the batch.');
  return `${lines.join('\n')}\n`;
}

async function loadPhenopacket(fileName) {
  const phenopacketPath = path.join(PHENOPACKET_DIR, fileName);
  const raw = await fs.readFile(phenopacketPath, 'utf8');
  return JSON.parse(raw);
}

async function main() {
  const createdAt = new Date().toISOString();
  const benchmark = JSON.parse(await fs.readFile(BENCHMARK_PATH, 'utf8'));
  const benchmarkByCase = new Map((benchmark.per_case || []).map((row) => [row.case_id, row]));

  const allGeneLabels = [...new Set(CASES.flatMap((item) => [item.truthGeneLabel, item.rivalGeneLabel]).filter(Boolean))];
  const allDiseaseCuries = [...new Set(CASES.flatMap((item) => [item.truthDiseaseCurie, item.rivalDiseaseCurie]).filter(Boolean))];

  const packets = new Map();
  const allTermCuries = new Set();
  for (const item of CASES) {
    const benchmarkRow = benchmarkByCase.get(item.caseId);
    if (!benchmarkRow?.file_name) {
      throw new Error(`Missing benchmark file mapping for ${item.caseId}`);
    }
    const phenopacket = await loadPhenopacket(benchmarkRow.file_name);
    const labelMap = buildFeatureLabelMap(phenopacket);
    const extracted = extractDxPhenotypeInput({ phenopacket });
    const packet = {
      fileName: benchmarkRow.file_name,
      present: extracted.presentPhenotypeCuries.map((curie) => ({ curie, label: labelMap.get(curie) || curie })),
      excluded: extracted.excludedPhenotypeCuries.map((curie) => ({ curie, label: labelMap.get(curie) || curie }))
    };
    packets.set(item.caseId, packet);
    for (const term of packet.present) allTermCuries.add(term.curie);
    for (const term of packet.excluded) allTermCuries.add(term.curie);
  }

  const termCurieList = [...allTermCuries];

  const compiled = await withClient(async (client) => {
    const diseaseResult = await loadDxDiseasePhenotypeRows(client);
    const diseaseRows = diseaseResult.rows.filter(
      (row) =>
        allDiseaseCuries.includes(row.disease_curie) &&
        termCurieList.includes(row.phenotype_curie) &&
        (row.presence_status || 'present') === 'present' &&
        (row.phenotype_edge_origin || 'direct') === 'direct'
    );

    const geneResult = await client.query(
      `
        SELECT DISTINCT ON (gene.canonical_label, phenotype.canonical_curie)
          gene.canonical_label AS gene_label,
          gene.canonical_curie AS gene_curie,
          phenotype.canonical_curie AS phenotype_curie,
          phenotype.canonical_label AS phenotype_label
        FROM relationships rel
        INNER JOIN entities gene
          ON gene.entity_id = rel.subject_entity_id
        INNER JOIN entities phenotype
          ON phenotype.entity_id = rel.object_entity_id
        WHERE rel.predicate_key = 'associated_with_phenotype'
          AND gene.entity_type = 'gene'
          AND gene.is_placeholder = FALSE
          AND phenotype.entity_type = 'phenotype'
          AND gene.canonical_label = ANY($1::text[])
          AND phenotype.canonical_curie = ANY($2::text[])
        ORDER BY gene.canonical_label, phenotype.canonical_curie
      `,
      [allGeneLabels, termCurieList]
    );

    return {
      diseaseSourceMode: diseaseResult.sourceMode,
      diseaseRows,
      geneRows: geneResult.rows
    };
  });

  const diseaseMap = toSetByKey(compiled.diseaseRows, 'disease_curie');
  const geneMap = toSetByKey(compiled.geneRows, 'gene_label');

  const cases = CASES.map((item) => {
    const benchmarkRow = benchmarkByCase.get(item.caseId);
    const packet = packets.get(item.caseId);
    const labelMap = new Map([
      ...packet.present.map((term) => [term.curie, term.label]),
      ...packet.excluded.map((term) => [term.curie, term.label])
    ]);
    const presentCuries = packet.present.map((term) => term.curie);
    const excludedCuries = packet.excluded.map((term) => term.curie);

    const truthDiseaseSet = diseaseMap.get(item.truthDiseaseCurie) || new Set();
    const rivalDiseaseSet = item.rivalDiseaseCurie ? diseaseMap.get(item.rivalDiseaseCurie) || new Set() : new Set();
    const truthGeneSet = geneMap.get(item.truthGeneLabel) || new Set();
    const rivalGeneSet = item.rivalGeneLabel ? geneMap.get(item.rivalGeneLabel) || new Set() : new Set();

    return {
      caseId: item.caseId,
      fileName: packet.fileName,
      truthGeneLabel: item.truthGeneLabel,
      truthDiseaseCurie: item.truthDiseaseCurie,
      truthDiseaseLabel: item.truthDiseaseLabel,
      rivalGeneLabel: item.rivalGeneLabel,
      rivalDiseaseCurie: item.rivalDiseaseCurie,
      rivalDiseaseLabel: item.rivalDiseaseLabel,
      genovyRank: benchmarkRow.genovy_rank,
      exomiserRank: benchmarkRow.exomiser_rank,
      status: item.status,
      packet,
      disease: {
        truthPresent: exactTermsFromSet(presentCuries, labelMap, truthDiseaseSet).map((term) => term.label),
        rivalPresent: exactTermsFromSet(presentCuries, labelMap, rivalDiseaseSet).map((term) => term.label),
        truthExcluded: exactTermsFromSet(excludedCuries, labelMap, truthDiseaseSet).map((term) => term.label),
        rivalExcluded: exactTermsFromSet(excludedCuries, labelMap, rivalDiseaseSet).map((term) => term.label),
        presentOwnership: summarizeOwnership(presentCuries, labelMap, truthDiseaseSet, rivalDiseaseSet),
        excludedOwnership: summarizeOwnership(excludedCuries, labelMap, truthDiseaseSet, rivalDiseaseSet)
      },
      gene: {
        truthPresent: exactTermsFromSet(presentCuries, labelMap, truthGeneSet).map((term) => term.label),
        rivalPresent: exactTermsFromSet(presentCuries, labelMap, rivalGeneSet).map((term) => term.label),
        truthExcluded: exactTermsFromSet(excludedCuries, labelMap, truthGeneSet).map((term) => term.label),
        rivalExcluded: exactTermsFromSet(excludedCuries, labelMap, rivalGeneSet).map((term) => term.label),
        presentOwnership: summarizeOwnership(presentCuries, labelMap, truthGeneSet, rivalGeneSet),
        excludedOwnership: summarizeOwnership(excludedCuries, labelMap, truthGeneSet, rivalGeneSet)
      }
    };
  });

  const payload = {
    createdAt,
    benchmarkPath: BENCHMARK_PATH,
    phenopacketDir: PHENOPACKET_DIR,
    diseaseSourceMode: compiled.diseaseSourceMode,
    caseCount: cases.length,
    skippedResolved: [
      'PMID_33766796_16 / SETD2: already source-rescued in saved symmetric shadow (140 -> 1), so excluded from this unresolved batch.'
    ],
    cases
  };

  await fs.writeFile(OUTPUT_JSON, `${JSON.stringify(payload, null, 2)}\n`);
  await fs.writeFile(
    OUTPUT_MD,
    buildMarkdown({
      createdAt,
      skipped: payload.skippedResolved,
      cases
    }),
    'utf8'
  );

  console.log(JSON.stringify({ outputJson: OUTPUT_JSON, outputMd: OUTPUT_MD, caseCount: cases.length }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
