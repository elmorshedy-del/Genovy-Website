# U2AF2 OMIM Shadow Test

Created:
- 2026-03-26

Question:
- If we switch from public-source candidates to a stricter manual OMIM-derived term set, does `U2AF2` recover under the current scorer?

Artifacts:
- Script:
  - [shadowU2af2PublicSourceCandidates.js](/Users/ahmedelmorshedy/Genovy-phenotype-enrichment-20260316-0914/src/scripts/shadowU2af2PublicSourceCandidates.js)
- Output JSON:
  - [shadow-u2af2-omim-candidates-20260326.json](/Users/ahmedelmorshedy/Genovy/output/shadow-u2af2-omim-candidates-20260326.json)
- Output Markdown:
  - [shadow-u2af2-omim-candidates-20260326.md](/Users/ahmedelmorshedy/Genovy/output/shadow-u2af2-omim-candidates-20260326.md)
- Source note:
  - [u2af2-manual-omim-extract-20260326.md](/Users/ahmedelmorshedy/Genovy-phenotype-enrichment-20260316-0914/docs/u2af2-manual-omim-extract-20260326.md)

Evidence surface:
- manual OMIM browser extraction from:
  - `191318`
  - `620535`
- live working DB
- current patched scorer
- shadow-only term addition to `MONDO:0957810`

Intentionally not inspected:
- OMIM API/download
- GeneReviews
- graph mutation

## OMIM-backed term set requested
- `Intellectual disability`
- `Delayed speech and language development`
- `Delayed fine motor development`
- `Delayed ability to walk`
- `Bilateral tonic-clonic seizure`
- `Gastroesophageal reflux`
- `Feeding difficulties`
- `Short palpebral fissure`
- `Bilateral ptosis`
- `Unilateral ptosis`

## Terms actually added in shadow

After correcting the shadow script to honor the explicit `--target-terms` list during row construction, all `10` requested OMIM-backed terms were added successfully:
- `Intellectual disability`
- `Delayed speech and language development`
- `Delayed fine motor development`
- `Delayed ability to walk`
- `Bilateral tonic-clonic seizure`
- `Gastroesophageal reflux`
- `Feeding difficulties`
- `Short palpebral fissure`
- `Bilateral ptosis`
- `Unilateral ptosis`

No OMIM-backed requested terms were missing from the ontology in the corrected rerun.

## Result

Across the `2` U2AF2 cases:
- found: `0 / 2 -> 0 / 2`
- top-10: `0 -> 0`
- MRR: `0 -> 0`
- improved: `0`
- worsened: `0`

Per case:
- `PMID_36747105_proband`: `miss -> miss`
- `PMID_37962958_43`: `miss -> miss`

Important detail:
- the truth gene still did not surface in the reported ranking for either case
- `baseline_truth_row = null`
- `shadow_truth_row = null`

## Interpretation

This strengthens the earlier negative result.

Even manual OMIM-derived syndrome enrichment does not rescue `U2AF2` while the support seam remains weak.

Important correction:
- the earlier draft of this note understated the added OMIM term count because the shadow script was still iterating an older hardcoded candidate list
- after fixing that bug and rerunning, the conclusion stayed the same:
  - all `10` OMIM-backed terms added successfully
  - both U2AF2 cases still remained `miss -> miss`

So the project should now treat the ordering as:
1. fix the `U2AF2 -> disease` support seam
2. only then revisit phenotype enrichment for `U2AF2`

## Status
- kept
