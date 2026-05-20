#!/usr/bin/env node
/**
 * Build the 200-chapter manifest by joining the priority-symbol roster
 * against the live NCBI GeneReviews titles index.
 *
 * The titles index is published by NCBI at:
 *   https://www.ncbi.nlm.nih.gov/books/NBK1116/?report=reader
 * (the GeneReviews "All chapters" listing). We never hard-code accessions —
 * if the NCBI index changes, the manifest reflects that.
 *
 * Usage:
 *   node src/cli/buildManifest.js --out data/manifest.json --target 200
 *
 * Optional flags:
 *   --priority data/priority_symbols.json   (defaults to the bundled file)
 *   --titles-url <url>                      (override the index URL for tests)
 *   --titles-html <file>                    (use a local HTML file instead of fetching)
 *
 * The CLI prints a `verification` block listing every priority gene that
 * could NOT be resolved against the index. That list is the user's TODO —
 * we never silently drop priorities.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_TITLES_URL = 'https://www.ncbi.nlm.nih.gov/books/NBK1116/';

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

async function loadIndexHtml({ titlesHtml, titlesUrl }) {
  if (titlesHtml) return fs.readFile(titlesHtml, 'utf8');
  const res = await fetch(titlesUrl, {
    headers: {
      'User-Agent': 'Genovy-GeneReviews-Manifest-Builder/1.0 (+https://genovy.ai)'
    }
  });
  if (!res.ok) throw new Error(`titles index fetch failed: ${res.status} ${res.statusText}`);
  return res.text();
}

/**
 * Parse the NCBI titles index for (NBKxxxx, title) pairs. The index is a
 * single HTML page with anchor tags of the form
 *   <a href="/books/NBK#####/">Chapter Title</a>
 * We harvest those, dedup by NBK id, and attempt a best-effort gene-symbol
 * extraction from the title (e.g. "STXBP1-Related Disorders" -> STXBP1).
 */
function parseTitlesIndex(html) {
  const entries = new Map();
  const re = /<a[^>]+href="\/books\/(NBK[0-9]+)\/?(?:\?[^"#]*)?(?:#[^"]*)?"[^>]*>([\s\S]*?)<\/a>/gi;
  for (;;) {
    const match = re.exec(html);
    if (!match) break;
    const [, id, rawTitle] = match;
    const title = rawTitle.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    if (!title) continue;
    if (!entries.has(id) || entries.get(id).title.length < title.length) {
      entries.set(id, { chapter_id: id, title });
    }
  }
  return Array.from(entries.values());
}

function extractSymbolFromTitle(title) {
  const m = /^([A-Z][A-Z0-9]{1,9})\b/.exec(title);
  return m ? m[1] : null;
}

async function main() {
  const flags = parseArgs(process.argv.slice(2));
  const target = Number(flags.target || 200);
  const out = flags.out || './data/manifest.json';
  const priorityPath = flags.priority || path.resolve(__dirname, '..', '..', 'data', 'priority_symbols.json');
  const priority = JSON.parse(await fs.readFile(priorityPath, 'utf8'));

  const html = await loadIndexHtml({
    titlesHtml: flags['titles-html'] || null,
    titlesUrl: flags['titles-url'] || DEFAULT_TITLES_URL
  });
  const indexEntries = parseTitlesIndex(html);

  // Build a symbol -> entry map (best-effort).
  const bySymbol = new Map();
  for (const entry of indexEntries) {
    const sym = extractSymbolFromTitle(entry.title);
    if (sym && !bySymbol.has(sym)) bySymbol.set(sym, entry);
  }

  const seen = new Set();
  const manifestChapters = [];
  const unresolved = [];

  function pushIfNew(entry, tier, rationale, primary_symbol) {
    if (!entry || seen.has(entry.chapter_id)) return false;
    seen.add(entry.chapter_id);
    manifestChapters.push({
      chapter_id: entry.chapter_id,
      title: entry.title,
      primary_symbol,
      priority_tier: tier,
      rationale
    });
    return true;
  }

  const p0 = priority.p0_active_misses || [];
  for (const symbol of p0) {
    const entry = bySymbol.get(symbol);
    if (!entry) {
      unresolved.push({ symbol, tier: 'P0' });
      continue;
    }
    pushIfNew(entry, 'P0', `Active Genovy DX miss family (priority P0): ${symbol}.`, symbol);
  }
  const p1 = priority.p1_undercovered_truth_branches || [];
  for (const symbol of p1) {
    const entry = bySymbol.get(symbol);
    if (!entry) {
      unresolved.push({ symbol, tier: 'P1' });
      continue;
    }
    pushIfNew(entry, 'P1', `Undercovered truth branch (priority P1): ${symbol}.`, symbol);
  }

  // Fill the rest from the index until we hit `target`. We pick the
  // alphabetically-first symbols we have not seen yet, which is stable and
  // reproducible. Downstream tooling can re-rank these by HPO edge count.
  const remainingSorted = indexEntries
    .filter((entry) => !seen.has(entry.chapter_id))
    .sort((a, b) => a.title.localeCompare(b.title));
  for (const entry of remainingSorted) {
    if (manifestChapters.length >= target) break;
    const symbol = extractSymbolFromTitle(entry.title) || entry.title.split(/\s+/)[0];
    pushIfNew(entry, 'P2', 'Filler from NCBI GeneReviews titles index.', symbol);
  }

  const manifest = {
    schema_version: '1.0.0',
    generated_at: new Date().toISOString(),
    chapters: manifestChapters
  };
  await fs.writeFile(out, JSON.stringify(manifest, null, 2));

  console.log(JSON.stringify({
    output: out,
    total_chapters: manifestChapters.length,
    target,
    p0_resolved: p0.length - unresolved.filter((u) => u.tier === 'P0').length,
    p1_resolved: p1.length - unresolved.filter((u) => u.tier === 'P1').length,
    unresolved
  }, null, 2));
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
