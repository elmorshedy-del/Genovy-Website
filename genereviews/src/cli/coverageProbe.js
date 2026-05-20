#!/usr/bin/env node
/**
 * Coverage probe — fetch heading inventories from N chapters and report
 * which headings are unmatched by the canonical lane registry.
 *
 * Usage:
 *   node src/cli/coverageProbe.js --manifest data/manifest.seed.json \
 *     --cache-dir .cache --top 50
 *
 * Output (stdout, JSON):
 *   {
 *     chapters_probed: 200,
 *     unmatched_headings: [{ heading, count, sample_chapter_ids: [...] }, ...],
 *     droppable_headings: [...],
 *     lane_hits: { clinical_description: 198, ... }
 *   }
 *
 * Use it before you trust the taxonomy on a new batch. Until this report
 * shows no high-frequency unmatched headings, the lane registry is treated
 * as provisional.
 */

import fs from 'node:fs/promises';
import { fetchChapterHtml } from '../fetch/ncbiBookshelf.js';
import { splitChapterHtml } from '../fetch/sectionSplitter.js';
import { SECTION_LANES } from '../sections.js';

function parseArgs(argv) {
  const flags = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) { flags[key] = true; continue; }
    flags[key] = next; i += 1;
  }
  return flags;
}

async function main() {
  const flags = parseArgs(process.argv.slice(2));
  if (!flags.manifest) {
    console.error('error: --manifest <path> is required');
    process.exit(2);
  }
  const cacheDir = flags['cache-dir'] || null;
  const top = Number(flags.top || 100);
  const manifest = JSON.parse(await fs.readFile(flags.manifest, 'utf8'));
  const chapters = manifest.chapters.slice(0, Number(flags.limit || manifest.chapters.length));

  const laneHits = Object.fromEntries(SECTION_LANES.map((l) => [l.id, 0]));
  const unmatched = new Map();
  const droppable = new Map();
  let totalBody = 0;
  let totalAccounted = 0;
  let totalUnassigned = 0;

  let probed = 0;
  for (const entry of chapters) {
    const chapterId = entry.chapter_id;
    let result;
    try {
      result = await fetchChapterHtml(chapterId, { cacheDir });
    } catch (error) {
      console.error(`fetch failed ${chapterId}: ${error.message}`);
      continue;
    }
    let split;
    try {
      split = splitChapterHtml(result.html, { chapterId });
    } catch (error) {
      console.error(`split failed ${chapterId}: ${error.message}`);
      continue;
    }
    probed += 1;
    totalBody += split.bodyChars;
    totalAccounted += split.accountedChars + split.droppedChars;
    totalUnassigned += split.unassignedChars;
    for (const section of split.sections) {
      laneHits[section.lane] = (laneHits[section.lane] || 0) + 1;
      if (section.lane === 'unassigned') {
        const slot = unmatched.get(section.heading) || { count: 0, samples: new Set() };
        slot.count += 1;
        slot.samples.add(chapterId);
        unmatched.set(section.heading, slot);
      }
    }
    for (const dropped of split.droppedSections) {
      const slot = droppable.get(dropped.heading) || { count: 0, samples: new Set() };
      slot.count += 1;
      slot.samples.add(chapterId);
      droppable.set(dropped.heading, slot);
    }
  }

  const unmatchedList = Array.from(unmatched.entries())
    .map(([heading, { count, samples }]) => ({
      heading,
      count,
      sample_chapter_ids: Array.from(samples).slice(0, 5)
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, top);

  const droppedList = Array.from(droppable.entries())
    .map(([heading, { count }]) => ({ heading, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, top);

  const accountingRatio = totalBody === 0 ? 1 : totalAccounted / totalBody;

  console.log(JSON.stringify({
    chapters_probed: probed,
    accounting_ratio: Number(accountingRatio.toFixed(4)),
    total_body_chars: totalBody,
    total_unassigned_chars: totalUnassigned,
    unmatched_headings: unmatchedList,
    droppable_headings: droppedList,
    lane_hits: laneHits
  }, null, 2));
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
