#!/usr/bin/env node
/**
 * Extract a single chapter end-to-end.
 *
 * Usage:
 *   node src/cli/extractChapter.js --chapter NBK487886 --provider mock \
 *     --output-dir ./out
 *
 *   node src/cli/extractChapter.js --chapter NBK487886 --provider openai \
 *     --cache-dir .cache --output-dir ./out
 *
 *   node src/cli/extractChapter.js --html ./fixtures/kbg.html \
 *     --chapter NBK487886 --provider mock --output-dir ./out
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { extractChapter } from '../agents/orchestrator.js';
import { fetchChapterHtml } from '../fetch/ncbiBookshelf.js';
import { createMockProvider } from '../providers/mock.js';
import { createOpenAIProvider } from '../providers/openai.js';
import { createAnthropicProvider } from '../providers/anthropic.js';
import { applyMappersToChapter, createDefaultMappers } from '../mappers/index.js';

function parseArgs(argv) {
  const flags = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) {
      flags[key] = true;
      continue;
    }
    flags[key] = next;
    i += 1;
  }
  return flags;
}

function selectProvider(name) {
  switch ((name || 'mock').toLowerCase()) {
    case 'openai': return createOpenAIProvider();
    case 'anthropic': return createAnthropicProvider();
    case 'mock':
    default: return createMockProvider();
  }
}

async function main() {
  const flags = parseArgs(process.argv.slice(2));
  if (!flags.chapter) {
    console.error('error: --chapter <NBK#####> is required');
    process.exit(2);
  }
  const chapterId = flags.chapter;
  const outputDir = flags['output-dir'] || './out';
  await fs.mkdir(outputDir, { recursive: true });

  let html;
  let retrievalUrl = null;
  if (flags.html) {
    html = await fs.readFile(flags.html, 'utf8');
    retrievalUrl = null;
  } else {
    const result = await fetchChapterHtml(chapterId, { cacheDir: flags['cache-dir'] || null });
    html = result.html;
    retrievalUrl = result.url;
  }

  const provider = selectProvider(flags.provider);
  const laneSelection = flags.lanes ? String(flags.lanes).split(',').map((s) => s.trim()) : null;
  const concurrency = Number(flags.concurrency || 4);

  const { chapter, triage } = await extractChapter({
    chapterId,
    html,
    provider,
    laneSelection,
    laneConcurrency: concurrency,
    retrievalUrl
  });

  if (flags['apply-mappers'] === true || flags['apply-mappers'] === 'true') {
    const mappers = await createDefaultMappers();
    const stats = applyMappersToChapter(chapter, mappers);
    chapter.run.mapping = stats;
  }

  const outChapter = path.join(outputDir, `${chapterId}.chapter.json`);
  const outTriage = path.join(outputDir, `${chapterId}.review.json`);
  await fs.writeFile(outChapter, JSON.stringify(chapter, null, 2));
  await fs.writeFile(outTriage, JSON.stringify({ chapter_id: chapterId, triage }, null, 2));

  console.log(JSON.stringify({
    chapter_id: chapterId,
    atoms: chapter.atoms.length,
    coverage_score: chapter.run.coverage_score,
    coverage_audit_passes: chapter.coverage_audit.passes_accounting,
    unassigned_headings: chapter.coverage_audit.unassigned_headings,
    output: outChapter,
    review: outTriage
  }, null, 2));
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
