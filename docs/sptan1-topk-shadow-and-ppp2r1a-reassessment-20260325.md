# SPTAN1 Top-K Shadow And PPP2R1A Reassessment

Date:
- 2026-03-25

Question:
- After the ranked-output audit, does softening the broad gene-profile penalty rescue `SPTAN1`, and should `PPP2R1A` still be treated like the same kind of ranking leftover?

Evidence surface:
- live working-graph similarity index loaded from the post-ClinVar graph
- single-case shadow scorer for:
  - `PMID_36331550_Family16Patient21` (`SPTAN1`)
- ranked-output audit artifact:
  - [ranked-output-audit-ranking-problem-cases-20260324.json](/Users/ahmedelmorshedy/Genovy/output/ranked-output-audit-ranking-problem-cases-20260324.json)
- new shadow artifacts:
  - [shadow-sptan1-topk-gene-profile.json](/Users/ahmedelmorshedy/Genovy/output/shadow-sptan1-topk-gene-profile.json)
  - [shadow-sptan1-topk-gene-profile.md](/Users/ahmedelmorshedy/Genovy/output/shadow-sptan1-topk-gene-profile.md)

Intentionally not inspected:
- new enrichment sources
- broad benchmark reruns
- semantic-similarity rewrites
- raw mounted data or broad dumps

## SPTAN1 Read

Baseline for `PMID_36331550_Family16Patient21`:
- truth rank: `322`
- present terms: `2`
  - `HP:0000750` delayed speech and language development
  - `HP:0000252` microcephaly
- excluded terms: `19`
- truth direct score: `0.135845`
- truth disease-support score: `0.108006`
- truth direct phenotype count: `104`

Test:
- keep the disease-support path unchanged
- change only the direct gene-profile scorer
- replace the full gene-profile disease-side average with a top-k phenotype-side average

Result:
- top-k `4`:
  - truth rank `322 -> 242`
  - truth final score `0.201633`
- top-k `8`:
  - truth rank `322 -> 182`
  - truth final score `0.19118`
- top-k `12`:
  - truth rank `322 -> 260`
- top-k `16`:
  - truth rank `322 -> 268`
- top-k `24`:
  - truth rank `322 -> 260`
- top-k `32`:
  - truth rank `322 -> 279`
- top-k `48`:
  - truth rank `322 -> 318`
- top-k `64`:
  - truth rank `322 -> 291`

Interpretation:
- the broad gene-profile penalty is real
- softening it helps
- but it is not close to sufficient
- even the best tested setting only moves `SPTAN1` to `182`, still far outside top `100`

Important detail:
- the winning shadow top genes under aggressive top-k are still broad neurodevelopmental genes such as `EHMT1`, `GRIN2A`, `ZEB2`, `RAI1`, and `MECP2`
- that means the failure is not simply “`SPTAN1` has too many direct phenotypes”
- the two-term patient packet is just too non-specific, and many other genes can assemble equally strong or stronger top-k matches

Decision:
- do not patch the main scorer with a top-k-only fix for `SPTAN1`
- this lever is too weak to justify a global scoring change by itself
- if `SPTAN1` is revisited later, the next candidate should be a different lever:
  - stronger disease-support aggregation
  - semantic similarity changes
  - or a gene-level specificity feature

## PPP2R1A Reassessment

`PPP2R1A` no longer belongs in the same bucket as `SPTAN1`.

Case `PMID_37761890_41`:
- truth rank: `256`
- truth support disease: `MONDO:0014605` (`Houge-Janssens syndrome 2`)
- truth exact direct overlap: `3`
- top competitors in the top `10` commonly have `4-8` exact direct overlaps
- read:
  - truth is not merely losing a tie-break
  - it is genuinely weaker on direct phenotype coverage than many competing leaf diseases

Case `PMID_37761890_43`:
- truth rank: `109`
- truth exact direct overlap: `5`
- top competitors in the top `10` commonly have `6-9` exact direct overlaps, though a few are closer
- read:
  - this case is more salvageable than case `41`
  - but it still does not look like a pure ranking-normalization bug

Decision:
- reclassify `PPP2R1A` as mixed:
  - some ranking pressure
  - but also truth-profile weakness
- next work for `PPP2R1A` should favor:
  - truth-side phenotype profile inspection/enrichment
  - and only then any scorer tweaks

## Conclusion

- `SPTAN1` remains a real leftover, but the first obvious scorer lever was too weak to rescue it
- `PPP2R1A` should not be treated like `SPTAN1`
- the remaining leftover set is becoming cleaner:
  - `SPTAN1`: still genuine ranking/specificity problem
  - `PPP2R1A`: mixed ranking plus truth-profile weakness

Own commentary:
- This was a worthwhile negative test because it closes off one plausible scorer idea without another broad benchmark detour.
- The result also raises the bar for future `SPTAN1` work: a fix needs to do more than soften broad-profile penalties.
