# U2AF2 Symmetric Source Shadow

Created:
- 2026-03-27

Scope:
- hard `U2AF2` case only: `PMID_37962958_43`
- truthful and symmetric packet-relevant source pass
- live real `v1-working` ranking via Railway centerbeam proxy

Sources checked
- Truth branch:
  - `OMIM:191318`
  - `OMIM:620535`
  - existing manual note: [u2af2-manual-omim-extract-20260326.md](/Users/ahmedelmorshedy/Genovy-phenotype-enrichment-20260316-0914/docs/u2af2-manual-omim-extract-20260326.md)
- Outranker branch:
  - `OMIM:621415`
  - [PMID:39256359](https://pubmed.ncbi.nlm.nih.gov/39256359/)
- GeneReviews:
  - no `LRRC7` chapter found

## Baseline live read

- top outranker:
  - `LRRC7`
  - `MONDO:0980748`
  - `intellectual developmental disorder, autosomal dominant 77`
  - rank `1`
  - score `0.215575`
- truth:
  - `U2AF2`
  - `MONDO:0957810`
  - rank `959`
  - score `0.138719`

This replaces the earlier vague “hard case near miss” read with the exact current live rival.

## Symmetric source check

Truth-side packet-relevant additions supported by the checked sources:
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

Rival-side result:
- no new packet-relevant additions were supported beyond the live graph surface

Important nuance:
- the truth-side OMIM additions are still truthful, but not uniformly favorable
- `Feeding difficulties` is source-backed for `U2AF2` and also explicitly excluded in this patient packet

## Exact packet fit summary

Before shadow:
- `U2AF2` exact present:
  - `Global developmental delay`
  - `Retrognathia`
  - `Low-set ears`
- `U2AF2` exact excluded contradictions:
  - `Autistic behavior`

- `LRRC7` exact present:
  - `Global developmental delay`
  - `Intellectual disability`
  - `Delayed fine motor development`
  - `Delayed ability to walk`
  - `Delayed speech and language development`
  - `Anxiety`
  - `Dystonia`
  - `Hypermetropia`
  - `Syringomyelia`
  - `Gastroesophageal reflux`
  - `Hypertelorism`
  - `Bilateral ptosis`
  - `Wide nasal bridge`
  - `Low-set ears`
- `LRRC7` exact excluded contradictions:
  - `Feeding difficulties`
  - `Autistic behavior`
  - `Attention deficit hyperactivity disorder`
  - `Hearing impairment`

After shadow:
- `U2AF2` exact present rises to:
  - `Global developmental delay`
  - `Intellectual disability`
  - `Delayed fine motor development`
  - `Delayed ability to walk`
  - `Delayed speech and language development`
  - `Bilateral tonic-clonic seizure`
  - `Gastroesophageal reflux`
  - `Short palpebral fissure`
  - `Bilateral ptosis`
  - `Unilateral ptosis`
  - `Retrognathia`
  - `Low-set ears`
- `U2AF2` exact excluded contradictions become:
  - `Feeding difficulties`
  - `Autistic behavior`
- `LRRC7` is unchanged

## Outcome

- `U2AF2`: `959 -> 2`
- `LRRC7`: `1 -> 1`

So the hard `U2AF2` case is now pinned more cleanly:
- it is a real truthful enrichment win
- but not a full rescue under a symmetric source check
- the remaining blocker is not “missing rival curation”
- the remaining blocker is that `LRRC7` is still a stronger packet mimic under the current scorer, even while carrying multiple exact contradictions from the patient’s excluded terms

Artifacts:
- [shadow-u2af2-symmetric-source-terms-20260327.json](/Users/ahmedelmorshedy/Genovy-phenotype-enrichment-20260316-0914/output/shadow-u2af2-symmetric-source-terms-20260327.json)
- [shadow-u2af2-symmetric-source-terms-20260327.md](/Users/ahmedelmorshedy/Genovy-phenotype-enrichment-20260316-0914/output/shadow-u2af2-symmetric-source-terms-20260327.md)
- [shadowU2af2SymmetricSourceTerms.js](/Users/ahmedelmorshedy/Genovy-phenotype-enrichment-20260316-0914/src/scripts/shadowU2af2SymmetricSourceTerms.js)
