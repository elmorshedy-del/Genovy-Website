# STXBP1 Remaining Miss Pair Status

Date:
- 2026-03-27

Goal:
- Re-open the two remaining `STXBP1` misses from the real `v1-working` `1.0` run.
- Preserve the current best diagnosis for each case without overstating what the infrastructure could not yet answer.

Cases:
- `PMID_35190816_STX_26865513_Patient_45`
- `PMID_35190816_STX_28944233_270001`

Real benchmark reference:
- [official-real-v1-working-handoff-floor-1.0-20260326.json](/Users/ahmedelmorshedy/Genovy-phenotype-enrichment-20260316-0914/output/official-real-v1-working-handoff-floor-1.0-20260326.json)

## Case 1: PMID_35190816_STX_26865513_Patient_45

Patient packet:
- `Global developmental delay`
- `Severe intellectual disability`
- `Generalized hypotonia`
- `Gait ataxia`
- `Truncal ataxia`
- `Head tremor`
- `Action tremor`
- `EEG with abnormally slow frequencies`
- `Emotional lability`
- `Aggressive behavior`
- `Absent speech`

Best preserved truth-branch evidence:
- source: [truth-missed-term-gaps-pass-1.json](/Users/ahmedelmorshedy/Genovy/output/truth-missed-term-gaps-pass-1.json)
- best linked support disease: `MONDO:0012812` `developmental and epileptic encephalopathy, 4`
- direct exact overlaps already present: `2`
  - `Severe intellectual disability`
  - `Absent speech`

Direct truth-branch gap:
- missing from the best linked disease direct profile:
  - `Global developmental delay`
  - `Generalized hypotonia`
  - `Gait ataxia`
  - `Truncal ataxia`
  - `Head tremor`
  - `Action tremor`
  - `EEG with abnormally slow frequencies`
  - `Emotional lability`
  - `Aggressive behavior`
- missing from all linked diseases at any profile level:
  - `Truncal ataxia`
  - `Head tremor`
  - `Emotional lability`

Current read:
- This case still looks more like a truth-branch undercoverage case than a proven sharp-mimic case.
- We do **not** yet have a fresh outranker trace for the real `v1-working` run.

## Case 2: PMID_35190816_STX_28944233_270001

Patient packet:
- `Global developmental delay`
- `Absent speech`
- `Aggressive behavior`
- `Impulsivity`
- `Bruxism`
- `Frontal bossing`
- `Broad face`
- `Short nose`
- `Depressed nasal bridge`
- `Narrow mouth`
- `Floppy infant`
- `Pain insensitivity`
- `Gastroesophageal reflux`
- `Constipation`
- `Broad palm`
- `Tapered finger`
- `Broad hallux`
- `Strabismus`

Fresh live rerank artifact:
- [audit-stxbp1-missed-case-28944233-270001-20260327.json](/Users/ahmedelmorshedy/Genovy-phenotype-enrichment-20260316-0914/output/audit-stxbp1-missed-case-28944233-270001-20260327.json)

Top outranker:
- gene: `RAI1`
- disease: `Smith-Magenis syndrome`
- top rank: `1`

Why the outranker still wins:
- exact direct overlaps on the outranker support disease: `11`
- highest-signal exacts include:
  - `Broad face`
  - `Pain insensitivity`
  - `Broad palm`
  - `Impulsivity`
  - `Short nose`
  - `Gastroesophageal reflux`
  - `Constipation`
  - `Frontal bossing`
  - `Depressed nasal bridge`
  - `Strabismus`
  - `Global developmental delay`

Truth-side branch problem:
- the older branch-gap audit still applies:
  - several of the most discriminating terms do not live directly on the specific `DEE4` branch
- the March 25 targeted shadow already showed:
  - disease-level `DEE4` score improved heavily
  - but the gene-level handoff remained too weak to rescue the case

Current read:
- This is still the cleaner `STXBP1` mimic-heavy case.
- The main problem is not “we forgot generic STXBP1 terms.”
- It is specific-branch surface weakness plus a genuinely strong phenotypic mimic.

## Infrastructure finding

What failed today:
- the heavy full-index single-case rerank for `PMID_35190816_STX_26865513_Patient_45`
- the live `/api/dx/rank-genes` route for both remaining `STXBP1` packets

Observed failures:
- Postgres temp-space failure during full-index load:
  - `could not write to file "base/pgsql_tmp/..." : No space left on device`
- live app route failure:
  - Railway `502`
  - `Application failed to respond`

What this means:
- Railway and the Genovy Postgres are reachable.
- The current blocker is capacity on the heavy ranking path, not auth or connectivity.

## Practical next step

- Do **not** re-diagnose `PMID_35190816_STX_28944233_270001`; it is already well characterized.
- For `PMID_35190816_STX_26865513_Patient_45`, build a lighter audit path that does not require full index reconstruction on the live DB.
- Keep the current split explicit:
  - `26865513` = likely undercoverage
  - `28944233` = proven strong mimic / mixed case

## Evidence boundaries

Inspected:
- the real current benchmark artifact
- the preserved phenopackets
- the older STXBP1 direct-gap audit
- the older STXBP1 single-case audit
- the fresh 2026-03-27 live rerank artifact for `28944233`
- the direct Railway/API failure responses from today

Intentionally not inspected:
- no recursive raw data crawl
- no broad Railway data dump scan
- no forced DB cleanup or destructive infra action

Confidence:
- high for the `28944233` mimic diagnosis
- medium-high for the `26865513` undercoverage read
- high for the infrastructure-failure diagnosis
