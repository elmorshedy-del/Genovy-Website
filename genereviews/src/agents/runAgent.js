/**
 * runAgent: single-section invocation.
 *
 * Flow:
 *   1. Resolve the agent (prompt + allowed kinds) for the given lane.
 *   2. Call the provider with the section slice. The provider returns
 *      either { atoms: [...] } or { triage: [...] } (for the unassigned
 *      triage agent).
 *   3. Run AJV structural validation on every atom.
 *   4. Run the grounding pass (verbatim quote must appear in the slice).
 *   5. Return counters + the kept atoms.
 *
 * This function never throws on a per-atom failure — it filters and counts.
 * It throws only on infrastructure failures (provider error, malformed
 * top-level response, prompt load failure).
 */

import { loadAgent } from './registry.js';
import { groundingPass, validateAssertionStrict } from './validator.js';

export async function runAgent({
  laneId,
  slice,
  provider,
  chapter,
  retrievedAt
}) {
  const agent = await loadAgent(laneId);
  const startedAt = Date.now();
  const response = await provider.complete({
    systemPrompt: agent.systemPrompt,
    lanePrompt: agent.lanePrompt,
    laneId,
    sliceText: slice.text,
    sectionPath: slice.section_path,
    chapterId: chapter.chapter_id,
    chapterTitle: chapter.chapter_title,
    retrievedAt,
    allowedKinds: agent.allowedKinds
  });
  const durationMs = Date.now() - startedAt;

  if (agent.isTriage) {
    return {
      agentId: agent.agentId,
      laneId,
      status: 'ok',
      atomsEmitted: 0,
      atomsKept: 0,
      atomsDroppedGrounding: 0,
      atomsFlaggedReview: Array.isArray(response?.triage) ? response.triage.length : 0,
      inputChars: slice.text.length,
      durationMs,
      atoms: [],
      triage: Array.isArray(response?.triage) ? response.triage : [],
      error: null
    };
  }

  const rawAtoms = Array.isArray(response?.atoms) ? response.atoms : [];

  // Pre-repair: char_span offsets are unreliable from LLMs. The verbatim
  // quote is the ground truth. If we can locate the quote in the slice, we
  // overwrite the offsets so structural validation sees a valid span. Atoms
  // whose quote is not in the slice are sent to the grounding-failure list.
  const prepared = [];
  const prepFailures = [];
  for (const atom of rawAtoms) {
    const quote = typeof atom?.verbatim_quote === 'string' ? atom.verbatim_quote : '';
    const idx = quote.length > 0 ? slice.text.indexOf(quote) : -1;
    if (idx === -1) {
      prepFailures.push({ atom, reasons: ['verbatim_quote_not_found_in_slice'] });
      continue;
    }
    const repaired = JSON.parse(JSON.stringify(atom));
    repaired.provenance = repaired.provenance || {};
    repaired.provenance.char_span = { start: idx, end: idx + quote.length };
    repaired.provenance.section_lane = laneId;
    prepared.push(repaired);
  }

  const structurallyValid = [];
  const structuralFailures = [];
  for (const atom of prepared) {
    const { ok, errors } = await validateAssertionStrict(atom);
    if (ok) structurallyValid.push(atom);
    else structuralFailures.push({ atom, errors });
  }
  const { kept, dropped } = groundingPass({
    atoms: structurallyValid,
    sliceText: slice.text,
    laneId
  });
  for (const failure of prepFailures) dropped.push(failure);
  const flaggedReview = kept.filter((atom) => atom.qc?.review_required).length;

  return {
    agentId: agent.agentId,
    laneId,
    status: rawAtoms.length === 0 ? 'empty' : 'ok',
    atomsEmitted: rawAtoms.length,
    atomsKept: kept.length,
    atomsDroppedGrounding: dropped.length,
    atomsDroppedStructural: structuralFailures.length,
    atomsFlaggedReview: flaggedReview,
    inputChars: slice.text.length,
    durationMs,
    atoms: kept,
    structuralFailures,
    groundingFailures: dropped,
    triage: [],
    error: null
  };
}
