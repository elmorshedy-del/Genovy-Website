#!/usr/bin/env node
/**
 * Extract a batch of chapters with parallelism + resume + checkpoints.
 *
 * Usage:
 *   node src/cli/extractBatch.js --manifest data/manifest.seed.json \
 *     --provider openai --cache-dir .cache --output-dir ./out \
 *     --chapter-concurrency 4 --lane-concurrency 4
 *
 * Resume behavior:
 *   - If <output-dir>/<chapterId>.chapter.json already exists and validates,
 *     the chapter is skipped.
 *   - A run-level checkpoint at <output-dir>/_batch.checkpoint.json records
 *     per-chapter status (`ok`, `failed`, `skipped_existing`) and the last
 *     finish timestamp. Re-running the same command continues from where
 *     it left off.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { extractChapter } from '../agents/orchestrator.js';
import { fetchChapterHtml } from '../fetch/ncbiBookshelf.js';
import { createMockProvider } from '../providers/mock.js';
import { createOpenAIProvider } from '../providers/openai.js';
import { createAnthropicProvider } from '../providers/anthropic.js';
import { validateChapterStrict, validateManifestStrict } from '../agents/validator.js';

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

function selectProvider(name) {
  switch ((name || 'mock').toLowerCase()) {
    case 'openai': return createOpenAIProvider();
    case 'anthropic': return createAnthropicProvider();
    case 'mock':
    default: return createMockProvider();
  }
}

async function loadCheckpoint(file) {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'));
  } catch {
    return { entries: {} };
  }
}

async function saveCheckpoint(file, checkpoint) {
  await fs.writeFile(file, JSON.stringify(checkpoint, null, 2));
}

async function chapterAlreadyOk(file) {
  try {
    const chapter = JSON.parse(await fs.readFile(file, 'utf8'));
    const { ok } = await validateChapterStrict(chapter);
    return ok;
  } catch {
    return false;
  }
}

async function main() {
  const flags = parseArgs(process.argv.slice(2));
  if (!flags.manifest) {
    console.error('error: --manifest <path> is required');
    process.exit(2);
  }
  const outputDir = flags['output-dir'] || './out';
  await fs.mkdir(outputDir, { recursive: true });

  const manifest = JSON.parse(await fs.readFile(flags.manifest, 'utf8'));
  const validation = await validateManifestStrict(manifest);
  if (!validation.ok) {
    console.error('Manifest schema violations:');
    for (const err of validation.errors.slice(0, 10)) {
      console.error(`  ${err.instancePath} ${err.message}`);
    }
    process.exit(2);
  }

  const provider = selectProvider(flags.provider);
  const cacheDir = flags['cache-dir'] || null;
  const chapterConcurrency = Number(flags['chapter-concurrency'] || 2);
  const laneConcurrency = Number(flags['lane-concurrency'] || 4);
  const checkpointFile = path.join(outputDir, '_batch.checkpoint.json');
  const checkpoint = await loadCheckpoint(checkpointFile);

  const chapters = manifest.chapters.slice();
  const queue = chapters.map((c) => c);
  const workers = Array.from({ length: Math.max(1, chapterConcurrency) }, async () => {
    while (queue.length > 0) {
      const entry = queue.shift();
      if (!entry) continue;
      const chapterId = entry.chapter_id;
      const chapterFile = path.join(outputDir, `${chapterId}.chapter.json`);
      if (!flags.force && (await chapterAlreadyOk(chapterFile))) {
        checkpoint.entries[chapterId] = { status: 'skipped_existing', updated_at: new Date().toISOString() };
        await saveCheckpoint(checkpointFile, checkpoint);
        continue;
      }
      try {
        const fetched = await fetchChapterHtml(chapterId, { cacheDir });
        const { chapter, triage } = await extractChapter({
          chapterId,
          html: fetched.html,
          provider,
          retrievalUrl: fetched.url,
          laneConcurrency
        });
        await fs.writeFile(chapterFile, JSON.stringify(chapter, null, 2));
        await fs.writeFile(
          path.join(outputDir, `${chapterId}.review.json`),
          JSON.stringify({ chapter_id: chapterId, triage }, null, 2)
        );
        checkpoint.entries[chapterId] = {
          status: 'ok',
          atoms: chapter.atoms.length,
          coverage_score: chapter.run.coverage_score,
          passes_accounting: chapter.coverage_audit.passes_accounting,
          updated_at: new Date().toISOString()
        };
      } catch (error) {
        checkpoint.entries[chapterId] = {
          status: 'failed',
          error: error.message,
          updated_at: new Date().toISOString()
        };
      }
      await saveCheckpoint(checkpointFile, checkpoint);
    }
  });
  await Promise.all(workers);

  const ok = Object.values(checkpoint.entries).filter((e) => e.status === 'ok').length;
  const skipped = Object.values(checkpoint.entries).filter((e) => e.status === 'skipped_existing').length;
  const failed = Object.values(checkpoint.entries).filter((e) => e.status === 'failed').length;
  console.log(JSON.stringify({
    total: chapters.length,
    ok,
    skipped_existing: skipped,
    failed,
    output_dir: outputDir,
    checkpoint: checkpointFile
  }, null, 2));
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
