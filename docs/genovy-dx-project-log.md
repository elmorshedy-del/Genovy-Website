# Genovy DX Project Log

Last updated: 2026-03-26

## Purpose
This file is the running memory for Genovy DX. It records concrete changes, benchmark results, hypotheses, failed ideas, and next-step logic so progress is not lost between sessions.

Canonical detailed diary:
- [genovy-dx-diary.md](/Users/ahmedelmorshedy/Genovy-phenotype-enrichment-20260316-0914/docs/genovy-dx-diary.md)

## Benchmark Snapshots
Official 100-case phenotype-only gene benchmark vs Exomiser.

| Snapshot | Found | Top-1 | Top-3 | Top-5 | Top-10 | Median Rank | MRR |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Prefix-cleanup era baseline | 81% | 32% | 41% | 45% | 55% | 3 | 0.390464 |
| Full enrichment + identity fixes | 81% | 34% | 41% | 46% | 52% | 3 | 0.404633 |
| Direct-edge fix | 80% | 33% | 41% | 45% | 55% | 3 | 0.395267 |
| Propagation-weight heuristic | 82% | 34% | 43% | 46% | 58% | 3 | 0.409669 |
| Exomiser comparator | 100% | 39% | 46% | 48% | 55% | 7.5 | 0.447212 |

## Current Read
- The main problem is no longer missing genes. It is ranking pressure caused by weak, generic, or poorly connected phenotype profiles for the true gene.
- The most effective fixes so far have been evidence-surface fixes, not ML.
- The propagation-weight heuristic is the current best rule-based result because it improved recall and top-10 without introducing broad regressions.
- New hard rule:
  - never overfit the graph
  - never cheat a gene upward just because a benchmark case wants it
  - benchmark only generates hypotheses; source-backed curation authors truth
- The March 20-22 audits sharpened that further:
  - the `18` misses collapse to `12` unique truth genes
  - only `U2AF2` is a true empty shell
  - most remaining misses are undercovered truth branches, not disconnected genes
  - a smaller set is real ranking/support-selection failure

## Major Findings

### 1. Ranking pressure, not pure absence
- Ranking-pressure audit on 41 difficult cases:
  - Pattern A, weak phenotype match: 39.0%
  - Pattern C, swamped by similar candidates: 31.7%
  - Pattern D, other: 17.1%
  - Pattern B, weak evidence support: 12.2%
- Key implication: the truth gene often exists in the graph but loses because its disease profile is thinner or less specific than a competitor.

### 2. Direct phenotype evidence was being bypassed
- We confirmed 281,964 curated HPO disease-phenotype rows still existed in `relationships` / `relationship_evidence`.
- The DX path was routing too heavily through propagation-backed typed assertions and umbrella diseases instead of the direct curated disease profile.
- Fixing that recovered important regressions but also exposed that some previously rescued cases only looked good because broad propagated profiles were helping them.

### 3. Propagation helped and hurt
- Sparse-disease propagation added 196,838 phenotype edges across 3,553 diseases.
- Breakdown:
  - Xref propagation: 54,858 edges across 2,134 diseases
  - Parent propagation: 16,028 edges across 899 diseases
  - Gene-mediated propagation: 125,952 edges across 940 diseases
- Net effect: sharper ranking in some areas, but enough noise in others to create regressions.

### 4. Identity repairs mattered
- Fixed doubled-prefix cleanup for `NCBIGene:NCBIGene:*` records.
- Fixed cross-type canonical contamination.
- `RPGRIP1` canonical identity repair produced a real benchmark win.
- `U2AF2` identity now exists correctly in the graph, but HPO gene-disease / gene-phenotype source coverage is still missing, so ranking remains weak there.

### 5. PPI fallback is not solved yet
- STRING coverage was strong: 5,125 of 5,705 gene concepts had at least one high-confidence edge.
- But naive standalone random walk with restart was weak:
  - Top-1 rescue on 41 hard cases: 0
  - Top-5 rescue: 0
  - Top-10 rescue: 2
- Conclusion: PPI may help as a supporting feature, but not as a simple drop-in standalone signal.

## Important Concrete Fixes
- Source-control path added on 2026-03-17:
  - stable source ID is `source_key`
  - sources can be turned on/off via `sources.is_active`
  - disabled sources are skipped by bootstrap
  - direct sync attempts on disabled sources fail with a clear message
  - admin API and CLI support source enable/disable operations
- Phenotype propagation script added and run.
- Canonical cross-type merge bug fixed.
- Direct disease phenotype rows merged back into DX loading path.
- Support-disease selection now tracks direct vs propagated counts explicitly.
- Current heuristic weighting added for disease support evidence:
  - fully direct disease support weight = 1.0
  - propagated support weight is clamped between 0.25 and 0.85
  - weight depends on:
    - matched phenotype density
    - profile compactness
    - normalized phenotype similarity
    - direct-to-total phenotype edge ratio

## Propagation-Weight Heuristic Result
- Improved cases vs direct-edge baseline: 17
- Worsened cases: 2
- Recovered from miss: 2
- Regressed to miss: 0
- Notable wins:
  - `PMID_34521999_43`: 9 -> 1
  - `PMID_34521999_32`: 24 -> 12
  - `PMID_34521999_50`: 18 -> 10
  - `PMID_33731876_fam163`: miss -> 92
  - `PMID_37761890_22`: miss -> 80
- Minor worsened cases:
  - `PMID_31021519_individualfromTrakadisetal`: 64 -> 65
  - `PMID_31239556_individual2Gregoretal`: 48 -> 49

## Hard Miss Families Still Open
- `SCN2A` difficult cases, especially `PMID_33731876_fam421`
- `STXBP1` difficult cases, especially `PMID_35190816_STX_Syrbe_6`
- `PPP2R1A` difficult cases, especially `PMID_37761890_41`
- Additional sparse-profile genes still seen in earlier audits: `RERE`, `SETD2`, `SMARCC2`, `TRAF7`, `WWOX`, `U2AF2`

## Current Theory
- Same-source data is not the same as same-quality data.
- The truth gene often scores through a weaker disease node than the competitor.
- Broad clinical phrases and broad disease nodes flatten distinctions that matter:
  - progressive vs non-progressive
  - distal vs proximal vs limb-girdle
  - early infantile vs childhood onset
  - autistic features vs global developmental delay
  - psychiatric features vs generic neurodevelopmental phenotype
- The strongest next leverage is richer clinical profile quality, not another generic model layer.

## Source Strategy Hypothesis
- Best narrative source: GeneReviews
- Best structured rare-disease source: Orphadata / Orphanet
- Best computable phenotype backbone: HPO disease annotations
- Best validity guardrail: ClinGen
- Best patient-level edge-case nuance: DECIPHER
- Working hypothesis: build a two-layer phenotype system
  - structured assertions with qualifiers
  - literal source phrases with semantic embeddings and provenance

## Working Rule
- Do not jump to ML ranker training while the phenotype evidence surface is still obviously distorted.
- Fix phenotype profile quality first.
- Then train the learned ranker on cleaner evidence tiers.

## Current Best Next Moves
- Build richer clinical assertions with qualifiers like onset, progression, distribution, severity, and neuropsychiatric context.
- Keep direct curated assertions strongest, but let the eventual ranker learn the final blend across direct, extracted, propagated, and embedding-based matches.
- Use semantic retrieval to map vague patient language to specific clinical assertions.
- Revisit ML ranking only after the new phenotype layer is stable.

## 2026-03-22 Strategic Synthesis
- New planning anchor:
  - `/Users/ahmedelmorshedy/Genovy-phenotype-enrichment-20260316-0914/docs/OpusAudit1.md`
- Main take:
  - scoring-only experimentation has reached its ceiling on current evidence
  - the next leverage is pipeline completeness plus truth-branch enrichment
- Current miss-set split:
  - empty shell:
    - `U2AF2`
  - undercovered linked disease branches:
    - `WWOX`
    - `TRAF7`
    - `SOCS1`
    - `SETD2`
    - `ANKRD11`
    - `RERE`
  - mixed / unstable support surface:
    - `STXBP1`
  - ranking problem with usable evidence:
    - `SCN2A`
    - `SPTAN1`
    - `PPP2R1A`
    - `SMARCC2`
- Whole-graph structural spectrum over `5705` logical genes:
  - hollow shells: `23`
  - sparse one-sided: `426`
  - poorly enriched two-sided: `777`
  - better covered: `4479`
- Critical caution:
  - the `777` number is structural graph thinness, not a direct clinical-failure count
  - do not over-generalize the `U2AF2` pattern
- Current priority order:
  1. identity-repair-aware re-ingestion
  2. source freshness audit
  3. enrich the six undercovered truth branches
  4. inspect competitors for the four ranking cases
  5. test semantic similarity surgically
  6. train a ranker only after the evidence layer is cleaner
- Expanded same-day additions now preserved in `OpusAudit1.md`:
  - covered vs partially covered vs not-covered question inventory
  - semantic-similarity gate test
  - ML feature-shape proposal
  - model-organism channel proposal
  - STXBP1 and SPTAN1 concrete settlement tests
  - explicit caution that the database spectrum may become a confidence/product feature
  - explicit open-info list for what the audit still needs

## 2026-03-17 Deep HPO Usage Pass
- Goal: improve scoring without a new source ingest by using richer HPO fields already stored in `clinical_phenotype_assertions`.
- Code changes:
  - `dxRepository` now carries:
    - `presence_status`
    - `frequency_curie` / `frequency_label`
    - `onset`, `modifier`, `sex`, `aspect`
    - fallback rows now include both `has_phenotype` and `lacks_phenotype`
  - `similarityEngine` now:
    - separates disease present vs absent phenotype assertions
    - weights phenotype matches by HPO frequency tiers
    - applies contradiction penalties for:
      - patient present term vs disease absent term
      - patient excluded term vs disease present term
    - passes excluded HPO terms through disease and gene ranking paths
- Frequency weights used:
  - obligate `1.00`
  - very frequent `0.95`
  - frequent `0.85`
  - occasional `0.65`
  - very rare `0.45`
- Contradiction penalty weights used:
  - patient excluded vs disease present `0.30`
  - patient present vs disease absent `0.20`
- Verification:
  - targeted tests passed with `~/.nvm/versions/node/v22.22.0/bin/node --test`
  - added tests for:
    - obligate vs occasional weighting
    - excluded-phenotype contradiction penalty
- Final result with contradiction penalties enabled:
  - `Found: 82% -> 68%`
  - `Top-1: 34% -> 16%`
  - `Top-5: 46% -> 26%`
  - `Top-10: 58% -> 32%`
  - `MRR: 0.409669 -> 0.211003`
  - `Improved: 4`
  - `Worsened: 43`
  - `Recovered from miss: 0`
  - `Regressed to miss: 14`
- Interpretation:
  - loading richer HPO fields was fine
  - directly subtracting contradiction penalties in the rule-based scorer was not
  - the main damage came from changing score geometry before a trained ranker exists

## 2026-03-17 Deep HPO No-Penalty Variant
- Change:
  - kept richer HPO fields and frequency weighting
  - stopped subtracting contradiction penalties from `normalizedScore`
  - still exposed contradiction metrics in traces/results for later analysis
- Validation:
  - `~/.nvm/versions/node/v22.22.0/bin/node --test test/dxSimilarity.test.js test/phenopackets.test.js`
  - all `12` tests passed
- Official 100-case benchmark result:
  - `Found: 82% -> 82%`
  - `Top-1: 34% -> 34%`
  - `Top-5: 46% -> 46%`
  - `Top-10: 58% -> 57%`
  - `MRR: 0.409669 -> 0.409646`
  - `Improved: 5`
  - `Worsened: 1`
  - `Recovered from miss: 0`
  - `Regressed to miss: 0`
- Interpretation:
  - the collapse came from the contradiction penalties, not from carrying richer HPO fields themselves
  - without penalties, the scorer returns almost exactly to the propagation-weight heuristic baseline
  - frequency weighting alone is nearly neutral on this benchmark

## 2026-03-22 v0 Freeze and Phase 0 Start
- GitHub:
  - merged the freeze bundle into `main`
  - preserved the current code/docs/audit/walkback state as the `v0` file baseline
- Railway:
  - created frozen environment `genovy-v0-freeze-20260322`
  - created working environment `genovy-v1-working-20260322`
  - cloned the frozen DB into the working DB and repointed the working app service to its own Postgres
  - verified working clone counts:
    - `21` public tables
    - `81,870` entities
    - `967,198` relationships
    - `987,252` source records
- Phase 0 source freshness audit started and recorded in:
  - `docs/source-freshness-audit-phase0-20260322.md`
- Phase 0 provenance patch added on working branch:
  - source-version fallback now captured for:
    - `hpo_gene_disease`
    - `hpo_gene_phenotype`
    - `clingen_gene_disease_validity`
    - `clinvar_gene_disease`
  - targeted tests:
    - `node --test test/sourceFetch.test.js test/sourceParsers.test.js test/sourceVersion.test.js`
    - `6` passed, `0` failed
- Initial freshness findings:
  - current:
    - `mondo_ontology`
    - `hpo_ontology`
    - `hpo_disease_phenotype`
    - `orphadata_natural_history`
  - provably stale:
    - `clingen_gene_disease_validity`
    - `clinvar_gene_disease`
    - `clinvar_variant_summary`
  - provenance gap:
    - `hpo_gene_disease`
    - `hpo_gene_phenotype`
    - `clingen_gene_disease_validity`
    - `clinvar_gene_disease`
    do not currently persist a reliable source-version string in the graph
- Interpretation:
  - the first non-negotiable target is no longer vague
  - stale-source re-ingestion is warranted
  - provenance capture also needs fixing so future audits stop depending on inference

## 2026-03-22 Phase 0 Refresh Completion on `v1-working`
- Working DB only:
  - completed refreshes for:
    - `hpo_gene_disease` (`run 37`)
    - `hpo_gene_phenotype` (`run 38`)
    - `clingen_gene_disease_validity` (`run 40`)
    - `clinvar_gene_disease` (`run 41`)
    - `clinvar_variant_summary` (`run 45`)
- Recorded source versions now visible in `source_sync_state`:
  - `hpo_gene_disease`: `Mon, 16 Feb 2026 17:29:41 GMT`
  - `hpo_gene_phenotype`: `Mon, 16 Feb 2026 17:29:44 GMT`
  - `clingen_gene_disease_validity`: `2026-03-22`
  - `clinvar_gene_disease`: `Sun, 22 Mar 2026 14:17:20 GMT`
  - `clinvar_variant_summary`: `Sun, 15 Mar 2026 18:11:04 GMT`
- Selected completed refresh summaries:
  - `hpo_gene_disease`:
    - `5510` entities
    - `15913` relationships
    - `15914` source records
  - `hpo_gene_phenotype`:
    - `5256` entities
    - `329339` relationships
    - `329339` source records
  - `clingen_gene_disease_validity`:
    - `3484` relationships
    - `3463` clinical validity assertions
  - `clinvar_gene_disease`:
    - `5123` entities
    - `12818` relationships
  - `clinvar_variant_summary`:
    - `27831` entities
    - `104497` xrefs
    - `113014` relationships
    - `56494` clinical variant-disease assertions
- Working-clone schema repairs required before the refresh could complete:
  - repaired missing constraints on `relationships`
  - realigned sync-path sequences
  - repaired missing conflict targets on `clinical_variant_disease_assertions`
  - repaired missing keys/indexes on `entity_xrefs`
- Post-refresh narrow verification:
  - `U2AF2` remains an empty identity shell:
    - `0` disease links
    - `0` phenotype links
  - `RPGRIP1` remains a connected healthy comparator:
    - `10` disease links
    - `165` phenotype links
- Interpretation:
  - Phase 0 is complete on the working graph
  - provenance is now recorded cleanly for the previously blank surfaces
  - the `U2AF2` miss is not explained away by freshness alone
  - the next move is Phase 1:
    - full identity-repair sweep
    - `U2AF2` source/attachment diagnosis
    - refreshed-graph benchmark rerun before enrichment

## 2026-03-22 Phase 1 Initial Identity-Repair Sweep
- Evidence surfaces used:
  - `source_records` for `source_key = gene_identity_repair`
  - `sync_runs` for `source_key = gene_identity_repair`
  - live `entities.metadata_json.repairSource`
  - narrow `relationships` link counts
- Current confirmed repair-population result:
  - `2` logical repaired genes identified:
    - `U2AF2`
    - `RPGRIP1`
  - `1` empty shell:
    - `U2AF2`
  - `1` fully connected repaired gene:
    - `RPGRIP1`
- Live repaired-gene counts:
  - `U2AF2`:
    - `0` disease links
    - `0` phenotype links
    - still sourced only by `gene_identity_repair`
  - `RPGRIP1`:
    - `10` disease links
    - `165` phenotype links
    - later attached by real source ingestion
- Important caveat:
  - `sync_run 32` verification also mentioned `RPGRIP1L`
  - but `RPGRIP1L` does not currently appear in durable repair artifacts (`source_records`) or live `repairSource` metadata
  - so it is not counted in the confirmed repair population yet
- Interpretation:
  - the current repair-population problem is smaller than feared
  - there is not yet evidence of a broad class of repaired-but-empty genes
  - Phase 1 should narrow to:
    - `U2AF2` source/attachment diagnosis first
    - only broaden the sweep if another repair pathway or artifact set appears

## 2026-03-22 `U2AF2` Attachment Diagnosis
- Narrow official-source checks on the refreshed working graph:
  - no `source_records` hits for `U2AF2` or its main gene identifiers in:
    - `hpo_gene_disease`
    - `hpo_gene_phenotype`
    - `clingen_gene_disease_validity`
    - `clinvar_gene_disease`
    - `clinvar_variant_summary`
- But syndrome-side disease evidence does exist:
  - `hpo_disease_phenotype` contains `26` source records for `OMIM:620535`
  - `OMIM:620535` exists as xref on disease entity:
    - `MONDO:0957810`
    - `developmental delay, dysmorphic facies, and brain anomalies`
  - that disease entity already has:
    - `26` `has_phenotype` relationships
- Missing seam:
  - there are still no `associated_with_disease` links from `U2AF2` to `MONDO:0957810`
  - `U2AF2` remains at `0` disease links and `0` phenotype links overall
- Interpretation:
  - the graph already contains the syndrome phenotype profile
  - the failure is specifically the absence of a gene→disease attachment for `U2AF2`
  - Phase 1 should now answer one exact question:
    - do current official gene-oriented sources actually expose a usable `U2AF2 -> DEVDFB / OMIM:620535 / MONDO:0957810` mapping?

## 2026-03-23 Post-ClinVar Run `54` Audit And Benchmark
- Full official `clinvar_variant_summary` backfill completed successfully on `sync_run_id = 54`
  - source version: `Sun, 22 Mar 2026 06:46:45 GMT`
  - total accepted rows covered across the landed path: `3,163,504`
- Structural audit rerun is now scripted and repeatable:
  - [auditGraphStructuralSpectrum.js](/Users/ahmedelmorshedy/Genovy-phenotype-enrichment-20260316-0914/src/scripts/auditGraphStructuralSpectrum.js)
  - output:
    - [post-clinvar-run54.summary.json](/Users/ahmedelmorshedy/Genovy-phenotype-enrichment-20260316-0914/output/ops/post-clinvar-run54.summary.json)
- Baseline-aligned structural spectrum now reads:
  - hollow shells: `148`
  - sparse one-sided: `504`
  - poorly enriched two-sided: `1207`
  - better covered: `3846`
- Official 100-case benchmark rerun:
  - [official-benchmark-post-clinvar-run54.json](/Users/ahmedelmorshedy/Genovy/output/official-benchmark-post-clinvar-run54.json)
  - found: `83 / 100`
  - top-10: `57`
  - MRR: `0.410153`
- Versus frozen `v0` propagation-weight baseline:
  - found: `82 -> 83`
  - top-10: `58 -> 57`
  - MRR: `0.409669 -> 0.410153`
- Clean recovered miss versus frozen `v0`:
  - `PMID_36747105_proband` (`U2AF2`) now found at rank `30`
- Still-missed tail remains `17` cases, so the next phase should move to leftover-case fixing rather than more ClinVar transport work
- Detailed read preserved in:
  - [post-clinvar-run54-audit-and-benchmark.md](/Users/ahmedelmorshedy/Genovy-phenotype-enrichment-20260316-0914/docs/post-clinvar-run54-audit-and-benchmark.md)

## 2026-03-24 STXBP1 Direct Enrichment Shadow Test
- Shadow-only benchmark on current working graph:
  - target disease: `MONDO:0012812`
  - current direct disease profile: `27` terms
  - added GeneReviews-informed direct terms: `19`
- Current STXBP1 benchmark slice contains `10` truth-gene cases, so the test ran all `10`, not the older `8`-case subset.
- Final result:
  - found: `6 / 10 -> 6 / 10`
  - top-10: `1 -> 1`
  - median rank: `31 -> 31`
  - MRR: `0.024438 -> 0.024438`
  - improved: `0`
  - worsened: `0`
  - recovered from miss: `0`
- Important sanity check:
  - some patient packets do contain exact matches to the added terms:
    - `PMID_35190816_STX_26865513_Patient_45`: `4`
    - `PMID_35190816_STX_28944233_270001`: `7`
    - `PMID_35190816_STX_EG0598P`: `1`
  - despite that, ranks did not move
- Interpretation:
  - direct DEE4 enrichment alone does not rescue STXBP1 under the current scorer
  - this makes ranked-output auditing more urgent than broad manual enrichment
- Artifacts:
  - [stxbp1-direct-enrichment-shadow-test-20260324.md](/Users/ahmedelmorshedy/Genovy-phenotype-enrichment-20260316-0914/docs/stxbp1-direct-enrichment-shadow-test-20260324.md)
  - [stxbp1-direct-enrichment-test.json](/Users/ahmedelmorshedy/Genovy/output/stxbp1-direct-enrichment-test.json)

## 2026-03-24 Ranked Output Audit For Ranking-Problem Cases
- Added repeatable script:
  - [auditRankingProblemCases.js](/Users/ahmedelmorshedy/Genovy-phenotype-enrichment-20260316-0914/src/scripts/auditRankingProblemCases.js)
- Audited live top-20 ranked competitors for:
  - `PMID_33731876_fam421` (`SCN2A`)
  - `PMID_36331550_Family16Patient21` (`SPTAN1`)
  - `PMID_37761890_41` (`PPP2R1A`)
  - `PMID_37761890_43` (`PPP2R1A`)
  - `PMID_30580808_Lo_twin_2-Fam-52` (`SMARCC2`)
- Aggregate finding across `100` top-competitor slots above truth:
  - broad propagated zero-direct competitors: `1`
  - specific direct-match competitors: `66`
  - no-support competitors: `2`
- Interpretation:
  - propagation penalty is not the main issue in this leftover set
  - `SPTAN1` remains the cleanest pure ranking problem
  - `PPP2R1A` now looks mixed: ranking plus truth-profile weakness
  - `SCN2A` and `SMARCC2` are sparse-packet cases with weak discriminative signal
- Detailed read:
  - [ranked-output-audit-ranking-problem-cases-20260324.md](/Users/ahmedelmorshedy/Genovy-phenotype-enrichment-20260316-0914/docs/ranked-output-audit-ranking-problem-cases-20260324.md)

## 2026-03-25 SPTAN1 Top-K Shadow And PPP2R1A Reassessment
- Added targeted shadow scorer:
  - [shadowSptan1TopKGeneProfile.js](/Users/ahmedelmorshedy/Genovy-phenotype-enrichment-20260316-0914/src/scripts/shadowSptan1TopKGeneProfile.js)
- Added package runner:
  - `npm run dx:shadow:sptan1-topk`
- `SPTAN1` test setup:
  - keep disease-support path unchanged
  - change only the direct gene-profile scorer
  - replace full phenotype-side averaging with top-k averaging
- `SPTAN1` result:
  - baseline rank `322`
  - best tested top-k rank: `182` at top-k `8`
  - other tested settings:
    - top-k `4`: `242`
    - top-k `12`: `260`
    - top-k `16`: `268`
    - top-k `24`: `260`
    - top-k `32`: `279`
    - top-k `48`: `318`
    - top-k `64`: `291`
- Interpretation:
  - broad gene-profile penalty is real
  - but top-k softening alone is far too weak to rescue `SPTAN1`
  - this should stay a leftover problem, not a ready-to-ship scorer patch
- `PPP2R1A` reassessment:
  - case `41` truth overlap `3` while many competitors have `4-8`
  - case `43` truth overlap `5` while many competitors have `6-9`
  - reclassify as mixed:
    - not pure ranking
    - truth-profile weakness is part of the problem
- Detailed writeup:
  - [sptan1-topk-shadow-and-ppp2r1a-reassessment-20260325.md](/Users/ahmedelmorshedy/Genovy-phenotype-enrichment-20260316-0914/docs/sptan1-topk-shadow-and-ppp2r1a-reassessment-20260325.md)

## 2026-03-25 STXBP1 Single-Case Audit
- Added targeted live audit script:
  - [auditStxbp1MissCase.js](/Users/ahmedelmorshedy/Genovy-phenotype-enrichment-20260316-0914/src/scripts/auditStxbp1MissCase.js)
- Target case:
  - `PMID_35190816_STX_28944233_270001`
  - `18` present patient terms
- Live comparison:
  - winner `RAI1` / `Smith-Magenis syndrome`
  - truth `STXBP1` / `genetic developmental and epileptic encephalopathy`
- Score comparison:
  - winner normalized score `0.240032`
  - truth normalized score `0.163948`
  - winner disease support score `0.222258`
  - truth disease support score `0.077722`
- Exact direct support overlap:
  - winner: `11`
  - truth: `0`
- Interpretation:
  - this case does not support the simple “common terms are overweighted” theory
  - the winner owns multiple rare/fairly specific exact matches
  - the current truth support disease is broad and phenotypically weak for this patient
  - strongest next STXBP1 question is support-disease selection / truth-branch quality, not generic enrichment
- Detailed writeup:
  - [stxbp1-single-case-audit-20260325.md](/Users/ahmedelmorshedy/Genovy-phenotype-enrichment-20260316-0914/docs/stxbp1-single-case-audit-20260325.md)

## 2026-03-25 STXBP1 Disease-Branch Audit
- Added targeted branch-selection script:
  - [auditStxbp1DiseaseBranchSelection.js](/Users/ahmedelmorshedy/Genovy-phenotype-enrichment-20260316-0914/src/scripts/auditStxbp1DiseaseBranchSelection.js)
- Target case:
  - `PMID_35190816_STX_28944233_270001`
- Check 1 result:
  - across all STXBP1-linked diseases, none of the four tested discriminating terms appear as direct terms
  - `DEE4` has none of the four terms, direct or propagated
  - only propagated appearances found were:
    - umbrella `MONDO:0100062`: `Broad face`, `Impulsivity`
    - `autism spectrum disorder`: `Pain insensitivity`, `Impulsivity`
- Check 2 result:
  - `DEE4` rank `5247`, normalized score `0.076491`, exact direct overlaps `1`
  - umbrella rank `7`, normalized score `0.227175`, direct overlaps `0`, propagated phenotype count `786`
- Interpretation:
  - this is not “specific branch already has the right features and still loses”
  - the specific STXBP1 branch is still too thin for this patient
  - umbrella support is compensating through a very large propagated phenotype surface
- Detailed writeup:
  - [stxbp1-disease-branch-audit-20260325.md](/Users/ahmedelmorshedy/Genovy-phenotype-enrichment-20260316-0914/docs/stxbp1-disease-branch-audit-20260325.md)

## 2026-03-25 STXBP1 Discriminating-Term Shadow Test
- Added targeted shadow script:
  - [shadowStxbp1DiscriminatingCase.js](/Users/ahmedelmorshedy/Genovy-phenotype-enrichment-20260316-0914/src/scripts/shadowStxbp1DiscriminatingCase.js)
- Target case:
  - `PMID_35190816_STX_28944233_270001`
- Added only four discriminating terms to `DEE4` in shadow:
  - `Broad face`
  - `Pain insensitivity`
  - `Broad palm`
  - `Impulsivity`
- Disease-level result:
  - `DEE4` rank `5253 -> 95`
  - `DEE4` normalized score `0.076491 -> 0.186806`
- Gene-level consequence:
  - baseline STXBP1 gene score `0.163948`
  - shadow-derived DEE4 support score `0.127028`
  - inferred STXBP1 gene score unchanged at `0.163948`
- Interpretation:
  - targeted discriminating enrichment does help the disease branch
  - but support aggregation/weighting still prevents that gain from changing the final STXBP1 gene score
- Detailed writeup:
  - [stxbp1-discriminating-term-shadow-test-20260325.md](/Users/ahmedelmorshedy/Genovy-phenotype-enrichment-20260316-0914/docs/stxbp1-discriminating-term-shadow-test-20260325.md)

## 2026-03-25 STXBP1 Support-Handoff Override Shadow
- Added follow-up shadow script:
  - [shadowStxbp1SupportHandoffOverride.js](/Users/ahmedelmorshedy/Genovy-phenotype-enrichment-20260316-0914/src/scripts/shadowStxbp1SupportHandoffOverride.js)
- Source artifact reused:
  - [shadow-stxbp1-discriminating-case-20260325.json](/Users/ahmedelmorshedy/Genovy/output/shadow-stxbp1-discriminating-case-20260325.json)
- Purpose:
  - test whether the remaining leak is the disease-to-gene handoff weight rather than the enriched `DEE4` branch itself
- Critical numbers:
  - enriched `DEE4` disease score: `0.186806`
  - support evidence weight: `1.0`
  - current support weight: `0.68`
  - current handoff score: `0.127028`
  - baseline direct `STXBP1` gene score: `0.163948`
  - exact minimum support weight to beat the current direct gene score: `0.877638`
- Scenario results:
  - `0.80` and `0.85` still fail
  - `0.90` succeeds:
    - handoff `0.168125`
    - final `STXBP1` gene score changes
  - `1.00` succeeds:
    - handoff `0.186806`
- Interpretation:
  - the March 25 discriminating enrichment was already strong enough
  - the real remaining leak is the current disease-to-gene handoff weight
  - a narrow floor override at `0.9` is sufficient to let the improved specific branch beat the existing direct `STXBP1` gene score
- Detailed writeup:
  - [stxbp1-support-handoff-override-shadow-20260325.md](/Users/ahmedelmorshedy/Genovy-phenotype-enrichment-20260316-0914/docs/stxbp1-support-handoff-override-shadow-20260325.md)

## 2026-03-25 STXBP1 Case-Slice Handoff Floor Shadow
- Added STXBP1 family rerun script:
  - [shadowStxbp1CaseSliceHandoffFloor.js](/Users/ahmedelmorshedy/Genovy-phenotype-enrichment-20260316-0914/src/scripts/shadowStxbp1CaseSliceHandoffFloor.js)
- Shadow policy:
  - same `4` discriminating `DEE4` terms
  - same narrow `0.9` handoff floor
  - rerun only the `10` STXBP1 benchmark cases
- Benchmark-comparable result (`limit=100`):
  - baseline unchanged:
    - `6 / 10` found
    - `top-10 = 1`
    - `MRR = 0.024438`
  - shadow unchanged:
    - `6 / 10` found
    - `top-10 = 1`
    - `MRR = 0.024438`
  - delta:
    - `0` improved
    - `0` worsened
- Full-rank diagnostic result (`limit=500`):
  - `2` cases improved slightly:
    - `PMID_35190816_STX_27159321_LD_0358`: `153 -> 152`
    - `PMID_35190816_STX_28944233_270001`: `267 -> 208`
  - `MRR 0.026578 -> 0.026688`
- Interpretation:
  - the single-case handoff leak is real
  - but `4-term + 0.9 floor` is still not enough to produce a visible top-100 STXBP1 benchmark gain
  - so the next STXBP1 lever is likely stronger branch enrichment or a stronger aggregation change than the narrow floor alone
- Detailed writeup:
  - [stxbp1-case-slice-handoff-floor-shadow-20260325.md](/Users/ahmedelmorshedy/Genovy-phenotype-enrichment-20260316-0914/docs/stxbp1-case-slice-handoff-floor-shadow-20260325.md)

## 2026-03-25 Generic Specific-Direct Handoff Floor Shadow
- Added full-benchmark shadow script:
  - [shadowGenericSpecificDirectHandoffFloor.js](/Users/ahmedelmorshedy/Genovy-phenotype-enrichment-20260316-0914/src/scripts/shadowGenericSpecificDirectHandoffFloor.js)
- Shadow policy:
  - no enrichment
  - no graph edits
  - no source refresh
  - raise disease-to-gene handoff floor to `0.9` when a support disease already has:
    - direct phenotype edges
    - and at least one exact direct patient overlap
- Full 100-case result:
  - baseline:
    - `Found = 82%`
    - `Top-1 = 34%`
    - `Top-3 = 43%`
    - `Top-5 = 46%`
    - `Top-10 = 57%`
    - `Median rank = 3`
    - `MRR = 0.409646`
  - shadow:
    - `Found = 83%`
    - `Top-1 = 36%`
    - `Top-3 = 47%`
    - `Top-5 = 51%`
    - `Top-10 = 60%`
    - `Median rank = 2`
    - `MRR = 0.437917`
  - delta:
    - `9` improved
    - `2` worsened
    - `1` recovered from miss
    - `0` regressed to miss
- Important wins:
  - `STXBP1` `PMID_35190816_STX_27159321_LD_0358`: `miss -> 96`
  - `WWOX` `PMID_24369382_Family1II4`: `33 -> 2`
  - `SCN2A` `PMID_33731876_fam163`: `92 -> 52`
  - `FBN1` `PMID_21683322_25`: `10 -> 1`
- Mild regressions:
  - `SATB2` `PMID_31021519_individualfromTrakadisetal`: `65 -> 67`
  - `PPP2R1A` `PMID_37761890_22`: `79 -> 80`
- Interpretation:
  - the handoff leak is a real global scorer issue, not just an STXBP1-specific oddity
  - this generic rule is more promising than the narrow STXBP1 `4-term + 0.9 floor` slice
  - it is the strongest March 25 scorer-side shadow so far that improves the benchmark without new data
  - still not a ship signal yet:
    - it remains a shadow benchmark
    - it needs a `1.0` ablation
    - the `2` regressions need inspection
- Detailed writeup:
  - [generic-specific-direct-handoff-floor-shadow-20260325.md](/Users/ahmedelmorshedy/Genovy-phenotype-enrichment-20260316-0914/docs/generic-specific-direct-handoff-floor-shadow-20260325.md)

## 2026-03-25 Generic Specific-Direct Handoff Floor Shadow (`1.0`)
- Reused the same full-benchmark shadow script:
  - [shadowGenericSpecificDirectHandoffFloor.js](/Users/ahmedelmorshedy/Genovy-phenotype-enrichment-20260316-0914/src/scripts/shadowGenericSpecificDirectHandoffFloor.js)
- Shadow policy:
  - same generic condition as the `0.9` run
  - stronger handoff floor:
    - `1.0` instead of `0.9`
- Full 100-case result:
  - baseline:
    - `Found = 82%`
    - `Top-1 = 34%`
    - `Top-3 = 43%`
    - `Top-5 = 46%`
    - `Top-10 = 57%`
    - `Median rank = 3`
    - `MRR = 0.409646`
  - shadow:
    - `Found = 84%`
    - `Top-1 = 42%`
    - `Top-3 = 52%`
    - `Top-5 = 53%`
    - `Top-10 = 60%`
    - `Median rank = 1.5`
    - `MRR = 0.485974`
  - delta:
    - `21` improved
    - `14` worsened
    - `2` recovered from miss
    - `0` regressed to miss
- Important wins:
  - `STXBP1` `PMID_35190816_STX_27159321_LD_0358`: `miss -> 25`
  - `SCN2A` `PMID_33731876_fam421`: `miss -> 43`
  - `SCN2A` `PMID_33731876_fam163`: `92 -> 20`
  - `SATB2` `PMID_31021519_individualfromTrakadisetal`: `65 -> 24`
  - `WWOX` `PMID_24369382_Family1II4`: `33 -> 1`
- Important regressions:
  - `PPP2R1A` `PMID_37761890_22`: `79 -> 90`
  - `PMID_32154675_Family4Patient11`: `33 -> 39`
  - `PMID_29122497_29122497_P1`: `75 -> 79`
  - `STXBP1` `PMID_35190816_STX_25818041_Patient_20`: `66 -> 70`
- Interpretation:
  - `1.0` is stronger than `0.9` on the benchmark headline metrics
  - but it is also clearly less restrained
  - so the next work is not more escalation
  - it is regression inspection and guardrail design
- Detailed writeup:
  - [generic-specific-direct-handoff-floor-shadow-20260325-w1.0.md](/Users/ahmedelmorshedy/Genovy-phenotype-enrichment-20260316-0914/docs/generic-specific-direct-handoff-floor-shadow-20260325-w1.0.md)

## 2026-03-25 Official Handoff Floor `1.0` Benchmark
- Patched the real scorer with a named specific-direct handoff override:
  - [dx.js](/Users/ahmedelmorshedy/Genovy-phenotype-enrichment-20260316-0914/src/constants/dx.js)
  - [similarityEngine.js](/Users/ahmedelmorshedy/Genovy-phenotype-enrichment-20260316-0914/src/services/dx/similarityEngine.js)
- Added focused unit coverage:
  - [dxSimilarity.test.js](/Users/ahmedelmorshedy/Genovy-phenotype-enrichment-20260316-0914/test/dxSimilarity.test.js)
- Test status:
  - `node --test test/dxSimilarity.test.js` passed
- Official benchmark rerun artifacts:
  - [handoff-floor-1.0.json](/Users/ahmedelmorshedy/Genovy/output/handoff-floor-1.0.json)
  - [handoff-floor-1.0.md](/Users/ahmedelmorshedy/Genovy/output/handoff-floor-1.0.md)
- Baseline vs patched scorer:
  - baseline:
    - `Found = 83%`
    - `Top-1 = 34%`
    - `Top-3 = 43%`
    - `Top-5 = 46%`
    - `Top-10 = 57%`
    - `MRR = 0.410153`
  - patched scorer:
    - `Found = 84%`
    - `Top-1 = 42%`
    - `Top-3 = 52%`
    - `Top-5 = 53%`
    - `Top-10 = 60%`
    - `Median rank = 1.5`
    - `MRR = 0.485974`
  - delta:
    - `21` improved
    - `15` worsened
    - `2` recovered from miss
    - `1` regressed to miss
- Exomiser comparison:
  - Genovy now leads on:
    - `Top-1`
    - `Top-3`
    - `Top-5`
    - `Top-10`
    - `MRR`
  - Exomiser still leads on:
    - total recall / found rate
- Important nuance:
  - the real scorer run is slightly less clean than the earlier `1.0` shadow
  - `U2AF2` `PMID_36747105_proband` regressed from `30 -> miss`
- Interpretation:
  - this is the strongest real rule-based scorer result so far
  - the handoff-floor family is now proven in production-like evaluation, not just in shadow
  - but `U2AF2` shows the rule still needs follow-up triage before it can be treated as final
- Detailed writeup:
  - [official-handoff-floor-1.0-benchmark-20260325.md](/Users/ahmedelmorshedy/Genovy-phenotype-enrichment-20260316-0914/docs/official-handoff-floor-1.0-benchmark-20260325.md)

## 2026-03-26 Anti-Overfitting Rule + U2AF2 Safe Start
- Added explicit curation hard rules:
  - [source-backed-curation-hard-rules-20260326.md](/Users/ahmedelmorshedy/Genovy-phenotype-enrichment-20260316-0914/docs/source-backed-curation-hard-rules-20260326.md)
- Also embedded the same rule into:
  - [genovy-non-negotiable-fixes.md](/Users/ahmedelmorshedy/Genovy-phenotype-enrichment-20260316-0914/docs/genovy-non-negotiable-fixes.md)
- Rule in plain language:
  - benchmark can point to a missing syndrome feature
  - benchmark cannot define truth
  - no direct graph mutation from benchmark pressure
  - every added term must be source-backed and shadow-tested first
- Started the safe U2AF2 workflow with a prep note:
  - [u2af2-source-backed-shadow-prep-20260326.md](/Users/ahmedelmorshedy/Genovy-phenotype-enrichment-20260316-0914/docs/u2af2-source-backed-shadow-prep-20260326.md)
- Important new U2AF2 split:
  - `PMID_36747105_proband`
    - current disease profile already covers all `7 / 7` positive terms
    - this is mainly seam/support fragility, not missing positive terms
  - `PMID_37962958_43`
    - current disease profile covers only `3 / 25` positive terms
    - this is a real undercoverage case and a valid target for source-backed shadow enrichment
- Interpretation:
  - `U2AF2` is not one homogeneous failure mode
  - the earlier hope that ClinVar should have cleanly yielded `+2` was too simplistic
  - one case needed a stronger seam
  - the other needs a richer syndrome surface

## 2026-03-26 U2AF2 Public-Source Candidate List Started
- Added:
  - [u2af2-public-source-candidate-terms-20260326.md](/Users/ahmedelmorshedy/Genovy-phenotype-enrichment-20260316-0914/docs/u2af2-public-source-candidate-terms-20260326.md)
- Evidence used:
  - GenCC
  - public PMC cohort/review papers
- No graph mutation performed.
- First safe shadow-candidate set for the harder `U2AF2` case:
  - `Intellectual disability`
  - `Delayed speech and language development`
  - `Delayed fine motor development`
  - `Delayed ability to walk`
  - `Bilateral tonic-clonic seizure`
  - `Anxiety`
  - `Obsessive-compulsive trait`
  - `Clinodactyly`
  - `Short palpebral fissure`
  - `Hypertelorism`
  - `Bilateral ptosis`
  - `Unilateral ptosis`
  - `Short neck`
  - `Hearing impairment`
- Important discipline point:
  - these are only safe **shadow** candidates
  - several tempting terms remain intentionally excluded until stronger source proof exists

## 2026-03-26 U2AF2 Public-Source Shadow Result
- Added:
  - [shadowU2af2PublicSourceCandidates.js](/Users/ahmedelmorshedy/Genovy-phenotype-enrichment-20260316-0914/src/scripts/shadowU2af2PublicSourceCandidates.js)
  - [u2af2-public-source-shadow-test-20260326.md](/Users/ahmedelmorshedy/Genovy-phenotype-enrichment-20260316-0914/docs/u2af2-public-source-shadow-test-20260326.md)
- Result on the `2` U2AF2 cases:
  - `miss -> miss`
  - `miss -> miss`
  - no truth-gene recovery at all
- Interpretation:
  - public-source-backed disease enrichment alone is not enough for `U2AF2`
  - this is now a stronger proof that `U2AF2` is seam/support-path first, not enrichment first
- Practical consequence:
  - park more U2AF2 term-chasing
  - move next to support-seam repair for `U2AF2`

## 2026-03-26 U2AF2 Manual OMIM Shadow Result
- Added:
  - [u2af2-manual-omim-extract-20260326.md](/Users/ahmedelmorshedy/Genovy-phenotype-enrichment-20260316-0914/docs/u2af2-manual-omim-extract-20260326.md)
  - [u2af2-omim-shadow-test-20260326.md](/Users/ahmedelmorshedy/Genovy-phenotype-enrichment-20260316-0914/docs/u2af2-omim-shadow-test-20260326.md)
- OMIM-backed shadow set:
  - requested `10` terms
  - corrected rerun: all `10` were actually added in shadow
- Result:
  - still `miss -> miss`
  - still `miss -> miss`
  - truth gene absent from the reported ranking in both U2AF2 cases
- Interpretation:
  - even manual OMIM syndrome enrichment does not move U2AF2 while the seam remains weak
  - this is now strong evidence that U2AF2 should move to the support-seam repair track, not the enrichment track

## 2026-03-26 U2AF2 OMIM Shadow Script Correction
- Fixed:
  - [shadowU2af2PublicSourceCandidates.js](/Users/ahmedelmorshedy/Genovy-phenotype-enrichment-20260316-0914/src/scripts/shadowU2af2PublicSourceCandidates.js)
- Bug:
  - the script accepted `--target-terms` for candidate loading but still iterated an older hardcoded candidate list when constructing shadow rows
- Corrected rerun:
  - all `10` requested OMIM-backed terms were added successfully
  - result remained unchanged:
    - `PMID_36747105_proband`: `miss -> miss`
    - `PMID_37962958_43`: `miss -> miss`
- Practical consequence:
  - the negative U2AF2 OMIM result is now stronger, not weaker
  - do not spend more time on U2AF2 term enrichment before support-seam repair

## 2026-03-26 ANKRD11 Symmetric Source Shadow
- Added:
  - [shadowAnkrd11SymmetricSourceTerms.js](/Users/ahmedelmorshedy/Genovy-phenotype-enrichment-20260316-0914/src/scripts/shadowAnkrd11SymmetricSourceTerms.js)
  - [ankrd11-symmetric-source-shadow-20260326.md](/Users/ahmedelmorshedy/Genovy-phenotype-enrichment-20260316-0914/docs/ankrd11-symmetric-source-shadow-20260326.md)
- Strict literal-source scenario:
  - added `3` terms
  - `PMID_36446582_Goldenberg2016_P13`: `395 -> 368`
  - `PMID_36446582_Miyatake2017_P1`: `176 -> 128`
  - winner stayed wrong in both cases
- Symmetric parent-promotion scenario:
  - added `5` terms
  - `PMID_36446582_Goldenberg2016_P13`: `395 -> 312`
  - `PMID_36446582_Miyatake2017_P1`: `176 -> 112`
  - winner still stayed wrong in both cases
- Interpretation:
  - the user's symmetric source-backed addition idea improves both ANKRD11 misses
  - but current scorer geometry still does not let the broad true KBG branch win
  - ANKRD11 is now stronger evidence that source repair alone is not sufficient for every remaining miss

## 2026-03-26 ANKRD11 Manual OMIM Truth/Outranker Pass
- Added:
  - [ankrd11-manual-omim-extract-20260326.md](/Users/ahmedelmorshedy/Genovy-phenotype-enrichment-20260316-0914/docs/ankrd11-manual-omim-extract-20260326.md)
- OMIM entries inspected manually in browser:
  - `148050` `KBG syndrome`
  - `615072` `Brachydactyly, type A1, C`
  - `616461` `Epilepsy, familial temporal lobe, 8`
- Important correction:
  - the actual hand-focused outranker is the `GDF5` subtype `BDA1C`, not only the classical `IHH` parent `BDA1` entry
- Main read:
  - OMIM strongly confirms `KBG syndrome` as a broad hand-anomaly + short stature + developmental delay + seizure syndrome
  - OMIM strongly confirms `ETL8` as a very narrow epilepsy branch
  - OMIM confirms `BDA1C` as a narrow hand-focused brachydactyly branch with short stature
- Interpretation:
  - OMIM adds confidence and disease-shape clarity more than a large hidden term haul
  - this reinforces the current read that `ANKRD11` is a hybrid miss: real source-backed truth support exists, but current scorer geometry still favors narrower sharper branches

## 2026-03-26 ANKRD11 Symmetric OMIM Shadow
- Added:
  - [shadowAnkrd11SymmetricOmimTerms.js](/Users/ahmedelmorshedy/Genovy-phenotype-enrichment-20260316-0914/src/scripts/shadowAnkrd11SymmetricOmimTerms.js)
  - [ankrd11-symmetric-omim-shadow-20260326.md](/Users/ahmedelmorshedy/Genovy-phenotype-enrichment-20260316-0914/docs/ankrd11-symmetric-omim-shadow-20260326.md)
- Strict literal OMIM structural scenario:
  - `PMID_36446582_Goldenberg2016_P13`: `696 -> 696`
  - `PMID_36446582_Miyatake2017_P1`: `175 -> 175`
  - winner stayed wrong in both cases
- OMIM cumulative with prior source shadow:
  - `PMID_36446582_Goldenberg2016_P13`: `696 -> 696`
  - `PMID_36446582_Miyatake2017_P1`: `175 -> 88`
  - winner still stayed wrong in both cases
- Interpretation:
  - literal new OMIM structural terms do essentially nothing
  - cumulative OMIM-backed truth/outranker additions materially improve the second case
  - but `ANKRD11` still does not flip, reinforcing that this is a hybrid source-plus-scoring miss rather than a simple hidden-term miss

## 2026-03-26 RERE Manual OMIM Pass And Symmetric Shadow
- Added:
  - [rere-manual-omim-extract-20260326.md](/Users/ahmedelmorshedy/Genovy-phenotype-enrichment-20260316-0914/docs/rere-manual-omim-extract-20260326.md)
  - [shadowRereSymmetricOmimTerms.js](/Users/ahmedelmorshedy/Genovy-phenotype-enrichment-20260316-0914/src/scripts/shadowRereSymmetricOmimTerms.js)
  - [rere-symmetric-omim-shadow-20260326.md](/Users/ahmedelmorshedy/Genovy-phenotype-enrichment-20260316-0914/docs/rere-symmetric-omim-shadow-20260326.md)
- OMIM truth/outranker read:
  - `RERE` `OMIM 616975` supports broad dysmorphology and neurodevelopmental features
  - `MED13` `OMIM 618009` explicitly supports the outranking facial terms `Synophrys` and `Wide mouth`
  - strict OMIM does **not** expose those same exact discriminators on the `RERE` truth branch
- Symmetric shadow result:
  - truth rank stayed `237 -> 237`
  - top1 stayed `MED13 -> MED13`
  - only `3` genuinely new OMIM terms were added, all on the `MED13` branch
  - all candidate `RERE` OMIM terms were already present in the live direct profile and therefore skipped
- Interpretation:
  - this is a strong negative result for an OMIM-only `RERE` rescue
  - the asymmetry is real, not a reading artifact
  - if `RERE` improves via source-backed enrichment, the next honest source layer is likely `GeneReviews` or the core case series rather than OMIM alone

## 2026-03-26 RERE Symmetric Case-Series Shadow
- Added:
  - [shadowRereSymmetricCaseSeriesTerms.js](/Users/ahmedelmorshedy/Genovy-phenotype-enrichment-20260316-0914/src/scripts/shadowRereSymmetricCaseSeriesTerms.js)
  - [shadow-rere-symmetric-case-series-terms-20260326.json](/Users/ahmedelmorshedy/Genovy-phenotype-enrichment-20260316-0914/output/shadow-rere-symmetric-case-series-terms-20260326.json)
  - [shadow-rere-symmetric-case-series-terms-20260326.md](/Users/ahmedelmorshedy/Genovy-phenotype-enrichment-20260316-0914/output/shadow-rere-symmetric-case-series-terms-20260326.md)
  - [rere-symmetric-case-series-shadow-20260326.md](/Users/ahmedelmorshedy/Genovy-phenotype-enrichment-20260316-0914/docs/rere-symmetric-case-series-shadow-20260326.md)
- Result:
  - baseline `RERE` rank: `238`
  - symmetric case-series presence shadow: `82`
  - symmetric case-series + frequency shadow: `230`
  - `MED13` stayed `1` in both scenarios
- Interpretation:
  - broader source-backed symmetric enrichment proved the truth branch can move strongly once it gets the exact discriminators `Synophrys` and `Wide mouth`
  - but the current scorer still does not choose the truth
  - frequency handling is now a confirmed part of the remaining `RERE` failure mode, not just a theory

## 2026-03-26 RERE Behavior Diagnostic Shadow
- Added:
  - [shadowRereBehaviorDiagnostic.js](/Users/ahmedelmorshedy/Genovy-phenotype-enrichment-20260316-0914/src/scripts/shadowRereBehaviorDiagnostic.js)
  - [rere-behavior-diagnostic-shadow-20260326.md](/Users/ahmedelmorshedy/Genovy-phenotype-enrichment-20260316-0914/docs/rere-behavior-diagnostic-shadow-20260326.md)
- Result:
  - baseline `RERE`: `237`
  - remove `MED13 -> ADHD` only: `237`
  - add exact `RERE -> Compulsive behaviors` only: `209`
  - do both together: `209`
  - `MED13` stayed `1` in every scenario
- Interpretation:
  - the behavior semantic mismatch is real but not decisive
  - it is not the main reason `MED13` wins

## 2026-03-26 TRAF7 Symmetric Source Shadow
- Added:
  - [shadowTraf7SymmetricSourceTerms.js](/Users/ahmedelmorshedy/Genovy-phenotype-enrichment-20260316-0914/src/scripts/shadowTraf7SymmetricSourceTerms.js)
  - [traf7-symmetric-source-shadow-20260326.md](/Users/ahmedelmorshedy/Genovy-phenotype-enrichment-20260316-0914/docs/traf7-symmetric-source-shadow-20260326.md)
  - [shadow-traf7-symmetric-source-terms-20260326.json](/Users/ahmedelmorshedy/Genovy-phenotype-enrichment-20260316-0914/output/shadow-traf7-symmetric-source-terms-20260326.json)
  - [shadow-traf7-symmetric-source-terms-20260326.md](/Users/ahmedelmorshedy/Genovy-phenotype-enrichment-20260316-0914/output/shadow-traf7-symmetric-source-terms-20260326.md)
- OMIM literal scenario:
  - added terms: `0`
  - truth rank `143 -> 143`
  - winner stayed `DOT1L`
- OMIM plus primary-paper scenario:
  - added terms: `0`
  - truth rank `143 -> 143`
  - winner stayed `DOT1L`
- Interpretation:
  - these obvious source-backed syndrome terms were already present on both branches
  - there was no disease-specific `GeneReviews` chapter to add for either branch
  - `TRAF7` is not losing because of a missed OMIM / primary-paper term haul
  - remaining leak is more likely finer exact granularity plus scorer geometry

## 2026-03-26 SETD2 Symmetric Source Shadow
- Added:
  - [shadowSetd2SymmetricSourceTerms.js](/Users/ahmedelmorshedy/Genovy-phenotype-enrichment-20260316-0914/src/scripts/shadowSetd2SymmetricSourceTerms.js)
  - [setd2-symmetric-source-shadow-20260326.md](/Users/ahmedelmorshedy/Genovy-phenotype-enrichment-20260316-0914/docs/setd2-symmetric-source-shadow-20260326.md)
  - [shadow-setd2-symmetric-source-terms-20260326.json](/Users/ahmedelmorshedy/Genovy-phenotype-enrichment-20260316-0914/output/shadow-setd2-symmetric-source-terms-20260326.json)
  - [shadow-setd2-symmetric-source-terms-20260326.md](/Users/ahmedelmorshedy/Genovy-phenotype-enrichment-20260316-0914/output/shadow-setd2-symmetric-source-terms-20260326.md)
- Result:
  - added terms: `2`
  - skipped existing terms: `8`
  - new truth-side terms:
    - `Motor delay`
    - `Accelerated skeletal maturation`
  - `SETD2` rank: `140 -> 1`
  - top1 flipped: `TCF20 -> SETD2`
- Interpretation:
  - this is a clean source-backed rescue
  - `SETD2` was mainly missing the two sharp exact terms that mattered most
  - once those exact truth-side terms were restored, the current scorer chose the truth correctly

## 2026-03-26 SOCS1 Symmetric Source Shadow
- Added:
  - [shadowSocs1SymmetricSourceTerms.js](/Users/ahmedelmorshedy/Genovy-phenotype-enrichment-20260316-0914/src/scripts/shadowSocs1SymmetricSourceTerms.js)
  - [socs1-symmetric-source-shadow-20260326.md](/Users/ahmedelmorshedy/Genovy-phenotype-enrichment-20260316-0914/docs/socs1-symmetric-source-shadow-20260326.md)
  - [shadow-socs1-symmetric-source-terms-20260326.json](/Users/ahmedelmorshedy/Genovy-phenotype-enrichment-20260316-0914/output/shadow-socs1-symmetric-source-terms-20260326.json)
  - [shadow-socs1-symmetric-source-terms-20260326.md](/Users/ahmedelmorshedy/Genovy-phenotype-enrichment-20260316-0914/output/shadow-socs1-symmetric-source-terms-20260326.md)
- Result:
  - added terms: `5`
  - new truth-side exact terms:
    - `Autoimmunity`
    - `Otitis media`
    - `Chronic colitis`
    - `Eczematoid dermatitis`
  - new outranker-side exact term:
    - `Autoimmunity`
  - `SOCS1` rank: `400 -> 48`
  - top1 stayed `CTLA4`
- Interpretation:
  - this is a real source-backed lift, not a null result
  - `SOCS1` was materially undercovered on the disease surface
  - but `CTLA4` still keeps the sharpest exact packet terms, so the case remains mixed rather than fully rescued

## 2026-03-27 STXBP1 Remaining Pair Status
- Added:
  - [stxbp1-remaining-miss-pair-status-20260327.md](/Users/ahmedelmorshedy/Genovy-phenotype-enrichment-20260316-0914/docs/stxbp1-remaining-miss-pair-status-20260327.md)
- Result:
  - fresh `28944233` live rerank succeeded and confirmed the older March 25 story still holds:
    - top outranker `RAI1`
    - support disease `Smith-Magenis syndrome`
    - winner still owns many rare/specific exact overlaps
  - `26865513` still has the preserved undercoverage profile:
    - only `2` direct exact overlaps on the best STXBP1 support disease
    - many truth terms absent from the specific direct branch
    - `Truncal ataxia`, `Head tremor`, `Emotional lability` absent from all linked STXBP1 disease profiles at any level
  - heavy full-index single-case rerank for `26865513` failed with Postgres temp-space exhaustion
  - live `/api/dx/rank-genes` returned Railway `502` on both remaining STXBP1 packets
- Interpretation:
  - do not force more heavy live reranks right now
  - keep `28944233` classified as the stronger mimic-heavy STXBP1 miss
  - treat `26865513` as the likely undercoverage STXBP1 miss until a lighter audit path is built

## 2026-03-27 SPTAN1 Ranking Reopen
- Added:
  - [sptan1-ranking-reopen-20260327.md](/Users/ahmedelmorshedy/Genovy-phenotype-enrichment-20260316-0914/docs/sptan1-ranking-reopen-20260327.md)
- Result:
  - packet has only `2` present terms and `19` excluded terms
  - truth `SPTAN1` row still has exact direct overlap `2` yet sits at rank `322`
  - top outranker `ZBTB11` also has exact direct overlap `2` and sits at rank `1`
  - there are `20` competitors above truth, and `17` are specific direct-match leaf diseases
- Interpretation:
  - this is still the cleanest genuine ranking/specificity leftover
  - not a propagated-umbrella bug
  - not a clean source-gap case
  - and the earlier top-k scorer softening test remains too weak to rescue it

## 2026-03-27 PPP2R1A Reopen
- Added:
  - [ppp2r1a-reopen-20260327.md](/Users/ahmedelmorshedy/Genovy-phenotype-enrichment-20260316-0914/docs/ppp2r1a-reopen-20260327.md)
- Result:
  - case `41`:
    - truth rank `256`
    - truth exact direct overlap `3`
    - top outranker `HNRNPC` exact direct overlap `5`
  - case `43`:
    - truth rank `109`
    - truth exact direct overlap `5`
    - top outranker `MACF1` exact direct overlap `6`
- Interpretation:
  - `PPP2R1A` still should not sit in the same bucket as `SPTAN1`
  - both cases are mixed
  - truth-side disease profile weakness is real in both
  - case `43` looks more salvageable than case `41`

## 2026-03-27 SMARCC2 Reopen
- Added:
  - [smarcc2-reopen-20260327.md](/Users/ahmedelmorshedy/Genovy-phenotype-enrichment-20260316-0914/docs/smarcc2-reopen-20260327.md)
- Result:
  - packet has only `1` present term and `6` excluded craniofacial terms
  - truth `SMARCC2` remains a benchmark miss while Exomiser is also poor at `927`
  - saved truth disease routing is weak:
    - `Coffin-Siris syndrome 8` direct branch has `0` exact direct overlap
    - generic `Coffin-Siris syndrome` only helps through propagation
  - narrow live lookup shows:
    - both `SMARCC2` and `NLGN1` genes directly match `Autistic behavior`
    - only `SMARCC2` picks up excluded `Microcephaly`
- Interpretation:
  - this is a sparse ranking plus negative-evidence problem
  - not a promising manual-enrichment target
  - better left for negative-evidence/scorer work or later ML

## 2026-03-27 PPP2R1A Narrow Live Surface Check
- Updated:
  - [ppp2r1a-reopen-20260327.md](/Users/ahmedelmorshedy/Genovy-phenotype-enrichment-20260316-0914/docs/ppp2r1a-reopen-20260327.md)
- Result:
  - narrow live lookup on exact packet terms only
  - current disease branches for truth and top outrankers showed `0` exact direct packet hits
  - exact packet coverage is currently carried by the gene direct layer instead:
    - case `41`: `PPP2R1A 3` vs `HNRNPC 5`
    - case `43`: `PPP2R1A 5` vs `MACF1 6`
- Interpretation:
  - `PPP2R1A` remains mixed
  - case `41` is still the weaker truth branch
  - case `43` is still the better salvage target

## 2026-03-27 PPP2R1A Truth Shadow
- Updated:
  - [ppp2r1a-reopen-20260327.md](/Users/ahmedelmorshedy/Genovy-phenotype-enrichment-20260316-0914/docs/ppp2r1a-reopen-20260327.md)
- Added scripts:
  - [shadowPpp2r1aTruthSourceTerms.js](/Users/ahmedelmorshedy/Genovy-phenotype-enrichment-20260316-0914/src/scripts/shadowPpp2r1aTruthSourceTerms.js)
  - [shadowPpp2r1aTruthHeadToHead.js](/Users/ahmedelmorshedy/Genovy-phenotype-enrichment-20260316-0914/src/scripts/shadowPpp2r1aTruthHeadToHead.js)
- Added outputs:
  - [shadow-ppp2r1a-truth-headtohead-20260327.json](/Users/ahmedelmorshedy/Genovy-phenotype-enrichment-20260316-0914/output/shadow-ppp2r1a-truth-headtohead-20260327.json)
  - [shadow-ppp2r1a-truth-headtohead-20260327.md](/Users/ahmedelmorshedy/Genovy-phenotype-enrichment-20260316-0914/output/shadow-ppp2r1a-truth-headtohead-20260327.md)
- Result:
  - truthful disease repair flips case `43` locally:
    - `PPP2R1A 2 -> 1` over `MACF1`
  - truthful disease repair improves but does not rescue case `41`:
    - `PPP2R1A 3 -> 2`, still behind `HNRNPC`
- Interpretation:
  - this confirms `PPP2R1A` is a mixed gene with one clearly salvageable case
  - and that truthful branch repair can matter materially here

## 2026-03-27 U2AF2 Symmetric Source Shadow
- Added:
  - [u2af2-symmetric-source-shadow-20260327.md](/Users/ahmedelmorshedy/Genovy-phenotype-enrichment-20260316-0914/docs/u2af2-symmetric-source-shadow-20260327.md)
- Added script:
  - [shadowU2af2SymmetricSourceTerms.js](/Users/ahmedelmorshedy/Genovy-phenotype-enrichment-20260316-0914/src/scripts/shadowU2af2SymmetricSourceTerms.js)
- Added outputs:
  - [shadow-u2af2-symmetric-source-terms-20260327.json](/Users/ahmedelmorshedy/Genovy-phenotype-enrichment-20260316-0914/output/shadow-u2af2-symmetric-source-terms-20260327.json)
  - [shadow-u2af2-symmetric-source-terms-20260327.md](/Users/ahmedelmorshedy/Genovy-phenotype-enrichment-20260316-0914/output/shadow-u2af2-symmetric-source-terms-20260327.md)
- Result:
  - current live hard-case outranker identified exactly:
    - `LRRC7`
    - `MONDO:0980748`
    - `intellectual developmental disorder, autosomal dominant 77`
  - strict symmetric source check found:
    - `10` promotable truth-side additions for `U2AF2`
    - `0` new packet-relevant rival additions for `LRRC7`
  - rank outcome:
    - `U2AF2 959 -> 2`
    - `LRRC7 1 -> 1`
- Interpretation:
  - this confirms the hard `U2AF2` case is not blocked by missing rival curation
  - it is a real truthful enrichment win that still loses to a strong mimic under the current scorer
  - `LRRC7` staying top despite multiple exact excluded-term contradictions keeps this case in the future negative-evidence / ranking bucket

## 2026-03-27 RERE Live Symmetric Reopen
- Added:
  - [rere-live-symmetric-reopen-20260327.md](/Users/ahmedelmorshedy/Genovy-phenotype-enrichment-20260316-0914/docs/rere-live-symmetric-reopen-20260327.md)
  - [shadow-rere-live-symmetric-reopen-20260327.json](/Users/ahmedelmorshedy/Genovy-phenotype-enrichment-20260316-0914/output/shadow-rere-live-symmetric-reopen-20260327.json)
- Result:
  - used a narrow live direct disease-surface lookup for `RERE` and `MED13` only
  - did not rely on a second heavy full rerank after the fresh centerbeam path stalled
  - confirmed baseline direct exact ownership before the saved additions:
    - `RERE` owns `Anteverted nares`
    - `MED13` owns `Wide mouth` and `Synophrys`
    - both share `Hypertelorism`, `Autistic behavior`, `Hypotonia`, `Global developmental delay`
  - confirmed direct exact excluded contradictions are highly asymmetric on the current live surface:
    - `RERE` carries a large excluded-contradiction set
    - `MED13` carries only `Smooth philtrum`
  - preserved the saved symmetric case-series movement:
    - `RERE 238 -> 82`
    - `MED13 1 -> 1`
  - after the saved additions, `MED13` no longer owns the main present exact discriminators
- Interpretation:
  - this means the remaining `RERE` miss is no longer well explained by obvious truth-side exact-term absence
  - the unresolved piece is now how the scorer handles the case after exact recovery, especially contradiction and frequency behavior

## 2026-03-27 Bulk Reopen Of Remaining Unsolved Misses
- Added:
  - [unsolved-miss-bulk-reopen-20260327.md](/Users/ahmedelmorshedy/Genovy-phenotype-enrichment-20260316-0914/docs/unsolved-miss-bulk-reopen-20260327.md)
  - [unsolved-miss-bulk-reopen-20260327.json](/Users/ahmedelmorshedy/Genovy-phenotype-enrichment-20260316-0914/output/unsolved-miss-bulk-reopen-20260327.json)
  - [generateUnsolvedMissBulkReopen.js](/Users/ahmedelmorshedy/Genovy-phenotype-enrichment-20260316-0914/src/scripts/generateUnsolvedMissBulkReopen.js)
- Scope:
  - `12` unresolved case slots from the real current miss set
  - skipped `SETD2` because the saved symmetric source shadow already rescues it
- Result:
  - one consistent reopen artifact now exists for the remaining unresolved cases
  - each case preserves:
    - packet present/excluded terms
    - disease direct exact present/excluded ownership
    - gene direct exact present/excluded ownership
    - the saved current read from earlier case work
- Interpretation:
  - this turns the remaining miss tail into one standardized evidence surface instead of fragmented case notes
  - it should make the next prioritization pass much cleaner because all unresolved cases now share the same reopen format
