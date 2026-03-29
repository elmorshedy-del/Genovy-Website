# U2AF2 Public-Source Shadow Test

Created:
- 2026-03-26

Question:
- If we add the first safe public-source-backed candidate terms to `MONDO:0957810` in shadow only, do the two current `U2AF2` benchmark cases improve under the current patched scorer?

Artifacts:
- Script:
  - [shadowU2af2PublicSourceCandidates.js](/Users/ahmedelmorshedy/Genovy-phenotype-enrichment-20260316-0914/src/scripts/shadowU2af2PublicSourceCandidates.js)
- Output JSON:
  - [shadow-u2af2-public-source-candidates-20260326.json](/Users/ahmedelmorshedy/Genovy/output/shadow-u2af2-public-source-candidates-20260326.json)
- Output Markdown:
  - [shadow-u2af2-public-source-candidates-20260326.md](/Users/ahmedelmorshedy/Genovy/output/shadow-u2af2-public-source-candidates-20260326.md)
- Candidate source note:
  - [u2af2-public-source-candidate-terms-20260326.md](/Users/ahmedelmorshedy/Genovy-phenotype-enrichment-20260316-0914/docs/u2af2-public-source-candidate-terms-20260326.md)

Evidence surface:
- live working DB
- current patched scorer with the real `1.0` handoff floor
- only the `2` U2AF2 cases
- shadow-only addition of `14` source-backed candidate terms to `MONDO:0957810`

Intentionally not inspected:
- OMIM full text
- GeneReviews
- any graph mutation
- full 100-case rerun

## Terms added in shadow
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

## Result

Across the `2` U2AF2 cases:
- found: `0 / 2 -> 0 / 2`
- top-10: `0 -> 0`
- MRR: `0 -> 0`
- improved: `0`
- worsened: `0`
- recovered from miss: `0`
- regressed to miss: `0`

Per case:
- `PMID_36747105_proband`: `miss -> miss`
- `PMID_37962958_43`: `miss -> miss`

Important detail:
- in this run, the truth gene did not surface in the reported ranking for either case
- `baseline_truth_row = null`
- `shadow_truth_row = null`

## Interpretation

This is an important negative result.

Public-source-backed disease-profile enrichment alone is **not enough** to rescue `U2AF2` under the current support geometry.

What this proves:
- `U2AF2` is not just a thin-profile problem
- the missing or fragile support seam is still dominant
- adding syndrome terms to `MONDO:0957810` cannot help if the scorer still lacks a robust path from `U2AF2` to that disease

So `U2AF2` is not currently in the same position as `STXBP1`.

`STXBP1`:
- specific branch existed
- targeted enrichment improved the disease branch
- handoff leak then became visible

`U2AF2`:
- disease enrichment alone does not even reach the gene
- so the seam problem comes first

## Practical conclusion

Do **not** keep spending time on `U2AF2` phenotype-term enrichment until the support seam is repaired or explicitly bridged.

The next `U2AF2` step should be:
- attachment / support-path repair
- not more disease-profile term chasing

## Status
- kept
