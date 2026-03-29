# SPTAN1 Ranking Reopen

Date:
- 2026-03-27

Goal:
- Re-open `SPTAN1` using the saved ranked-output artifacts only.
- Preserve the exact packet/truth/outranker picture without relying on the heavy live Railway path.

Case:
- `PMID_36331550_Family16Patient21`

Sources:
- [ranked-output-audit-ranking-problem-cases-20260324.json](/Users/ahmedelmorshedy/Genovy/output/ranked-output-audit-ranking-problem-cases-20260324.json)
- [ranked-output-audit-ranking-problem-cases-20260324.md](/Users/ahmedelmorshedy/Genovy/output/ranked-output-audit-ranking-problem-cases-20260324.md)
- [sptan1-topk-shadow-and-ppp2r1a-reassessment-20260325.md](/Users/ahmedelmorshedy/Genovy-phenotype-enrichment-20260316-0914/docs/sptan1-topk-shadow-and-ppp2r1a-reassessment-20260325.md)

## Packet

Present terms:
- `Delayed speech and language development`
- `Microcephaly`

Excluded terms:
- `19`
- includes:
  - multiple seizure types
  - `Intellectual disability`
  - `Motor delay`
  - `Hypotonia`
  - `Ataxia`
  - `Spasticity`
  - `Strabismus`
  - `Nystagmus`
  - `Cerebellar atrophy`

## Truth vs Packet

Truth gene:
- `SPTAN1`

Truth disease:
- `MONDO:0957815`
- `developmental delay with or without epilepsy`

Saved truth row:
- rank: `322`
- exact direct overlap count: `2`
- matched phenotype count: `2`
- direct phenotype count: `32`
- normalized score: `0.135845`

Truth fit against the packet:
- `Delayed speech and language development` -> exact
- `Microcephaly` -> exact

## Outranker vs Packet

Top outranker:
- gene: `ZBTB11`
- disease: `MONDO:0032715`
- `intellectual developmental disorder, autosomal recessive 69`

Saved top row:
- rank: `1`
- exact direct overlap count: `2`
- matched phenotype count: `2`
- direct phenotype count: `15`
- normalized score: `0.158072`

Outranker fit against the packet:
- saved audit implies both packet terms are matched directly and exactly

## Competitive pattern

This is not a one-gene false positive problem.

Saved top-20 pattern:
- competitors above truth: `20`
- specific direct-match competitors above truth: `17`
- propagated-only umbrella competitors above truth: `0`

What that means:
- `SPTAN1` is not losing because an umbrella disease with propagation stole the case
- `SPTAN1` is not losing because one bizarre outranker got lucky
- it is losing because a large number of leaf diseases can explain this tiny packet almost as well or better

Examples from the top `10`:
- `ZBTB11`
- `CC2D1A`
- `CRADD`
- `RRP7A`
- `DYNC1I2`
- `PSMB1`
- `SLC1A4`
- `TRAPPC14`
- `ROGDI`
- `CCND2`

## Existing negative scorer test

The March 25 top-k shadow already tested the first obvious rescue idea:
- soften the broad direct gene-profile penalty

Best result:
- truth rank `322 -> 182`

Interpretation:
- broad-profile penalty is real
- but it is not remotely sufficient to rescue the case

## Bottom line

This is still the cleanest real ranking/specificity leftover.

Why:
- the truth already exactly matches the packet
- the top outranker also exactly matches the packet
- many other leaf diseases also do
- the packet is so small that exact match alone cannot separate the truth

Current read:
- `SPTAN1` should stay in the genuine ranking-problem bucket
- this is not a clean source-gap case
- this is not a propagated-umbrella bug
- this is a true specificity problem under the current scorer

## Evidence boundaries

Inspected:
- preserved phenopacket
- saved ranked-output audit JSON/MD
- saved March 25 top-k shadow note

Intentionally not inspected:
- no fresh live Railway rerank
- no new enrichment sources
- no raw large-data crawl

Confidence:
- high
