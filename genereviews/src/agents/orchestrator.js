/**
 * Orchestrator — runs the full per-chapter agent fleet.
 *
 * Inputs:
 *   - chapterId               (e.g. "NBK487886")
 *   - html                    (the chapter HTML as fetched)
 *   - provider                (an object exposing complete({...}))
 *   - retrievedAt             (ISO timestamp; falls back to now)
 *   - laneSelection           (optional: array of laneIds to run; default = all)
 *   - laneConcurrency         (optional: number of agents to run in parallel; default = 4)
 *
 * Output:
 *   - { chapter, triage }     (chapter validates against chapter.schema.json)
 */

import { splitChapterHtml } from '../fetch/sectionSplitter.js';
import { chapterUrl } from '../fetch/ncbiBookshelf.js';
import { runAgent } from './runAgent.js';
import { mergeChapterAtoms } from './merger.js';
import { computeCoverageAudit, validateChapterStrict } from './validator.js';
import { SECTION_LANES, getLaneById } from '../sections.js';

const DEFAULT_LANE_CONCURRENCY = 4;

export async function extractChapter({
  chapterId,
  html,
  provider,
  retrievedAt = new Date().toISOString(),
  laneSelection = null,
  laneConcurrency = DEFAULT_LANE_CONCURRENCY,
  retrievalUrl = null,
  knownGenes = [],
  knownDiseases = []
}) {
  if (!chapterId) throw new Error('extractChapter requires a chapterId');
  if (typeof html !== 'string' || html.length === 0) {
    throw new Error('extractChapter requires non-empty html');
  }
  if (!provider || typeof provider.complete !== 'function') {
    throw new Error('extractChapter requires a provider with .complete()');
  }

  const startedAt = new Date().toISOString();
  const split = splitChapterHtml(html, { chapterId });
  const url = retrievalUrl || chapterUrl(chapterId);

  // Group slices per lane. Multiple slices for the same lane are concatenated
  // with a separator line so the agent gets one contiguous chunk per lane.
  const slicesByLane = new Map();
  for (const slice of split.sections) {
    if (!slicesByLane.has(slice.lane)) slicesByLane.set(slice.lane, []);
    slicesByLane.get(slice.lane).push(slice);
  }
  for (const [lane, list] of slicesByLane) {
    if (list.length === 1) continue;
    const merged = {
      lane,
      section_path: ['(merged)', ...list[0].section_path.slice(0, 1)],
      text: list
        .map((s) => `## ${s.section_path.join(' > ')}\n${s.text}`)
        .join('\n\n'),
      char_offset: list[0].char_offset,
      char_length: list.reduce((acc, s) => acc + s.char_length, 0)
    };
    slicesByLane.set(lane, [merged]);
  }

  const desiredLanes = laneSelection
    ? laneSelection.filter((id) => getLaneById(id))
    : SECTION_LANES.map((lane) => lane.id);

  // Build the agent task list. We only spawn an agent for lanes that
  // actually have a slice; missing lanes record an explicit 'skipped' run
  // so downstream consumers can tell "empty chapter" from "lane absent".
  const tasks = [];
  const skipRuns = [];
  for (const laneId of desiredLanes) {
    const slices = slicesByLane.get(laneId);
    if (!slices || slices.length === 0 || !slices[0].text || slices[0].text.length < 8) {
      skipRuns.push({
        agentId: `${laneId}.v1`,
        laneId,
        status: 'skipped',
        atomsEmitted: 0,
        atomsKept: 0,
        atomsDroppedGrounding: 0,
        atomsFlaggedReview: 0,
        inputChars: 0,
        durationMs: 0,
        atoms: [],
        triage: [],
        error: null
      });
      continue;
    }
    tasks.push({ laneId, slice: slices[0] });
  }

  const agentRuns = await runWithConcurrency(tasks, laneConcurrency, async ({ laneId, slice }) => {
    try {
      return await runAgent({
        laneId,
        slice,
        provider,
        chapter: { chapter_id: chapterId, chapter_title: split.chapterTitle || chapterId },
        retrievedAt
      });
    } catch (error) {
      return {
        agentId: `${laneId}.v1`,
        laneId,
        status: 'failed',
        atomsEmitted: 0,
        atomsKept: 0,
        atomsDroppedGrounding: 0,
        atomsFlaggedReview: 0,
        inputChars: slice.text.length,
        durationMs: 0,
        atoms: [],
        triage: [],
        error: error.message
      };
    }
  });

  const coverageAudit = computeCoverageAudit({ split });

  const allRuns = [...agentRuns, ...skipRuns];
  const finishedAt = new Date().toISOString();
  const { chapter, triage } = mergeChapterAtoms({
    chapterId,
    chapterTitle: split.chapterTitle || chapterId,
    chapterVersion: split.chapterRevision,
    retrievalUrl: url,
    retrievedAt,
    genes: knownGenes,
    diseases: knownDiseases,
    sections: split.sections,
    agentRuns: allRuns,
    startedAt,
    finishedAt,
    providers: [{ name: provider.name, model: provider.model }],
    coverageAudit
  });

  const { ok, errors } = await validateChapterStrict(chapter);
  if (!ok) {
    const sample = errors.slice(0, 5).map((e) => `${e.instancePath} ${e.message}`).join('; ');
    throw new Error(`Chapter document failed schema validation: ${sample}`);
  }

  return { chapter, triage };
}

async function runWithConcurrency(items, concurrency, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.max(1, concurrency) }, async () => {
    while (true) {
      const index = cursor;
      cursor += 1;
      if (index >= items.length) return;
      results[index] = await worker(items[index]);
    }
  });
  await Promise.all(workers);
  return results;
}
