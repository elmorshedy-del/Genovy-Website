# TRAF7 Symmetric Source Shadow

Date:
- 2026-03-26

Case:
- `PMID_32376980_11`

Truth:
- gene: `TRAF7`
- disease: `cardiac, facial, and digital anomalies with developmental delay`

Outranker:
- gene: `DOT1L`
- disease: `Nil-Deshwar neurodevelopmental syndrome`

Question:
- If we add the obvious source-backed truth/outranker terms symmetrically from OMIM and the primary syndrome papers, does the current scorer rescue `TRAF7`?

Evidence surface:
- manual OMIM browser pass:
  - `OMIM:618164` (`TRAF7`)
  - `OMIM:621265` (`DOT1L`)
- `GeneReviews` check:
  - no disease-specific `TRAF7` syndrome chapter found
  - no disease-specific `DOT1L` syndrome chapter found
- primary syndrome papers used only for exact term confirmation:
  - `PMID:32376980`
  - `PMCID:PMC8093014`
  - `PMCID:PMC10645550`
- live real `v1-working` DB shadow run

Scenarios run:
- `omim_literal_traf7_dot1l`
  - `TRAF7`: `Feeding difficulties`, `Hearing impairment`, `Low-set ears`, `Epicanthus`, `Optic atrophy`
  - `DOT1L`: `Feeding difficulties`, `Hearing impairment`, `High forehead`
- `omim_plus_primary_traf7_dot1l`
  - same as above, plus:
  - `TRAF7`: `Blepharophimosis`

Result:
- both scenarios were strict null results
- added terms: `0`
- all candidate terms were already present in the live direct disease profile
- truth rank stayed `143 -> 143`
- top1 stayed `DOT1L -> DOT1L`

Interpretation:
- this is a useful falsification, not a dead end
- `TRAF7` is not losing because we forgot these obvious OMIM / primary-paper syndrome terms
- there was no disease-specific `GeneReviews` layer to add for this pair
- the remaining leak is more likely:
  - exact granularity on sharper differentiators like `High myopia`, `Amblyopia`, `Poor suck`, and `Conductive hearing impairment`
  - and/or scorer geometry that still favors the narrower `DOT1L` branch

Files:
- script:
  - [shadowTraf7SymmetricSourceTerms.js](/Users/ahmedelmorshedy/Genovy-phenotype-enrichment-20260316-0914/src/scripts/shadowTraf7SymmetricSourceTerms.js)
- outputs:
  - [shadow-traf7-symmetric-source-terms-20260326.json](/Users/ahmedelmorshedy/Genovy-phenotype-enrichment-20260316-0914/output/shadow-traf7-symmetric-source-terms-20260326.json)
  - [shadow-traf7-symmetric-source-terms-20260326.md](/Users/ahmedelmorshedy/Genovy-phenotype-enrichment-20260316-0914/output/shadow-traf7-symmetric-source-terms-20260326.md)
