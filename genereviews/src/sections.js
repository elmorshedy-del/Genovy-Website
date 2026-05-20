/**
 * Canonical GeneReviews section taxonomy used to fan out one agent per section.
 *
 * The taxonomy maps the NCBI Bookshelf GeneReviews template (which is largely
 * stable across chapters) onto a small set of "agent lanes". Each lane has:
 *
 *   - id:                stable string used in provenance + filenames
 *   - title:             human label
 *   - matchHeadings:     case-insensitive regexes that catch the section's
 *                        NCBI Bookshelf heading and likely synonyms / shorter
 *                        variants. Order matters: first match wins.
 *   - childMatchHeadings: optional regexes for sub-headings that should be
 *                        merged into this lane (e.g. "Clinical Description"
 *                        also absorbs "Phenotypic Correlations").
 *   - emits:             the assertion `kind`s this lane is allowed to produce.
 *                        Used by the validator to reject cross-lane drift
 *                        (e.g. a Surveillance agent cannot emit `treatment`).
 *
 * The lane set is intentionally narrow. Each agent only ever sees the slice of
 * the chapter that maps to its lane, so attention is concentrated and the
 * grounding rule ("every claim carries a verbatim quote from the slice you
 * were given") is easy to enforce. The orchestrator never sends the whole
 * chapter to a single agent.
 */

export const SECTION_LANES = Object.freeze([
  {
    id: 'header',
    title: 'Chapter Header & Identity',
    matchHeadings: [/^summary$/i, /^genereview scope$/i],
    childMatchHeadings: [],
    emits: ['identity', 'synonym', 'mode_of_inheritance', 'prevalence']
  },
  {
    id: 'clinical_description',
    title: 'Clinical Description',
    matchHeadings: [/^clinical description$/i],
    childMatchHeadings: [
      /phenotypic correlations?/i,
      /^phenotype$/i,
      /clinical features/i,
      /natural history/i
    ],
    emits: ['phenotype']
  },
  {
    id: 'penetrance_prevalence',
    title: 'Penetrance, Nomenclature, Prevalence',
    matchHeadings: [/^penetrance$/i, /^prevalence$/i, /^nomenclature$/i],
    childMatchHeadings: [/anticipation/i],
    emits: ['penetrance', 'prevalence', 'nomenclature']
  },
  {
    id: 'genotype_phenotype',
    title: 'Genotype-Phenotype Correlations',
    matchHeadings: [/genotype.?phenotype/i],
    childMatchHeadings: [/variant.spectrum/i],
    emits: ['genotype_phenotype']
  },
  {
    id: 'diagnosis',
    title: 'Diagnosis & Testing Strategy',
    matchHeadings: [/^diagnosis$/i],
    childMatchHeadings: [
      /suggestive findings/i,
      /establishing the diagnosis/i,
      /molecular (genetic )?testing/i,
      /diagnostic criteria/i
    ],
    emits: ['suggestive_finding', 'testing_strategy', 'diagnostic_criterion']
  },
  {
    id: 'differential_related',
    title: 'Differential Diagnosis & Genetically Related Disorders',
    matchHeadings: [
      /^differential diagnosis$/i,
      /genetically related/i,
      /allelic disorders?/i
    ],
    childMatchHeadings: [],
    emits: ['differential_diagnosis', 'related_disorder']
  },
  {
    id: 'management_treatment',
    title: 'Management & Treatment of Manifestations',
    matchHeadings: [/^management$/i, /^treatment( of manifestations)?$/i],
    childMatchHeadings: [
      /^evaluations? following initial diagnosis$/i,
      /^treatment of manifestations$/i,
      /supportive care/i,
      /^prevention of primary manifestations$/i,
      /^prevention of secondary complications$/i
    ],
    emits: ['evaluation_at_diagnosis', 'treatment', 'supportive_care']
  },
  {
    id: 'surveillance',
    title: 'Surveillance & Monitoring',
    matchHeadings: [/^surveillance$/i],
    childMatchHeadings: [/^monitoring$/i, /follow.?up/i],
    emits: ['surveillance']
  },
  {
    id: 'contraindications',
    title: 'Agents & Circumstances to Avoid',
    matchHeadings: [
      /agents.*to avoid/i,
      /circumstances.*to avoid/i,
      /contraindicat/i
    ],
    childMatchHeadings: [],
    emits: ['contraindication']
  },
  {
    id: 'therapies_investigation',
    title: 'Therapies Under Investigation',
    matchHeadings: [/therapies under investigation/i],
    childMatchHeadings: [/investigational/i, /^clinical trials?$/i],
    emits: ['investigational_therapy']
  },
  {
    id: 'molecular_pathogenesis',
    title: 'Molecular Genetics & Pathogenesis',
    matchHeadings: [/^molecular genetics$/i, /molecular pathogenesis/i],
    childMatchHeadings: [
      /gene structure/i,
      /pathogenic variants?/i,
      /normal gene product/i,
      /abnormal gene product/i,
      /mechanism of disease/i
    ],
    emits: ['mechanism', 'variant_class', 'pathway']
  },
  {
    id: 'genetic_counseling',
    title: 'Genetic Counseling',
    matchHeadings: [/^genetic counseling$/i],
    childMatchHeadings: [
      /mode of inheritance/i,
      /risk to family members/i,
      /prenatal testing/i,
      /preimplantation/i,
      /recurrence risk/i
    ],
    emits: ['mode_of_inheritance', 'recurrence_risk', 'reproductive_option']
  },
  {
    /**
     * Overflow lane. Every heading the splitter cannot place into a primary or
     * child lane is captured here so that no chapter byte is silently dropped.
     *
     * The triage agent runs over `unassigned` slices in dry-run mode only: it
     * never produces graph atoms, it only suggests a target lane (or "extend
     * the taxonomy") and writes a review record to
     * <output>/<chapter_id>.review.json. The coverage probe summarizes these
     * across the whole batch so the lane registry can be grown intentionally,
     * not by accident.
     */
    id: 'unassigned',
    title: 'Unassigned / Overflow',
    matchHeadings: [],
    childMatchHeadings: [],
    emits: []
  }
]);

/**
 * Headings that should be explicitly dropped (not even sent to triage).
 * These exist in every chapter but never contain extractable graph content.
 */
export const DROP_HEADINGS = Object.freeze([
  /^references$/i,
  /^resources$/i,
  /^chapter notes$/i,
  /^author history$/i,
  /^revision history$/i,
  /^acknowledg(e)?ments?$/i,
  /^literature cited$/i
]);

export function isDroppableHeading(heading) {
  if (typeof heading !== 'string') return false;
  return DROP_HEADINGS.some((pattern) => pattern.test(heading.trim()));
}

export const ALL_ASSERTION_KINDS = Object.freeze(
  Array.from(new Set(SECTION_LANES.flatMap((lane) => lane.emits))).sort()
);

/**
 * Resolve a heading string to the lane that should own it.
 *
 * Return contract:
 *   - { lane, role: 'primary' | 'child' } when a canonical lane claims the
 *     heading.
 *   - { lane: <unassigned lane>, role: 'overflow' } when the heading is real
 *     content but no canonical lane matches. The splitter must STILL slice
 *     this content and store it. The triage agent + coverage probe surface
 *     these so the taxonomy can be widened intentionally.
 *   - null when the heading is explicitly droppable (References, Resources,
 *     Chapter Notes, etc.). The splitter discards these.
 */
export function resolveLaneForHeading(heading) {
  if (typeof heading !== 'string' || heading.trim() === '') return null;
  const cleaned = heading.trim();
  if (isDroppableHeading(cleaned)) return null;
  for (const lane of SECTION_LANES) {
    if (lane.id === 'unassigned') continue;
    for (const pattern of lane.matchHeadings) {
      if (pattern.test(cleaned)) return { lane, role: 'primary' };
    }
  }
  for (const lane of SECTION_LANES) {
    if (lane.id === 'unassigned') continue;
    for (const pattern of lane.childMatchHeadings) {
      if (pattern.test(cleaned)) return { lane, role: 'child' };
    }
  }
  const overflow = SECTION_LANES.find((lane) => lane.id === 'unassigned');
  return { lane: overflow, role: 'overflow' };
}

export function getLaneById(id) {
  return SECTION_LANES.find((lane) => lane.id === id) || null;
}
