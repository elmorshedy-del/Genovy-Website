/**
 * NCBI Bookshelf GeneReviews fetcher.
 *
 * Responsibilities:
 *   - Resolve an NBK accession to the chapter HTML (single-page form).
 *   - Respect NCBI's rate limit (≤ 3 requests / second per IP without an
 *     API key; ≤ 10 r/s with one). Defaults are conservative.
 *   - Cache fetched HTML by chapter_id + content-hash so retries do not
 *     re-hit NCBI.
 *
 * This module is intentionally I/O small and side-effect explicit. It does
 * NOT parse HTML — that is the splitter's job.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import crypto from 'node:crypto';

const NCBI_BASE = 'https://www.ncbi.nlm.nih.gov/books/';
const DEFAULT_HEADERS = Object.freeze({
  'User-Agent':
    'Genovy-GeneReviews-Extractor/1.0 (+https://genovy.ai; contact: ops@genovy.ai)',
  Accept: 'text/html,application/xhtml+xml',
  'Accept-Language': 'en'
});

const DEFAULT_OPTIONS = Object.freeze({
  minIntervalMs: 350,
  maxRetries: 4,
  retryBaseMs: 4000,
  cacheDir: null,
  fetchImpl: globalThis.fetch
});

const lastFetchAt = { value: 0 };

async function respectInterval(minIntervalMs) {
  const now = Date.now();
  const delta = now - lastFetchAt.value;
  if (delta < minIntervalMs) {
    await sleep(minIntervalMs - delta);
  }
  lastFetchAt.value = Date.now();
}

function isRetryableStatus(status) {
  return status === 429 || (status >= 500 && status < 600);
}

function cacheKeyFor(chapterId) {
  return crypto.createHash('sha256').update(chapterId).digest('hex').slice(0, 16);
}

async function readCache(cacheDir, chapterId) {
  if (!cacheDir) return null;
  const file = path.join(cacheDir, `${chapterId}.${cacheKeyFor(chapterId)}.html`);
  try {
    const html = await fs.readFile(file, 'utf8');
    return { html, file };
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

async function writeCache(cacheDir, chapterId, html) {
  if (!cacheDir) return null;
  await fs.mkdir(cacheDir, { recursive: true });
  const file = path.join(cacheDir, `${chapterId}.${cacheKeyFor(chapterId)}.html`);
  await fs.writeFile(file, html, 'utf8');
  return file;
}

/**
 * Build the canonical retrieval URL for a chapter.
 * NCBI Bookshelf serves chapters at `/books/<NBK>/` (single-page view).
 */
export function chapterUrl(chapterId) {
  if (!/^NBK[0-9]+$/.test(chapterId)) {
    throw new Error(`Invalid NCBI Bookshelf chapter id: ${chapterId}`);
  }
  return `${NCBI_BASE}${chapterId}/`;
}

export async function fetchChapterHtml(chapterId, userOptions = {}) {
  const options = { ...DEFAULT_OPTIONS, ...userOptions };
  const cached = await readCache(options.cacheDir, chapterId);
  if (cached) {
    return { chapterId, url: chapterUrl(chapterId), html: cached.html, fromCache: true, cacheFile: cached.file };
  }

  if (typeof options.fetchImpl !== 'function') {
    throw new Error('No fetch implementation available. Pass `fetchImpl` or run on Node ≥ 18.');
  }

  const url = chapterUrl(chapterId);
  let lastError = null;
  for (let attempt = 0; attempt <= options.maxRetries; attempt += 1) {
    await respectInterval(options.minIntervalMs);
    try {
      const response = await options.fetchImpl(url, {
        method: 'GET',
        headers: { ...DEFAULT_HEADERS, ...(options.headers || {}) }
      });
      if (response.ok) {
        const html = await response.text();
        const cacheFile = await writeCache(options.cacheDir, chapterId, html);
        return { chapterId, url, html, fromCache: false, cacheFile };
      }
      if (!isRetryableStatus(response.status)) {
        const body = await safeReadText(response);
        throw new Error(
          `NCBI fetch for ${chapterId} returned ${response.status} ${response.statusText} (no retry). Body head: ${body.slice(0, 200)}`
        );
      }
      lastError = new Error(`NCBI fetch ${chapterId} -> HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    const backoff = options.retryBaseMs * 2 ** attempt;
    await sleep(backoff);
  }
  throw new Error(`Failed to fetch ${chapterId} after ${options.maxRetries + 1} attempts: ${lastError?.message || 'unknown error'}`);
}

async function safeReadText(response) {
  try {
    return await response.text();
  } catch {
    return '';
  }
}
