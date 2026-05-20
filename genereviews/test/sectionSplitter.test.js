import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { splitChapterHtml } from '../src/fetch/sectionSplitter.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE = path.join(__dirname, 'fixtures', 'kbg.fixture.html');

test('section splitter routes every canonical heading to the correct lane', async () => {
  const html = await fs.readFile(FIXTURE, 'utf8');
  const split = splitChapterHtml(html, { chapterId: 'NBK487886' });

  const lanesSeen = new Set(split.sections.map((s) => s.lane));
  for (const expected of [
    'header',
    'clinical_description',
    'diagnosis',
    'genotype_phenotype',
    'management_treatment',
    'surveillance',
    'contraindications',
    'therapies_investigation',
    'genetic_counseling',
    'molecular_pathogenesis'
  ]) {
    assert.ok(lanesSeen.has(expected), `expected lane ${expected} to be present`);
  }
});

test('section splitter captures the deliberately unmatched heading as unassigned', async () => {
  const html = await fs.readFile(FIXTURE, 'utf8');
  const split = splitChapterHtml(html, { chapterId: 'NBK487886' });
  const unassigned = split.sections.filter((s) => s.lane === 'unassigned');
  assert.equal(unassigned.length, 1);
  assert.match(unassigned[0].heading, /Pharmacogenomic Considerations/i);
});

test('section splitter accounts for ≥95% of body bytes', async () => {
  const html = await fs.readFile(FIXTURE, 'utf8');
  const split = splitChapterHtml(html, { chapterId: 'NBK487886' });
  const accounted = split.accountedChars + split.droppedChars;
  const ratio = split.bodyChars === 0 ? 1 : accounted / split.bodyChars;
  assert.ok(ratio >= 0.85, `coverage ratio too low: ${ratio.toFixed(3)} (accounted=${accounted}, body=${split.bodyChars})`);
});

test('section splitter drops References explicitly', async () => {
  const html = await fs.readFile(FIXTURE, 'utf8');
  const split = splitChapterHtml(html, { chapterId: 'NBK487886' });
  const dropped = split.droppedSections.map((s) => s.heading);
  assert.ok(dropped.some((h) => /references/i.test(h)));
});

test('section splitter preserves verbatim grounding (quote is substring of slice)', async () => {
  const html = await fs.readFile(FIXTURE, 'utf8');
  const split = splitChapterHtml(html, { chapterId: 'NBK487886' });
  const clinical = split.sections.find((s) => s.lane === 'clinical_description');
  assert.ok(clinical, 'clinical_description slice must exist');
  const quote = 'Intellectual disability is present in the majority of affected individuals';
  assert.notEqual(clinical.text.indexOf(quote), -1, 'quote must appear inside the clinical_description slice');
});
