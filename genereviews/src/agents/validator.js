/**
 * Two-layer validator:
 *
 *   1. AJV structural validation against assertion.schema.json /
 *      chapter.schema.json. Strict, no additional properties allowed.
 *   2. Semantic grounding pass — every atom's verbatim_quote MUST exist as
 *      an exact substring of the section slice it claims to come from. Atoms
 *      that fail this are dropped (the model hallucinated), counted under
 *      run.agents[i].atoms_dropped_grounding, and never reach the graph.
 *
 * The validator also enforces lane→kind compatibility: an agent assigned to
 * the surveillance lane can only emit atoms whose `kind` is listed in that
 * lane's `emits` array. This is the structural firewall that prevents
 * cross-lane drift no matter how poorly a prompt is followed.
 */

import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getLaneById } from '../sections.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCHEMA_DIR = path.resolve(__dirname, '..', '..', 'schema');

let cachedAjv = null;

async function loadAjv() {
  if (cachedAjv) return cachedAjv;
  const ajv = new Ajv2020({
    strict: true,
    allErrors: true,
    allowUnionTypes: true
  });
  addFormats(ajv);
  const assertionSchema = JSON.parse(
    await fs.readFile(path.join(SCHEMA_DIR, 'assertion.schema.json'), 'utf8')
  );
  const chapterSchema = JSON.parse(
    await fs.readFile(path.join(SCHEMA_DIR, 'chapter.schema.json'), 'utf8')
  );
  const manifestSchema = JSON.parse(
    await fs.readFile(path.join(SCHEMA_DIR, 'manifest.schema.json'), 'utf8')
  );
  ajv.addSchema(assertionSchema);
  ajv.addSchema(chapterSchema);
  ajv.addSchema(manifestSchema);
  cachedAjv = {
    ajv,
    validateAssertion: ajv.getSchema(assertionSchema.$id),
    validateChapter: ajv.getSchema(chapterSchema.$id),
    validateManifest: ajv.getSchema(manifestSchema.$id)
  };
  return cachedAjv;
}

export async function validateAssertionStrict(atom) {
  const { validateAssertion } = await loadAjv();
  const ok = validateAssertion(atom);
  return { ok, errors: ok ? [] : validateAssertion.errors.slice() };
}

export async function validateChapterStrict(chapter) {
  const { validateChapter } = await loadAjv();
  const ok = validateChapter(chapter);
  return { ok, errors: ok ? [] : validateChapter.errors.slice() };
}

export async function validateManifestStrict(manifest) {
  const { validateManifest } = await loadAjv();
  const ok = validateManifest(manifest);
  return { ok, errors: ok ? [] : validateManifest.errors.slice() };
}

/**
 * Grounding pass: every atom must have a verbatim_quote that is a literal
 * substring of the section slice the agent was given. Atoms that fail are
 * separated from atoms that pass; nothing is silently mutated.
 */
export function groundingPass({ atoms, sliceText, laneId }) {
  const lane = getLaneById(laneId);
  if (!lane) {
    throw new Error(`Unknown lane ${laneId} in grounding pass`);
  }
  const allowedKinds = new Set(lane.emits);
  const kept = [];
  const dropped = [];
  for (const atom of atoms) {
    const reasons = [];
    if (!allowedKinds.has(atom.kind) && lane.id !== 'unassigned') {
      reasons.push(`kind_${atom.kind}_not_allowed_in_lane_${laneId}`);
    }
    const quote = typeof atom.verbatim_quote === 'string' ? atom.verbatim_quote : '';
    const quoteIdx = quote.length > 0 ? sliceText.indexOf(quote) : -1;
    if (quoteIdx === -1) {
      reasons.push('verbatim_quote_not_found_in_slice');
    }
    if (atom.provenance && atom.provenance.section_lane !== laneId) {
      reasons.push(`provenance_lane_mismatch_${atom.provenance.section_lane}_vs_${laneId}`);
    }
    if (reasons.length > 0) {
      dropped.push({ atom, reasons });
      continue;
    }
    // Authoritative char_span: the quote is ground truth, so repair the
    // offsets even if the model emitted incorrect ones. This is safe because
    // we only do it when the quote literally exists in the slice.
    const repaired = {
      ...atom,
      provenance: {
        ...atom.provenance,
        char_span: { start: quoteIdx, end: quoteIdx + quote.length }
      },
      qc: { ...atom.qc, grounded: true }
    };
    kept.push(repaired);
  }
  return { kept, dropped };
}

/**
 * Coverage-accounting check. Returns the fields the chapter file uses for its
 * `coverage_audit` block AND a pass/fail boolean. The 95% threshold is
 * adjustable but defaulted conservatively.
 */
export function computeCoverageAudit({ split, threshold = 0.95 }) {
  const accounted = split.accountedChars + split.droppedChars;
  const passes = split.bodyChars === 0 ? true : accounted / split.bodyChars >= threshold;
  return {
    chapter_body_chars: split.bodyChars,
    accounted_chars: split.accountedChars,
    unassigned_chars: split.unassignedChars,
    dropped_chars: split.droppedChars,
    unassigned_headings: Array.from(new Set(split.unassignedHeadings)),
    passes_accounting: passes
  };
}
