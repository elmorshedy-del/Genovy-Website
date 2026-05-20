# @genovy/genereviews — per-section agent fleet for GeneReviews extraction

Production-grade pipeline that converts NCBI GeneReviews chapters into a
universal, grounded JSON contract that drops directly into Genovy DX's
multi-graph (OMIM + ClinVar + HPO) and the rare-disease ranker / pharma
query service.

## Why this exists

Manual per-chapter source extraction (the `shadow*SymmetricSource*` runs
under `src/scripts/`) has produced real wins:

- `SETD2`: truth rank `140 → 1` after a symmetric source shadow.
- `U2AF2`: `959 → 2` after the manual OMIM extract.
- `PPP2R1A`: clean rescue from a `GeneReviews:NBK580243` + `OMIM:616362`
  symmetric extract.

It does not scale to 200 chapters without an agent fleet. Naively
prompting a single LLM with a whole chapter dilutes attention and lets
critical facts (frequency tier, onset, negation, agents-to-avoid) drop
out. This module fixes that by:

1. **Splitting** every chapter into the canonical NCBI section spine.
2. **Fan-out per section**: one specialist agent per section lane, each
   receiving only that lane's slice of the chapter.
3. **Universal grounded-sentence schema**: one polymorphic atom shape used
   across all lanes; locked controlled vocabularies for frequency, onset,
   severity, presence, evidence strength.
4. **Schema + grounding firewall**: every atom must validate against
   `schema/assertion.schema.json` AND carry a `verbatim_quote` that is an
   exact substring of the section slice it claims to come from. Atoms
   that fail either gate are dropped before the chapter file is written.
5. **Coverage accounting**: every byte of every chapter is routed to a
   canonical lane, an `unassigned` overflow lane, or an explicit
   droppable lane (References, Resources, Chapter Notes). The chapter
   file's `coverage_audit` records the byte-level accounting so you can
   prove on a per-chapter basis that nothing was silently lost.

## Universal schema (the answer to "is there one schema that fits all 200?")

Yes — *one* `Assertion` atom envelope plus *one* `Chapter` container,
discriminated by `atom.kind`. Every kind shares the same provenance,
qualifiers, grounding, and QC fields. The kind-specific payload lives
under `atom.payload` as a small open object. This means:

- A chapter with no Therapies Under Investigation section just has zero
  `kind: investigational_therapy` atoms — same shape, fewer rows.
- Adding a new lane later (e.g. pharmacogenomics) is additive: a new
  prompt + a new entry in `sections.js`. Existing chapter files keep
  validating.

The 24 atom kinds (`phenotype`, `treatment`, `surveillance`,
`mode_of_inheritance`, `mechanism`, …) are listed in
`schema/assertion.schema.json`; each is tied to a lane via the `emits`
field in `src/sections.js`, so the validator rejects cross-lane drift
(e.g. a Surveillance agent cannot emit a `treatment` atom no matter how
poorly the prompt is followed).

See the worked example in the section "Atom example" below.

## Layout

```
genereviews/
├── README.md
├── package.json
├── schema/
│   ├── assertion.schema.json   # universal grounded-sentence atom
│   ├── chapter.schema.json     # per-chapter envelope (validates a chapter file)
│   └── manifest.schema.json    # the 200-chapter extraction roster
├── prompts/
│   ├── system.base.md          # shared hard rules every agent must follow
│   ├── header.md
│   ├── clinical_description.md
│   ├── penetrance_prevalence.md
│   ├── genotype_phenotype.md
│   ├── diagnosis.md
│   ├── differential_related.md
│   ├── management_treatment.md
│   ├── surveillance.md
│   ├── contraindications.md
│   ├── therapies_investigation.md
│   ├── molecular_pathogenesis.md
│   ├── genetic_counseling.md
│   └── unassigned_triage.md    # triage-only; never emits graph atoms
├── src/
│   ├── sections.js             # canonical lane registry + overflow lane
│   ├── fetch/
│   │   ├── ncbiBookshelf.js    # rate-limited fetch + on-disk cache
│   │   └── sectionSplitter.js  # HTML → per-lane slices, dependency-free
│   ├── agents/
│   │   ├── registry.js         # prompt + agent_id per lane
│   │   ├── runAgent.js         # single-section agent runner with span repair
│   │   ├── merger.js           # dedup + atom_id reassignment
│   │   ├── orchestrator.js     # fan-out, validation, coverage audit
│   │   └── validator.js        # AJV + grounding pass + accounting check
│   ├── providers/
│   │   ├── openai.js           # OpenAI-compatible
│   │   ├── anthropic.js        # Claude
│   │   └── mock.js             # deterministic, used by tests
│   ├── mappers/
│   │   └── index.js            # post-extraction label→CURIE pass
│   └── cli/
│       ├── extractChapter.js   # `npm run extract:one`
│       ├── extractBatch.js     # `npm run extract:batch`  (resumable)
│       ├── coverageProbe.js    # `npm run coverage:probe`  (taxonomy audit)
│       └── buildManifest.js    # join priority symbols with NCBI titles index
├── data/
│   ├── priority_symbols.json   # Genovy P0/P1 cohort from the project log
│   └── manifest.seed.json      # explicitly small + verified; full list built by buildManifest
├── test/
│   ├── fixtures/kbg.fixture.html
│   ├── sectionSplitter.test.js
│   ├── validator.test.js
│   └── orchestrator.test.js
└── examples/                   # populated by the smoke run
```

## How "each agent gets a part" works in practice

```
                ┌──────────────────────────────────────────────┐
                │             Chapter HTML (NBK487886)         │
                └──────────────┬───────────────────────────────┘
                               │ splitChapterHtml()
                               ▼
   ┌──────────┬────────────┬───────────────┬──────────────────┬─────────┐
   │ header   │ diagnosis  │ clinical_desc │ management_treat │ ...     │
   │ slice    │ slice      │ slice         │ slice            │         │
   └────┬─────┴─────┬──────┴──────┬────────┴─────────┬────────┴─────────┘
        ▼           ▼             ▼                  ▼
   header.v1   diagnosis.v1  clinical_desc.v1   management_treatment.v1   ...
   (only sees (only sees    (only sees CD       (only sees Mgmt section
   the Summary the Diagnosis section text)      text)
   slice)      section text)
        │           │             │                  │
        └───────────┴──────┬──────┴──────────────────┘
                           ▼
              validator: AJV + grounding QC + lane→kind firewall
                           ▼
                merger: dedup + deterministic atom_ids
                           ▼
                <chapter_id>.chapter.json   (validates schema/chapter.schema.json)
                <chapter_id>.review.json    (triage suggestions for overflow lane)
```

Every agent has its own focused prompt (`prompts/<lane>.md`) and its own
allowed set of `kind` values. Nothing else.

## Atom example

```jsonc
{
  "atom_id": "nbk487886-clinical_description-007",
  "kind": "phenotype",
  "subject": { "kind": "disease", "curie": null, "label": "KBG syndrome" },
  "predicate": "has_phenotype",
  "object":  { "kind": "phenotype", "curie": null, "label": "Intellectual disability", "needs_mapping_hint": true },
  "qualifiers": {
    "presence_status": "present",
    "frequency_tier":  "very_frequent",
    "frequency_text":  "in the majority of affected individuals",
    "onset_class":     "childhood",
    "severity":        "moderate",
    "laterality":      "not_stated",
    "progression":     "not_stated",
    "modifier":        null,
    "sex":             "not_stated",
    "aspect":          "neurodevelopmental",
    "n_referenced":    null
  },
  "grounded_sentence": "KBG syndrome very frequently presents with intellectual disability of childhood onset and moderate severity.",
  "verbatim_quote":    "Intellectual disability is present in the majority of affected individuals",
  "evidence": { "strength": "established", "n_cases_referenced": null, "cited_pmids": [] },
  "provenance": {
    "chapter_id": "NBK487886",
    "chapter_title": "KBG Syndrome",
    "chapter_version": "2023-10-12",
    "section_lane": "clinical_description",
    "section_path": ["Clinical Description"],
    "char_span": { "start": 612, "end": 686 },
    "retrieved_at": "2026-05-20T20:00:00.000Z",
    "agent_id": "clinical_description.v1",
    "model_id": "<configured>",
    "retrieval_url": "https://www.ncbi.nlm.nih.gov/books/NBK487886/"
  },
  "qc": { "grounded": true, "needs_mapping": true, "review_required": false }
}
```

The same envelope holds a `treatment` atom (with a `payload` of
`{ indication, route, line_of_therapy, ... }`), a `surveillance` atom
(`{ interval, interval_months_min/max, indication, ... }`), a
`mode_of_inheritance` atom (`{ pattern, de_novo_fraction }`), etc.

## Running the fleet

```bash
# 1. Install
cd genereviews && npm install

# 2. Run the test suite
npm test

# 3. Extract a single chapter using the deterministic mock provider
node src/cli/extractChapter.js \
  --chapter NBK487886 \
  --html test/fixtures/kbg.fixture.html \
  --provider mock \
  --output-dir ./out

# 4. Real extraction with OpenAI
export GENEREVIEWS_OPENAI_API_KEY=sk-...
node src/cli/extractChapter.js \
  --chapter NBK487886 \
  --provider openai \
  --cache-dir .cache \
  --output-dir ./out

# 5. Build the 200-chapter manifest from the live NCBI titles index
node src/cli/buildManifest.js --out data/manifest.json --target 200

# 6. Run the full batch (resumable, with checkpointing)
node src/cli/extractBatch.js \
  --manifest data/manifest.json \
  --provider openai \
  --cache-dir .cache \
  --output-dir ./out \
  --chapter-concurrency 4 \
  --lane-concurrency 4

# 7. Audit the taxonomy on the full batch before sign-off
node src/cli/coverageProbe.js \
  --manifest data/manifest.json \
  --cache-dir .cache \
  --top 50
```

## How do we know the taxonomy covers all 200?

We don't *assume* it does. We *measure* it:

1. The section splitter never drops a heading. Anything it does not match
   into a canonical lane goes to the `unassigned` overflow lane.
2. The `coverage_audit` block in every chapter file proves at least 95%
   byte-level accounting (canonical lanes + droppable lanes) for that
   chapter. `passes_accounting: false` blocks ingestion to the production
   graph.
3. The `coverageProbe` CLI aggregates `unassigned_headings` across the
   whole batch and prints the ranked-by-frequency list. Until that list
   stops containing high-yield content, the lane registry is treated as
   provisional and is widened from that report — never silently.
4. The `unassigned_triage.md` prompt feeds suggestions for taxonomy
   extensions to `<chapter_id>.review.json`. Triage never produces graph
   atoms — only suggestions for a human curator.

## Integration with Genovy DX (`src/scripts/shadow*`)

The atom contract was designed to be a strict superset of the field set
the existing shadow runs already use. A small adapter (one helper
function) maps each `phenotype` atom to a `disease_phenotype_row` in
`dxRepository`'s shape:

| atom field                                | dxRepository field            |
| ----------------------------------------- | ----------------------------- |
| `subject.curie` (MONDO)                   | `disease_curie`               |
| `subject.label`                           | `disease_label`               |
| `object.curie` (HP)                       | `phenotype_curie`             |
| `object.label`                            | `phenotype_label`             |
| `qualifiers.presence_status`              | `presence_status`             |
| `qualifiers.frequency_tier`               | `frequency_curie` / `frequency_label` |
| `qualifiers.onset_class`/`onset_curie`    | `onset_curie` / `onset_label` |
| `qualifiers.modifier`                     | `modifier_curie` / `modifier_label` |
| `qualifiers.sex` / `qualifiers.aspect`    | `sex` / `aspect`              |
| `provenance.chapter_id`                   | `source_key` = `genereviews`  |
| `provenance.retrieval_url`                | `reference_text` prefix       |
| `evidence.cited_pmids`                    | `reference_text` suffix       |
| `provenance.section_lane`                 | `row_source_mode` (e.g. `genereviews_clinical_description.v1`) |

Until that adapter is wired, the chapter JSON is shadow-only. That
matches the project's working rule: source-backed curation authors truth;
benchmark only generates hypotheses.

## Status of this module

- Schemas, prompts, splitter, validator, merger, orchestrator, mock
  provider, OpenAI/Anthropic providers, and CLIs are all implemented.
- 14/14 tests pass (`npm test`).
- The CLI smoke run on the bundled fixture produces a valid chapter file
  and correctly flags the deliberately-unmatched
  `"Pharmacogenomic Considerations"` heading in `unassigned_headings`.
- Live NCBI fetching, the `buildManifest` CLI, and the `coverageProbe`
  CLI are wired but have not been run against the live index from this
  branch — they require outbound network to `www.ncbi.nlm.nih.gov` and a
  configured LLM provider for the real-extraction batch.
