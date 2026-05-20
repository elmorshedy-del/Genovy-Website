/**
 * OpenAI-compatible provider (also works with any vendor that ships an
 * OpenAI-shaped /v1/chat/completions endpoint, including Azure OpenAI,
 * vLLM, Together, Groq, etc.).
 *
 * Configuration is environment-driven so secrets stay outside the repo.
 * Required env:
 *   - GENEREVIEWS_OPENAI_API_KEY (or OPENAI_API_KEY as fallback)
 * Optional env:
 *   - GENEREVIEWS_OPENAI_BASE_URL (defaults to https://api.openai.com/v1)
 *   - GENEREVIEWS_OPENAI_MODEL    (defaults to gpt-4o-mini)
 *
 * The provider asks the server for a JSON-only response using
 * `response_format: { type: "json_object" }`, then parses + returns.
 * The orchestrator handles validation and grounding QC separately, so this
 * file stays small and focused.
 */

export function createOpenAIProvider({
  apiKey = process.env.GENEREVIEWS_OPENAI_API_KEY || process.env.OPENAI_API_KEY,
  baseUrl = process.env.GENEREVIEWS_OPENAI_BASE_URL || 'https://api.openai.com/v1',
  model = process.env.GENEREVIEWS_OPENAI_MODEL || 'gpt-4o-mini',
  temperature = 0,
  maxOutputTokens = 4096,
  fetchImpl = globalThis.fetch
} = {}) {
  if (!apiKey) {
    throw new Error('createOpenAIProvider requires an API key (set GENEREVIEWS_OPENAI_API_KEY).');
  }
  return {
    name: 'openai',
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
      const response = await fetchImpl(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model,
          temperature,
          max_tokens: maxOutputTokens,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: `${systemPrompt}\n\n---\n\n${lanePrompt}` },
            { role: 'user', content: userPrompt }
          ]
        })
      });
      if (!response.ok) {
        const body = await safeReadText(response);
        throw new Error(`OpenAI ${response.status} ${response.statusText}: ${body.slice(0, 400)}`);
      }
      const json = await response.json();
      const content = json?.choices?.[0]?.message?.content;
      if (typeof content !== 'string') {
        throw new Error('OpenAI response missing message.content');
      }
      const parsed = safeJsonParse(content);
      return parsed;
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
    'Return JSON: {"atoms": [...]}. No prose, no markdown fences, no commentary.'
  ].join('\n');
}

function safeJsonParse(content) {
  try {
    return JSON.parse(content);
  } catch (error) {
    const match = /\{[\s\S]*\}/.exec(content);
    if (match) {
      try { return JSON.parse(match[0]); } catch (_) {}
    }
    throw new Error(`Provider returned non-JSON content: ${error.message}`);
  }
}

async function safeReadText(response) {
  try { return await response.text(); } catch { return ''; }
}
