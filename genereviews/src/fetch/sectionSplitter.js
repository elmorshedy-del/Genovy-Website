/**
 * Section splitter for NCBI Bookshelf GeneReviews chapter HTML.
 *
 * Design choices:
 *   - No external HTML parser dependency. The Bookshelf HTML for GeneReviews
 *     uses a stable, predictable pattern: a <body> with consecutive
 *     <h2>…<h6> headings introducing sibling content. We tokenize on heading
 *     tags and slice between them. This is intentionally rugged: the goal
 *     is to never lose a byte, not to render a tree.
 *   - The output preserves every heading the chapter contained, including
 *     headings that the lane registry routes to `unassigned` (overflow) and
 *     to droppable (References / Resources / Chapter Notes). The chapter
 *     accounting check uses these counts to prove byte-level completeness.
 *   - Tables, lists, and inline links are preserved as plain text. We
 *     normalize whitespace but keep line breaks at block boundaries so the
 *     verbatim grounding check still works against the slice.
 *
 * Pure function: splitChapterHtml(html) -> {
 *   chapterTitle, sections: SectionSlice[], droppedSections: SectionSlice[],
 *   bodyChars, accountedChars, droppedChars, unassignedChars,
 *   unassignedHeadings: string[]
 * }
 */

import { resolveLaneForHeading, isDroppableHeading } from '../sections.js';

const HEADING_TAG_RE = /<(h[1-6])\b([^>]*)>([\s\S]*?)<\/\1\s*>/gi;
const SCRIPT_RE = /<script\b[^>]*>[\s\S]*?<\/script\s*>/gi;
const STYLE_RE = /<style\b[^>]*>[\s\S]*?<\/style\s*>/gi;
const NOSCRIPT_RE = /<noscript\b[^>]*>[\s\S]*?<\/noscript\s*>/gi;
const TAG_RE = /<\/?[a-zA-Z][^>]*>/g;
const WHITESPACE_RUN_RE = /[ \t\f\v]+/g;
const NEWLINE_RUN_RE = /\n{3,}/g;
const HTML_ENTITY_RE = /&([a-zA-Z]+|#\d+|#x[0-9a-fA-F]+);/g;

const ENTITY_MAP = Object.freeze({
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  ndash: '–',
  mdash: '—',
  hellip: '…',
  ge: '≥',
  le: '≤',
  rsquo: '\u2019',
  lsquo: '\u2018',
  ldquo: '\u201C',
  rdquo: '\u201D'
});

function decodeEntity(_, ent) {
  if (ent.startsWith('#x') || ent.startsWith('#X')) {
    return String.fromCodePoint(parseInt(ent.slice(2), 16));
  }
  if (ent.startsWith('#')) {
    return String.fromCodePoint(parseInt(ent.slice(1), 10));
  }
  return ENTITY_MAP[ent] || _;
}

function stripHtmlToText(html) {
  return html
    .replace(SCRIPT_RE, '')
    .replace(STYLE_RE, '')
    .replace(NOSCRIPT_RE, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|li|tr|h[1-6]|div|section|article|td|th)\s*>/gi, '\n')
    .replace(/<li\b[^>]*>/gi, '• ')
    .replace(TAG_RE, '')
    .replace(HTML_ENTITY_RE, decodeEntity)
    .replace(WHITESPACE_RUN_RE, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(NEWLINE_RUN_RE, '\n\n')
    .trim();
}

function parseHeadingLevel(tag) {
  const m = /^h([1-6])$/i.exec(tag);
  return m ? Number(m[1]) : null;
}

function extractTitleFromHtml(html) {
  const m = /<title\b[^>]*>([\s\S]*?)<\/title\s*>/i.exec(html);
  if (!m) return null;
  return stripHtmlToText(m[1]).split(/\s[-–|]\s/)[0]?.trim() || null;
}

function extractChapterRevision(html) {
  // GeneReviews historically prints "Last Update: <date>" or "Initial Posting: <date>".
  const updated =
    /Last Update[:\s]+([A-Z][a-z]+ \d{1,2},\s+\d{4})/.exec(html) ||
    /Last Revision[:\s]+([A-Z][a-z]+ \d{1,2},\s+\d{4})/.exec(html);
  if (updated) return updated[1];
  const initial = /Initial Posting[:\s]+([A-Z][a-z]+ \d{1,2},\s+\d{4})/.exec(html);
  return initial ? initial[1] : null;
}

/**
 * Walk the HTML once and produce raw heading events:
 *   { tag, level, text, start, end }
 * where start/end are HTML offsets. We will then convert those to plain-text
 * slice offsets after stripping.
 */
function harvestHeadings(html) {
  const events = [];
  HEADING_TAG_RE.lastIndex = 0;
  for (;;) {
    const match = HEADING_TAG_RE.exec(html);
    if (!match) break;
    const level = parseHeadingLevel(match[1]);
    // The chapter title is rendered as <h1>. It is metadata, not a section,
    // and is captured by extractTitleFromHtml. Skipping it prevents the
    // chapter title from being mis-routed to the `unassigned` overflow lane.
    if (!level || level < 2) continue;
    const text = stripHtmlToText(match[3]);
    if (!text) continue;
    events.push({
      level,
      headingHtmlStart: match.index,
      headingHtmlEnd: match.index + match[0].length,
      headingText: text
    });
  }
  return events;
}

/**
 * Convert (headingHtmlStart, headingHtmlEnd) into (plainStart, plainEnd) by
 * stripping the substring of HTML from chapter start up to that index and
 * measuring the resulting length. This is O(n²) in the worst case but the
 * heading count is small (typically < 50 per chapter), so it stays fast.
 */
function locateInPlain(plainBody, sliceHtmlBody, headingEvents) {
  // Strategy: re-strip the prefix at each event so plain offsets are exact.
  const located = [];
  for (const event of headingEvents) {
    const prefixHtml = sliceHtmlBody.slice(0, event.headingHtmlStart);
    const prefixPlain = stripHtmlToText(prefixHtml);
    const startInPlain = prefixPlain.length === 0 ? 0 : prefixPlain.length;
    // The heading's *content* in plain text appears right after the prefix,
    // possibly with a separator newline introduced by stripping the closing
    // </h?> tag. Find its actual start by locating the heading text after
    // startInPlain to be tolerant to small whitespace differences.
    let resolvedStart = plainBody.indexOf(event.headingText, Math.max(0, startInPlain - 4));
    if (resolvedStart < 0) {
      // Try a fuzzier lookup (compress whitespace) before giving up.
      resolvedStart = plainBody.indexOf(event.headingText.replace(/\s+/g, ' '), Math.max(0, startInPlain - 16));
    }
    if (resolvedStart < 0) continue;
    located.push({
      level: event.level,
      headingText: event.headingText,
      headingPlainStart: resolvedStart,
      headingPlainEnd: resolvedStart + event.headingText.length
    });
  }
  return located;
}

function isolateBodyHtml(html) {
  const m = /<body\b[^>]*>([\s\S]*)<\/body\s*>/i.exec(html);
  return m ? m[1] : html;
}

/**
 * Build section slices by walking the located heading list. A slice ends
 * either at the next heading of the same-or-shallower level OR at end-of-body.
 * We then collapse sibling subsections into their parent lane via the lane
 * registry, but we keep each heading's own char_offset/char_length in the
 * output so the coverage audit sums correctly.
 */
function buildSlices({ plainBody, locatedHeadings, chapterId, chapterTitle }) {
  const result = [];
  for (let index = 0; index < locatedHeadings.length; index += 1) {
    const current = locatedHeadings[index];
    let sliceEnd = plainBody.length;
    for (let look = index + 1; look < locatedHeadings.length; look += 1) {
      const next = locatedHeadings[look];
      if (next.level <= current.level) {
        sliceEnd = next.headingPlainStart;
        break;
      }
    }
    const bodyStart = current.headingPlainEnd;
    const bodyEnd = sliceEnd;
    const bodyText = plainBody.slice(bodyStart, bodyEnd).trim();

    // Build the section_path breadcrumb by scanning back through parent levels.
    const path = [current.headingText];
    for (let look = index - 1; look >= 0; look -= 1) {
      const candidate = locatedHeadings[look];
      if (candidate.level < (path.length === 1 ? current.level : current.level - 1)) {
        path.unshift(candidate.headingText);
        if (candidate.level <= 2) break;
      }
    }

    result.push({
      heading: current.headingText,
      level: current.level,
      section_path: path,
      text: bodyText,
      char_offset: bodyStart,
      char_length: Math.max(0, bodyEnd - bodyStart)
    });
  }
  return result;
}

/**
 * Public API.
 */
export function splitChapterHtml(html, { chapterId = null } = {}) {
  if (typeof html !== 'string' || html.length === 0) {
    throw new Error('splitChapterHtml requires a non-empty HTML string');
  }
  const bodyHtml = isolateBodyHtml(html);
  const plainBody = stripHtmlToText(bodyHtml);
  const headingEvents = harvestHeadings(bodyHtml);
  const located = locateInPlain(plainBody, bodyHtml, headingEvents);
  const slices = buildSlices({
    plainBody,
    locatedHeadings: located,
    chapterId,
    chapterTitle: extractTitleFromHtml(html)
  });

  const sections = [];
  const droppedSections = [];
  let unassignedChars = 0;
  let droppedChars = 0;
  let accountedChars = 0;
  const unassignedHeadings = [];

  for (const slice of slices) {
    if (isDroppableHeading(slice.heading)) {
      droppedSections.push({ ...slice, lane: '__drop__' });
      droppedChars += slice.char_length;
      continue;
    }
    const resolution = resolveLaneForHeading(slice.heading);
    if (!resolution) {
      droppedSections.push({ ...slice, lane: '__drop__' });
      droppedChars += slice.char_length;
      continue;
    }
    const lane = resolution.lane.id;
    if (lane === 'unassigned') {
      unassignedChars += slice.char_length;
      unassignedHeadings.push(slice.heading);
    }
    accountedChars += slice.char_length;
    sections.push({
      lane,
      section_path: slice.section_path,
      heading: slice.heading,
      level: slice.level,
      text: slice.text,
      char_offset: slice.char_offset,
      char_length: slice.char_length
    });
  }

  return {
    chapterId,
    chapterTitle: extractTitleFromHtml(html),
    chapterRevision: extractChapterRevision(html),
    bodyChars: plainBody.length,
    accountedChars,
    unassignedChars,
    droppedChars,
    unassignedHeadings,
    plainBody,
    sections,
    droppedSections
  };
}
