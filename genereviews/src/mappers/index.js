/**
 * Label → CURIE mappers.
 *
 * Contract:
 *   - Mappers are POST-extraction. They run as a separate pass over the
 *     chapter JSON so that the agents never invent CURIEs.
 *   - Each mapper exposes `map(label) -> { curie, label, xrefs[], synonyms[],
 *     score }` and `mapAll(labels[]) -> Map<label, MapResult>`. Mappers may
 *     return `null` when no high-confidence match exists; the atom retains
 *     `needs_mapping: true` and stays in the chapter file unloaded.
 *   - Mappers consume tab-separated label files placed under
 *     `genereviews/data/`. We do not bundle ontology data — the user points
 *     the mapper at HPO/MONDO/RxNorm releases via env vars or CLI flag so
 *     the repo stays small.
 *
 * Env defaults:
 *   GENEREVIEWS_HPO_LABELS_TSV     (id<TAB>label<TAB>synonym1|synonym2|... )
 *   GENEREVIEWS_MONDO_LABELS_TSV   (same shape)
 *   GENEREVIEWS_RXNORM_LABELS_TSV  (RxCUI<TAB>name<TAB>synonyms)
 */

import fs from 'node:fs/promises';
import path from 'node:path';

function normalize(label) {
  return label
    .toLowerCase()
    .replace(/[\u2010-\u2015]/g, '-')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[^a-z0-9 \-']+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function loadLabelsTsv(filePath) {
  if (!filePath) return null;
  let absolute = filePath;
  if (!path.isAbsolute(absolute)) absolute = path.resolve(process.cwd(), absolute);
  try {
    await fs.access(absolute);
  } catch {
    return null;
  }
  const text = await fs.readFile(absolute, 'utf8');
  const exact = new Map();
  for (const line of text.split(/\r?\n/)) {
    if (!line || line.startsWith('#')) continue;
    const parts = line.split('\t');
    if (parts.length < 2) continue;
    const [id, label, synonymsField = ''] = parts;
    if (!id || !label) continue;
    const synonyms = synonymsField.split('|').map((s) => s.trim()).filter(Boolean);
    const candidates = [label, ...synonyms];
    for (const candidate of candidates) {
      const key = normalize(candidate);
      if (!key) continue;
      if (!exact.has(key)) exact.set(key, { curie: id, label, synonyms });
    }
  }
  return exact;
}

export async function createMapper({ name, envVar, defaultFile = null, prefix = null }) {
  const file = process.env[envVar] || defaultFile;
  const index = await loadLabelsTsv(file);
  return {
    name,
    backingFile: file,
    available: Boolean(index),
    map(label) {
      if (!label || !index) return null;
      const hit = index.get(normalize(label));
      if (!hit) return null;
      if (prefix && !hit.curie.startsWith(`${prefix}:`)) return null;
      return { curie: hit.curie, label: hit.label, synonyms: hit.synonyms, score: 1.0 };
    },
    mapAll(labels) {
      const out = new Map();
      for (const label of labels) out.set(label, this.map(label));
      return out;
    }
  };
}

export async function createDefaultMappers() {
  return {
    hpo: await createMapper({ name: 'hpo', envVar: 'GENEREVIEWS_HPO_LABELS_TSV', prefix: 'HP' }),
    mondo: await createMapper({ name: 'mondo', envVar: 'GENEREVIEWS_MONDO_LABELS_TSV', prefix: 'MONDO' }),
    rxnorm: await createMapper({ name: 'rxnorm', envVar: 'GENEREVIEWS_RXNORM_LABELS_TSV', prefix: 'RxCUI' })
  };
}

/**
 * Apply mappers to a chapter document in place, only filling object.curie
 * when null. We never overwrite a CURIE the chapter printed inline.
 */
export function applyMappersToChapter(chapter, mappers) {
  const stats = { mapped: 0, unmapped: 0 };
  for (const atom of chapter.atoms) {
    if (atom.object?.curie || atom.qc?.needs_mapping !== true) continue;
    const objectKind = atom.object?.kind;
    const label = atom.object?.label;
    let result = null;
    if (objectKind === 'phenotype' && mappers.hpo?.available) result = mappers.hpo.map(label);
    else if (objectKind === 'disease' && mappers.mondo?.available) result = mappers.mondo.map(label);
    else if (objectKind === 'drug' && mappers.rxnorm?.available) result = mappers.rxnorm.map(label);
    if (result) {
      atom.object.curie = result.curie;
      atom.object.synonyms = Array.from(new Set([...(atom.object.synonyms || []), ...(result.synonyms || [])]));
      atom.qc.needs_mapping = false;
      stats.mapped += 1;
    } else {
      stats.unmapped += 1;
    }
  }
  return stats;
}
