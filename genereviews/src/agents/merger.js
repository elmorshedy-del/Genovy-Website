/**
 * Merger — collects per-agent outputs into a single Chapter document.
 *
 * Responsibilities:
 *   - Deduplicate equivalent atoms emitted by sibling agents (e.g. the
 *     header lane and the genetic_counseling lane both naming an
 *     inheritance pattern). Dedup key is
 *     (kind, predicate, subject.label_lower, object.label_lower,
 *      qualifiers.presence_status).
 *   - Reassign deterministic atom_ids in lane order then sequence index.
 *   - Compute the run.coverage_score (= lanes_with_at_least_one_atom /
 *     expected_lanes_count).
 *
 * The merger does NOT mutate qualifiers or grounded sentences. If two
 * agents produce two genuinely different atoms (different verbatim quotes,
 * different qualifiers) we keep both — preserving the dual-source
 * provenance is the whole point.
 */

import { SECTION_LANES } from '../sections.js';

const SKIP_LANES_FOR_COVERAGE = new Set(['unassigned']);

export function mergeChapterAtoms({
  chapterId,
  chapterTitle,
  chapterVersion,
  retrievalUrl,
  retrievedAt,
  genes,
  diseases,
  sections,
  agentRuns,
  startedAt,
  finishedAt,
  providers,
  coverageAudit
}) {
  const allAtoms = [];
  const seen = new Map();
  const triageReviewBucket = [];

  for (const run of agentRuns) {
    if (run.triage && run.triage.length > 0) {
      for (const item of run.triage) triageReviewBucket.push({ lane: run.laneId, ...item });
    }
    for (const atom of run.atoms) {
      const key = dedupKey(atom);
      if (seen.has(key)) {
        const existing = seen.get(key);
        existing.provenance_sources = existing.provenance_sources || [
          existing.provenance
        ];
        existing.provenance_sources.push(atom.provenance);
        continue;
      }
      seen.set(key, atom);
      allAtoms.push(atom);
    }
  }

  // Re-id atoms deterministically per lane to keep diffs stable.
  const counterByLane = new Map();
  for (const atom of allAtoms) {
    const lane = atom.provenance.section_lane;
    const n = (counterByLane.get(lane) || 0) + 1;
    counterByLane.set(lane, n);
    atom.atom_id = `${chapterId.toLowerCase()}-${lane}-${String(n).padStart(3, '0')}`;
  }

  const lanesEmitted = new Set(agentRuns.filter((run) => run.atomsKept > 0).map((run) => run.laneId));
  const expectedLanes = SECTION_LANES.filter((lane) => !SKIP_LANES_FOR_COVERAGE.has(lane.id)).map((lane) => lane.id);
  const coverage_score =
    expectedLanes.length === 0
      ? null
      : Number((expectedLanes.filter((lane) => lanesEmitted.has(lane)).length / expectedLanes.length).toFixed(4));

  const chapter = {
    schema_version: '1.0.0',
    chapter_id: chapterId,
    chapter_title: chapterTitle,
    chapter_version: chapterVersion,
    retrieval_url: retrievalUrl,
    retrieved_at: retrievedAt,
    genes,
    diseases,
    sections: sections.map((s) => ({
      lane: s.lane,
      section_path: s.section_path,
      text: s.text,
      char_offset: s.char_offset,
      char_length: s.char_length
    })),
    atoms: allAtoms,
    coverage_audit: coverageAudit,
    run: {
      started_at: startedAt,
      finished_at: finishedAt,
      providers,
      agents: agentRuns.map((run) => ({
        agent_id: run.agentId,
        lane: run.laneId,
        status: run.status,
        atoms_emitted: run.atomsEmitted,
        atoms_kept: run.atomsKept,
        atoms_dropped_grounding: run.atomsDroppedGrounding,
        atoms_flagged_review: run.atomsFlaggedReview,
        input_chars: run.inputChars,
        duration_ms: run.durationMs,
        error: run.error
      })),
      coverage_score
    }
  };

  return { chapter, triage: triageReviewBucket };
}

function dedupKey(atom) {
  const subj = (atom.subject?.label || '').toLowerCase().trim();
  const obj = (atom.object?.label || '').toLowerCase().trim();
  const presence = atom.qualifiers?.presence_status || 'present';
  return `${atom.kind}|${atom.predicate}|${subj}|${obj}|${presence}`;
}
