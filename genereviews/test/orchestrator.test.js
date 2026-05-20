import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractChapter } from '../src/agents/orchestrator.js';
import { createMockProvider } from '../src/providers/mock.js';
import { validateChapterStrict } from '../src/agents/validator.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE = path.join(__dirname, 'fixtures', 'kbg.fixture.html');
const CHAPTER_ID = 'NBK487886';

test('end-to-end orchestrator on the KBG fixture with mock provider', async () => {
  const html = await fs.readFile(FIXTURE, 'utf8');

  const atomsByLane = {
    clinical_description: [
      {
        atom_id: 'nbk487886-clinical_description-001',
        kind: 'phenotype',
        subject: { kind: 'disease', curie: null, label: 'KBG syndrome', synonyms: [], xrefs: [] },
        predicate: 'has_phenotype',
        object: { kind: 'phenotype', curie: null, label: 'Intellectual disability', synonyms: [], xrefs: [] },
        qualifiers: {
          presence_status: 'present',
          frequency_tier: 'very_frequent',
          frequency_text: 'in the majority of affected individuals',
          onset_class: 'not_stated',
          onset_curie: null,
          severity: 'moderate',
          laterality: 'not_stated',
          progression: 'not_stated',
          modifier: null,
          sex: 'not_stated',
          aspect: 'neurodevelopmental',
          n_referenced: null
        },
        grounded_sentence:
          'KBG syndrome very frequently presents with intellectual disability of moderate severity.',
        verbatim_quote:
          'Intellectual disability is present in the majority of affected individuals',
        evidence: { strength: 'established', n_cases_referenced: null, cited_pmids: [] },
        provenance: {
          chapter_id: CHAPTER_ID,
          chapter_title: 'KBG Syndrome',
          chapter_version: null,
          section_lane: 'clinical_description',
          section_path: ['Clinical Description'],
          char_span: { start: 0, end: 0 },
          retrieved_at: '2026-05-20T20:00:00.000Z',
          agent_id: 'clinical_description.v1',
          model_id: 'mock-1',
          retrieval_url: null
        },
        qc: { grounded: false, needs_mapping: true, review_required: false, review_reasons: [] }
      }
    ]
  };

  const provider = createMockProvider({ atomsByLane });
  const result = await extractChapter({
    chapterId: CHAPTER_ID,
    html,
    provider,
    retrievedAt: '2026-05-20T20:00:00.000Z',
    laneConcurrency: 2
  });

  const { ok, errors } = await validateChapterStrict(result.chapter);
  assert.equal(ok, true, JSON.stringify(errors, null, 2));
  assert.ok(result.chapter.atoms.length >= 1);
  assert.ok(result.chapter.coverage_audit.passes_accounting, 'coverage audit must pass on the fixture');
  assert.ok(result.chapter.run.coverage_score === null || result.chapter.run.coverage_score >= 0);
  // verify the clinical_description atom survived grounding
  const survived = result.chapter.atoms.find(
    (atom) => atom.kind === 'phenotype' && atom.object.label === 'Intellectual disability'
  );
  assert.ok(survived, 'the seeded clinical_description atom must survive the grounding pass');
  // verify its char_span was rewritten by the runner so it points into the slice
  assert.ok(survived.provenance.char_span.end > survived.provenance.char_span.start);
});
