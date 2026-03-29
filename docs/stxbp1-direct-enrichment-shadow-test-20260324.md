# STXBP1 Direct Enrichment Shadow Test

Date:
- 2026-03-24

Question:
- If `MONDO:0012812` (DEE4) receives a GeneReviews-informed direct-profile enrichment, do the current STXBP1 benchmark cases improve enough to justify broader manual enrichment work?

Scope:
- Shadow-only benchmark.
- No graph mutation.
- Only `MONDO:0012812` direct phenotype surface changed in-memory.
- Evaluated all current STXBP1 truth-gene cases in the official benchmark slice (`10` cases, not just the older `8`-case subset).

Evidence surface:
- Live working DB scorer inputs:
  - `relationships`
  - `loadDxDiseasePhenotypeRows`
  - `loadDxGenePhenotypeRows`
  - `loadDxGeneDiseaseSupportRows`
- Existing post-ClinVar benchmark reference:
  - [official-benchmark-post-clinvar-run54.json](/Users/ahmedelmorshedy/Genovy/output/official-benchmark-post-clinvar-run54.json)
- Shadow artifact outputs:
  - [stxbp1-direct-enrichment-test.json](/Users/ahmedelmorshedy/Genovy/output/stxbp1-direct-enrichment-test.json)
  - [stxbp1-direct-enrichment-test.md](/Users/ahmedelmorshedy/Genovy/output/stxbp1-direct-enrichment-test.md)

Intentionally not inspected:
- raw GeneReviews full-text extraction pipeline automation
- OMIM bulk/API ingestion
- broader undercovered-gene enrichment beyond STXBP1

## Baseline Disease Surface
- Target disease:
  - `MONDO:0012812`
  - `developmental and epileptic encephalopathy, 4`
- Current direct disease profile:
  - `27` `has_phenotype` rows
  - source: `hpo_disease_phenotype`

## Shadow Terms Added
Added `19` missing direct terms:
- `HP:0000718` Aggressive behavior
- `HP:0002104` Apnea
- `HP:0010055` Broad hallux
- `HP:0001169` Broad palm
- `HP:0003763` Bruxism
- `HP:0002019` Constipation
- `HP:0100660` Dyskinesia
- `HP:0001332` Dystonia
- `HP:0000712` Emotional lability
- `HP:0011968` Feeding difficulties
- `HP:0002020` Gastroesophageal reflux
- `HP:0002346` Head tremor
- `HP:0002883` Hyperventilation
- `HP:0005941` Intermittent hyperpnea at rest
- `HP:0007021` Pain insensitivity
- `HP:0030891` Periventricular white matter hyperintensities
- `HP:0000253` Progressive microcephaly
- `HP:0100716` Self-injurious behavior
- `HP:0002078` Truncal ataxia

## Benchmark Result
Across all `10` current STXBP1 cases:
- found: `6 / 10 -> 6 / 10`
- top-10: `1 -> 1`
- median rank: `31 -> 31`
- MRR: `0.024438 -> 0.024438`
- improved: `0`
- worsened: `0`
- recovered from miss: `0`
- regressed to miss: `0`

Per-case result:
- `PMID_35190816_STX_20887364_Subject_2103`: `34 -> 34`
- `PMID_35190816_STX_23934111_dl`: `10 -> 10`
- `PMID_35190816_STX_23934111_fh`: `28 -> 28`
- `PMID_35190816_STX_25818041_Patient_20`: `66 -> 66`
- `PMID_35190816_STX_26865513_Patient_45`: `miss -> miss`
- `PMID_35190816_STX_27159321_LD_0358`: `miss -> miss`
- `PMID_35190816_STX_28944233_270001`: `miss -> miss`
- `PMID_35190816_STX_EG0598P`: `26 -> 26`
- `PMID_35190816_STX_P_20`: `39 -> 39`
- `PMID_35190816_STX_Syrbe_6`: `miss -> miss`

## Important Sanity Check
The zero-change result is not because the added terms were irrelevant to every patient packet.

Exact overlap with added terms exists in at least:
- `PMID_35190816_STX_26865513_Patient_45`
  - `4` exact overlaps:
    - `HP:0002078`
    - `HP:0002346`
    - `HP:0000712`
    - `HP:0000718`
- `PMID_35190816_STX_28944233_270001`
  - `7` exact overlaps:
    - `HP:0000718`
    - `HP:0003763`
    - `HP:0007021`
    - `HP:0002020`
    - `HP:0002019`
    - `HP:0001169`
    - `HP:0010055`
- `PMID_35190816_STX_EG0598P`
  - `1` exact overlap:
    - `HP:0002019`

For the `6` found STXBP1 cases, the supporting disease remained the same before and after:
- `MONDO:0012812`

## Interpretation
- Direct DEE4 enrichment alone does not move STXBP1 under the current scorer.
- This is now stronger than the earlier theory that STXBP1 was mainly a thin-direct-profile problem.
- Even when the truth disease already supports the gene and even when newly added direct terms exactly overlap the patient packet, the rank does not move.
- That means the bottleneck is not just missing DEE4 terms.

Most likely remaining explanations:
- gene-level competition still dominates after disease-profile improvement
- current gene-support aggregation is too insensitive to this kind of profile enrichment
- one or more STXBP1 misses are still primarily ranking / support-selection problems rather than direct-profile absence problems

## Decision
- Do not treat broad manual enrichment of undercovered genes as the next best universal move.
- Move next to ranked-output auditing on the leftover ranking-problem set:
  - `SCN2A`
  - `SPTAN1`
  - `PPP2R1A`
  - `SMARCC2`
- Keep STXBP1 in the leftover bucket, but no longer assume that adding more DEE4 terms alone will rescue it.

Own commentary / alternatives:
- This was a good shadow test because it falsified an attractive enrichment theory cheaply.
- If a 19-term targeted direct enrichment with exact patient-term hits cannot move STXBP1 at all, then repeating the same enrichment style gene-by-gene is low-confidence work unless the scorer changes too.
- A stronger next STXBP1 experiment, if needed later, would be not “more terms,” but “inspect the ranked competitors and score components for the missed cases.”
