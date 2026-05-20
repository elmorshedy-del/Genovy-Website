import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateAssertionStrict,
  validateChapterStrict,
  validateManifestStrict,
  groundingPass,
  computeCoverageAudit
} from '../src/agents/validator.js';

function baseAtom(overrides = {}) {
  return {
    atom_id: 'nbk487886-clinical_description-001',
    kind: 'phenotype',
    subject: { kind: 'disease', curie: null, label: 'KBG syndrome', synonyms: [], xrefs: [] },
    predicate: 'has_phenotype',
    object: { kind: 'phenotype', curie: null, label: 'Intellectual disability', synonyms: [], xrefs: [] },
    qualifiers: {
      presence_status: 'present',
      frequency_tier: 'very_frequent',
      frequency_text: 'in the majority of affected individuals',
      onset_class: 'childhood',
      onset_curie: null,
      severity: 'moderate',
      laterality: 'not_stated',
      progression: 'not_stated',
      modifier: null,
      sex: 'not_stated',
      aspect: 'neurodevelopmental',
      n_referenced: null
    },
    grounded_sentence: 'KBG syndrome very frequently presents with intellectual disability of childhood onset and moderate severity.',
    verbatim_quote: 'Intellectual disability is present in the majority of affected individuals',
    evidence: { strength: 'established', n_cases_referenced: null, cited_pmids: [] },
    provenance: {
      chapter_id: 'NBK487886',
      chapter_title: 'KBG Syndrome',
      chapter_version: '2023-10-12',
      section_lane: 'clinical_description',
      section_path: ['Clinical Description'],
      char_span: { start: 0, end: 77 },
      retrieved_at: '2026-05-20T20:00:00.000Z',
      agent_id: 'clinical_description.v1',
      model_id: null,
      retrieval_url: null
    },
    qc: { grounded: true, needs_mapping: true, review_required: false, review_reasons: [] },
    ...overrides
  };
}

test('valid atom passes AJV', async () => {
  const { ok, errors } = await validateAssertionStrict(baseAtom());
  assert.equal(ok, true, JSON.stringify(errors));
});

test('atom rejected when predicate not in vocab', async () => {
  const atom = baseAtom({ predicate: 'has_blueberry' });
  const { ok } = await validateAssertionStrict(atom);
  assert.equal(ok, false);
});

test('atom rejected when grounded_sentence is empty', async () => {
  const atom = baseAtom({ grounded_sentence: '' });
  const { ok } = await validateAssertionStrict(atom);
  assert.equal(ok, false);
});

test('groundingPass drops atoms whose verbatim_quote is not in the slice', () => {
  const slice = 'Intellectual disability is present in the majority of affected individuals.';
  const goodAtom = baseAtom();
  const badAtom = baseAtom({
    atom_id: 'nbk487886-clinical_description-002',
    verbatim_quote: 'this string is not in the slice'
  });
  const { kept, dropped } = groundingPass({
    atoms: [goodAtom, badAtom],
    sliceText: slice,
    laneId: 'clinical_description'
  });
  assert.equal(kept.length, 1);
  assert.equal(dropped.length, 1);
  assert.equal(dropped[0].reasons[0], 'verbatim_quote_not_found_in_slice');
});

test('groundingPass rejects cross-lane drift', () => {
  const slice = 'Intellectual disability is present in the majority of affected individuals.';
  const wrongLaneAtom = baseAtom({
    kind: 'treatment',
    predicate: 'treated_with',
    provenance: { ...baseAtom().provenance, section_lane: 'clinical_description' }
  });
  const { kept, dropped } = groundingPass({
    atoms: [wrongLaneAtom],
    sliceText: slice,
    laneId: 'clinical_description'
  });
  assert.equal(kept.length, 0);
  assert.equal(dropped.length, 1);
  assert.ok(dropped[0].reasons.some((r) => r.startsWith('kind_treatment_not_allowed_in_lane_clinical_description')));
});

test('coverage audit computes ratios and fails below threshold', () => {
  const split = {
    bodyChars: 1000,
    accountedChars: 700,
    droppedChars: 100,
    unassignedChars: 50,
    unassignedHeadings: ['Pharmacogenomic Considerations']
  };
  const audit = computeCoverageAudit({ split });
  assert.equal(audit.passes_accounting, false);
  assert.equal(audit.unassigned_headings.length, 1);

  const goodSplit = { ...split, accountedChars: 960, droppedChars: 30, bodyChars: 1000 };
  const auditGood = computeCoverageAudit({ split: goodSplit });
  assert.equal(auditGood.passes_accounting, true);
});

test('manifest schema accepts the seed', async () => {
  const manifest = {
    schema_version: '1.0.0',
    generated_at: '2026-05-20T20:00:00.000Z',
    chapters: [
      {
        chapter_id: 'NBK487886',
        primary_symbol: 'ANKRD11',
        title: 'KBG Syndrome',
        priority_tier: 'P0',
        rationale: 'Active miss family'
      }
    ]
  };
  const { ok, errors } = await validateManifestStrict(manifest);
  assert.equal(ok, true, JSON.stringify(errors));
});

test('chapter schema accepts a minimal but real chapter', async () => {
  const chapter = {
    schema_version: '1.0.0',
    chapter_id: 'NBK487886',
    chapter_title: 'KBG Syndrome',
    chapter_version: '2023-10-12',
    retrieval_url: 'https://www.ncbi.nlm.nih.gov/books/NBK487886/',
    retrieved_at: '2026-05-20T20:00:00.000Z',
    genes: [{ symbol: 'ANKRD11', hgnc_curie: null, ncbi_gene_curie: null, ensembl_curie: null, omim_gene_curie: null }],
    diseases: [{ label: 'KBG syndrome', mondo_curie: null, omim_curie: null, orphanet_curie: null, synonyms: [] }],
    sections: [
      { lane: 'clinical_description', section_path: ['Clinical Description'], text: 'x', char_offset: 0, char_length: 1 }
    ],
    atoms: [baseAtom()],
    coverage_audit: {
      chapter_body_chars: 1000,
      accounted_chars: 950,
      unassigned_chars: 0,
      dropped_chars: 50,
      unassigned_headings: [],
      passes_accounting: true
    },
    run: {
      started_at: '2026-05-20T20:00:00.000Z',
      finished_at: '2026-05-20T20:00:05.000Z',
      providers: [{ name: 'mock', model: 'mock-1' }],
      agents: [{ agent_id: 'clinical_description.v1', lane: 'clinical_description', status: 'ok', atoms_emitted: 1, atoms_kept: 1, atoms_dropped_grounding: 0, atoms_flagged_review: 0, input_chars: 1, duration_ms: 10, error: null }],
      coverage_score: 0.5
    }
  };
  const { ok, errors } = await validateChapterStrict(chapter);
  assert.equal(ok, true, JSON.stringify(errors));
});
