# PPP2R1A Reopen

Date:
- 2026-03-27

Goal:
- Re-open the two `PPP2R1A` misses from preserved artifacts only.
- Preserve the packet/truth/outranker picture without touching the heavy live Railway path.

Cases:
- `PMID_37761890_41`
- `PMID_37761890_43`

Sources:
- [ranked-output-audit-ranking-problem-cases-20260324.json](/Users/ahmedelmorshedy/Genovy/output/ranked-output-audit-ranking-problem-cases-20260324.json)
- [ranked-output-audit-ranking-problem-cases-20260324.md](/Users/ahmedelmorshedy/Genovy/output/ranked-output-audit-ranking-problem-cases-20260324.md)
- [truth-missed-term-gaps-pass-1.json](/Users/ahmedelmorshedy/Genovy/output/truth-missed-term-gaps-pass-1.json)
- [sptan1-topk-shadow-and-ppp2r1a-reassessment-20260325.md](/Users/ahmedelmorshedy/Genovy-phenotype-enrichment-20260316-0914/docs/sptan1-topk-shadow-and-ppp2r1a-reassessment-20260325.md)

Truth gene:
- `PPP2R1A`

Truth disease:
- `MONDO:0014605`
- `Houge-Janssens syndrome 2`

## Case 1: PMID_37761890_41

Packet:
- `Intrauterine growth retardation`
- `Microcephaly`
- `Moderate intellectual disability`
- `Delayed speech and language development`
- `Motor delay`
- `Seizure`
- `Hypoplasia of the corpus callosum`
- `Attention deficit hyperactivity disorder`
- `Feeding difficulties`

Truth:
- rank: `256`
- exact direct overlap: `3`
- exact truth-side direct terms:
  - `Microcephaly`
  - `Seizure`
  - `Hypoplasia of the corpus callosum`

Truth-side direct gaps:
- `Intrauterine growth retardation`
- `Moderate intellectual disability`
- `Delayed speech and language development`
- `Motor delay`
- `Attention deficit hyperactivity disorder`
- `Feeding difficulties`

Top outranker:
- gene: `HNRNPC`
- disease: `intellectual developmental disorder, autosomal dominant 74`
- rank: `1`
- exact direct overlap: `5`

Read:
- this case is not losing by a tiny tie-break
- the truth branch is genuinely weaker than many competitors on direct packet coverage

## Case 2: PMID_37761890_43

Packet:
- `Short stature`
- `Microcephaly`
- `Global developmental delay`
- `Delayed speech and language development`
- `Motor delay`
- `Seizure`
- `Agenesis of corpus callosum`
- `Hypotonia`
- `Feeding difficulties`

Truth:
- rank: `109`
- exact direct overlap: `5`
- exact truth-side direct terms:
  - `Microcephaly`
  - `Global developmental delay`
  - `Seizure`
  - `Agenesis of corpus callosum`
  - `Hypotonia`

Truth-side direct gaps:
- `Short stature`
- `Delayed speech and language development`
- `Motor delay`
- `Feeding difficulties`

Top outranker:
- gene: `MACF1`
- disease: `lissencephaly 9 with complex brainstem malformation`
- rank: `1`
- exact direct overlap: `6`

Read:
- this case is more salvageable than case `41`
- but it is still not a pure ranking bug

## Bottom line

`PPP2R1A` should stay in the mixed bucket.

Why:
- both packets are real and moderately rich
- the truth branch is not empty
- but it is still missing several exact direct terms that top competitors already have
- competitors are not winning through propagation tricks; they are winning through stronger direct coverage

Current classification:
- `PMID_37761890_41` = mixed, leaning truth-profile weakness
- `PMID_37761890_43` = mixed, more salvageable

Practical implication:
- if `PPP2R1A` is revisited, truth-side profile inspection/enrichment comes before any scorer-only change

## Narrow live direct-surface check

Date:
- 2026-03-27

Goal:
- Compare the current live exact direct surface for truth vs top outrankers on the packet terms only.
- Avoid the heavy full rerank path.

Important distinction:
- the saved March 24 ranking audit reported exact direct overlap counts on the support path
- the current live narrow lookup below shows what is directly present **now** on the exact disease and gene entities
- so this section is useful for current surface shape, not for rewriting the preserved March 24 artifact record

### Case 1: PMID_37761890_41

Branches checked:
- truth disease: `MONDO:0014605` `Houge-Janssens syndrome 2`
- truth gene: `NCBIGene:5518` `PPP2R1A`
- outranker disease: `MONDO:0958203` `intellectual developmental disorder, autosomal dominant 74`
- outranker gene: `NCBIGene:3183` `HNRNPC`

Current live exact direct hits on packet terms:

| Term | truth disease | truth gene | outranker disease | outranker gene |
| --- | --- | --- | --- | --- |
| Intrauterine growth retardation | no | no | no | yes |
| Microcephaly | no | yes | no | yes |
| Moderate intellectual disability | no | no | no | yes |
| Delayed speech and language development | no | no | no | yes |
| Motor delay | no | no | no | no |
| Seizure | no | yes | no | no |
| Hypoplasia of the corpus callosum | no | yes | no | no |
| Attention deficit hyperactivity disorder | no | no | no | no |
| Feeding difficulties | no | no | no | yes |

Read:
- on the current live surface, the disease layer contributes no exact direct packet terms for either branch
- the outranker advantage comes from the gene direct layer:
  - `5` exacts on `HNRNPC`
  - `3` exacts on `PPP2R1A`
- so this case still reads as mixed, leaning truth weakness

### Case 2: PMID_37761890_43

Branches checked:
- truth disease: `MONDO:0014605` `Houge-Janssens syndrome 2`
- truth gene: `NCBIGene:5518` `PPP2R1A`
- outranker disease: `MONDO:0032677` `lissencephaly 9 with complex brainstem malformation`
- outranker gene: `NCBIGene:23499` `MACF1`

Current live exact direct hits on packet terms:

| Term | truth disease | truth gene | outranker disease | outranker gene |
| --- | --- | --- | --- | --- |
| Short stature | no | no | no | yes |
| Microcephaly | no | yes | no | yes |
| Global developmental delay | no | yes | no | yes |
| Delayed speech and language development | no | no | no | no |
| Motor delay | no | no | no | no |
| Seizure | no | yes | no | yes |
| Agenesis of corpus callosum | no | yes | no | no |
| Hypotonia | no | yes | no | yes |
| Feeding difficulties | no | no | no | yes |

Read:
- again, the current live disease layer contributes no exact direct packet terms for either branch
- this case is closer than case `41`
- but the outranker gene still carries one extra exact packet term:
  - `Short stature`
  - plus `Feeding difficulties`
- while `PPP2R1A` keeps the stronger callosal exact:
  - `Agenesis of corpus callosum`

Updated classification after the live surface check:
- `PMID_37761890_41` = mixed, leaning truth-profile weakness
- `PMID_37761890_43` = mixed, more salvageable, but still not a pure disease-enrichment case

## Source-Backed Truth Shadow

Date:
- 2026-03-27

Goal:
- Add a small truthful set of `PPP2R1A` disease terms from `OMIM`, `GeneReviews`, and the `2023` paper.
- Test whether the more salvageable case flips.

Important limitation:
- the full public-DB two-case shadow was too slow over the live public connection
- so this result is a **head-to-head** shadow:
  - `PPP2R1A` versus `HNRNPC` for case `41`
  - `PPP2R1A` versus `MACF1` for case `43`
- it uses the real ontology and the real current branch surfaces for those genes/diseases
- it is useful for direction, not as a full benchmark replacement

Sources used:
- `OMIM:616362`
- `GeneReviews:NBK580243`
- `PMID:37761890`

Truth terms requested:
- `Global developmental delay`
- `Delayed speech and language development`
- `Motor delay`
- `Hypotonia`
- `Feeding difficulties`
- `Seizure`
- `Microcephaly`
- `Agenesis of corpus callosum`
- `Hypoplasia of the corpus callosum`
- `Attention deficit hyperactivity disorder`
- `Short stature`
- `Moderate intellectual disability`

Actually added:
- `Delayed speech and language development`
- `Motor delay`
- `Feeding difficulties`
- `Attention deficit hyperactivity disorder`
- `Short stature`
- `Moderate intellectual disability`

Already present and skipped:
- `Global developmental delay`
- `Hypotonia`
- `Seizure`
- `Microcephaly`
- `Agenesis of corpus callosum`
- `Hypoplasia of the corpus callosum`

### Head-to-head result

| Case | Baseline truth rank | Shadow truth rank | Baseline top1 | Shadow top1 |
| --- | ---: | ---: | --- | --- |
| `PMID_37761890_41` | `3` | `2` | `HNRNPC` | `HNRNPC` |
| `PMID_37761890_43` | `2` | `1` | `MACF1` | `PPP2R1A` |

Read:
- `PMID_37761890_41`
  - truthful disease repair helps a little
  - but `HNRNPC` still wins
- `PMID_37761890_43`
  - truthful disease repair is enough to flip the local winner
  - this confirms the earlier read that case `43` is genuinely salvageable by source-backed truth repair

Saved artifacts:
- [shadowPpp2r1aTruthSourceTerms.js](/Users/ahmedelmorshedy/Genovy-phenotype-enrichment-20260316-0914/src/scripts/shadowPpp2r1aTruthSourceTerms.js)
- [shadowPpp2r1aTruthHeadToHead.js](/Users/ahmedelmorshedy/Genovy-phenotype-enrichment-20260316-0914/src/scripts/shadowPpp2r1aTruthHeadToHead.js)
- [shadow-ppp2r1a-truth-headtohead-20260327.json](/Users/ahmedelmorshedy/Genovy-phenotype-enrichment-20260316-0914/output/shadow-ppp2r1a-truth-headtohead-20260327.json)
- [shadow-ppp2r1a-truth-headtohead-20260327.md](/Users/ahmedelmorshedy/Genovy-phenotype-enrichment-20260316-0914/output/shadow-ppp2r1a-truth-headtohead-20260327.md)

## Evidence boundaries

Inspected:
- preserved phenopackets
- saved ranked-output audit JSON/MD
- saved truth-gap audit JSON
- saved March 25 reassessment note

Intentionally not inspected:
- no fresh live Railway rerank
- no broad raw data crawl

Confidence:
- high
