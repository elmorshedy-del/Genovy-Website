/**
 * Anthropic (Claude) provider.
 *
 * Required env:
 *   - GENEREVIEWS_ANTHROPIC_API_KEY (or ANTHROPIC_API_KEY)
 * Optional env:
 *   - GENEREVIEWS_ANTHROPIC_MODEL (defaults to claude-opus-4-20250514)
 *   - GENEREVIEWS_ANTHROPIC_BASE_URL (defaults to https://api.anthropic.com/v1)
 *
 * Note: Anthropic does not enforce JSON output server-side. The provider
 * asks Claude to emit pure JSON via the system instruction and then
 * parses defensively (strip optional code fences).
 */

export function createAnthropicProvider({
  apiKey = process.env.GENEREVIEWS_ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY,
  baseUrl = process.env.GENEREVIEWS_ANTHROPIC_BASE_URL || 'https://api.anthropic.com/v1',
  model = process.env.GENEREVIEWS_ANTHROPIC_MODEL || 'claude-opus-4-20250514',
  temperature = 0,
  maxOutputTokens = 4096,
  fetchImpl = globalThis.fetch
} = {}) {
  if (!apiKey) {
    throw new Error('createAnthropicProvider requires an API key (set GENEREVIEWS_ANTHROPIC_API_KEY).');
  }
  return {
    name: 'anthropic',
    model,
    async complete({ systemPrompt, lanePrompt, laneId, sliceText, sectionPath, chapterId, chapterTitle, retrievedAt, allowedKinds }) {
      const userPrompt = buildUserPrompt({
        laneId,
        chapterId,
        chapterTitle,
        sectionPath,
        sliceText,
        retrievedAt,
        allowedKinds
      });
      const response = await fetchImpl(`${baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model,
          temperature,
          max_tokens: maxOutputTokens,
          system: `${systemPrompt}\n\n---\n\n${lanePrompt}\n\nReturn JSON only. No code fences. No prose.`,
          messages: [{ role: 'user', content: userPrompt }]
        })
      });
      if (!response.ok) {
        const body = await safeReadText(response);
        throw new Error(`Anthropic ${response.status} ${response.statusText}: ${body.slice(0, 400)}`);
      }
      const json = await response.json();
      const text = (json?.content || []).map((part) => part?.text).filter(Boolean).join('');
      if (!text) throw new Error('Anthropic response missing content');
      return safeJsonParse(text);
    }
  };
}

function buildUserPrompt({ laneId, chapterId, chapterTitle, sectionPath, sliceText, retrievedAt, allowedKinds }) {
  return [
    `chapter_id: ${chapterId}`,
    `chapter_title: ${chapterTitle}`,
    `section_lane: ${laneId}`,
    `section_path: ${JSON.stringify(sectionPath)}`,
    `retrieved_at: ${retrievedAt}`,
    `allowed_kinds: ${JSON.stringify(allowedKinds)}`,
    '',
    'Section text (verbatim — your `verbatim_quote` MUST be a substring of THIS text, zero-indexed):',
    '---BEGIN_SECTION_TEXT---',
    sliceText,
    '---END_SECTION_TEXT---',
    '',
    'Return JSON: {"atoms": [...]}.'
  ].join('\n');
}

function safeJsonParse(content) {
  const stripped = content
    .replace(/^```(?:json)?\s*/, '')
    .replace(/```\s*$/, '')
    .trim();
  try {
    return JSON.parse(stripped);
  } catch (error) {
    const match = /\{[\s\S]*\}/.exec(stripped);
    if (match) {
      try { return JSON.parse(match[0]); } catch (_) {}
    }
    throw new Error(`Anthropic returned non-JSON content: ${error.message}`);
  }
}

async function safeReadText(response) {
  try { return await response.text(); } catch { return ''; }
}
