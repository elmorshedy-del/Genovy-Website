# SETD2 Symmetric Source Shadow

Date:
- 2026-03-26

Case:
- `PMID_33766796_16`

Truth:
- gene: `SETD2`
- disease: `Luscan-Lumish syndrome`

Outranker:
- gene: `TCF20`
- disease: `developmental delay with variable intellectual impairment and behavioral abnormalities`

Question:
- If we add the exact source-backed packet terms symmetrically from `OMIM` and the disease-specific `SETD2` `GeneReviews` chapter, does the truth branch rescue?

Evidence surface:
- manual `OMIM` browser pass:
  - `OMIM:616831` (`Luscan-Lumish syndrome`)
  - `OMIM:618430` (`TCF20` syndrome)
- `GeneReviews`:
  - `SETD2 Neurodevelopmental Disorders`
  - `NBK575927`
- primary syndrome literature for exact `TCF20` support:
  - `PMID:27436265`
- live real `v1-working` DB shadow run

Scenario:
- exact literal source-backed packet terms only
- `SETD2` target terms:
  - `Macrocephaly`
  - `Motor delay`
  - `Accelerated skeletal maturation`
  - `Delayed speech and language development`
  - `Aggressive behavior`
- `TCF20` target terms:
  - `Macrocephaly`
  - `Motor delay`
  - `Accelerated skeletal maturation`
  - `Delayed speech and language development`
  - `Aggressive behavior`

Result:
- added terms: `2`
- skipped existing terms: `8`
- new truth-side direct additions:
  - `Motor delay`
  - `Accelerated skeletal maturation`
- `SETD2` rank:
  - `140 -> 1`
- top1:
  - `TCF20 -> SETD2`

Interpretation:
- this is a true source-backed rescue
- `SETD2` was not losing because of a mysterious scorer effect alone
- it was missing exactly the two sharp packet terms that mattered most:
  - `Motor delay`
  - `Accelerated skeletal maturation`
- once those exact truth-side terms were restored, the current scorer correctly chose `SETD2`

Why this matters:
- this validates the honest workflow:
  - inspect miss
  - identify likely source-backed exact gaps
  - add symmetrically in shadow
  - rerun
- unlike `TRAF7`, this one was not a null result
- unlike `RERE`, this one did not stay trapped under scorer geometry after truthful enrichment

Files:
- script:
  - [shadowSetd2SymmetricSourceTerms.js](/Users/ahmedelmorshedy/Genovy-phenotype-enrichment-20260316-0914/src/scripts/shadowSetd2SymmetricSourceTerms.js)
- outputs:
  - [shadow-setd2-symmetric-source-terms-20260326.json](/Users/ahmedelmorshedy/Genovy-phenotype-enrichment-20260316-0914/output/shadow-setd2-symmetric-source-terms-20260326.json)
  - [shadow-setd2-symmetric-source-terms-20260326.md](/Users/ahmedelmorshedy/Genovy-phenotype-enrichment-20260316-0914/output/shadow-setd2-symmetric-source-terms-20260326.md)
