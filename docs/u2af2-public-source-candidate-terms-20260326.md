# U2AF2 Public-Source Candidate Terms For Shadow Testing

Created:
- 2026-03-26

Purpose:
- Build the first safe, source-backed shadow candidate list for `U2AF2` / `MONDO:0957810`.
- Use only public, inspectable sources.
- Do **not** mutate the graph from this file.

Evidence surface:
- current syndrome support anchor:
  - [GenCC submission for `U2AF2` / `MONDO:0957810`](https://thegencc.org/submissions/SGC-103707.1)
- public case and cohort sources:
  - [Spliceosome malfunction causes neurodevelopmental disorders with overlapping features - PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC10760965/)
  - [U2AF2 Missense Variant Associated With Epilepsy and Systemic Dysmorphism - PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC12515583/)
- current graph gap note:
  - [u2af2-source-backed-shadow-prep-20260326.md](/Users/ahmedelmorshedy/Genovy-phenotype-enrichment-20260316-0914/docs/u2af2-source-backed-shadow-prep-20260326.md)

Intentionally not inspected:
- OMIM full text
- GeneReviews
- supplemental tables not visible in the inspected public pages
- direct graph mutation

## What the public sources support clearly

The inspected public sources support a broader `U2AF2` syndrome surface than the current graph carries.

Strong public-source themes:
- developmental delay involving:
  - speech/language
  - motor development
  - cognition
- intellectual disability
- seizures / epilepsy
- brain malformations
- behavioral issues including anxiety / obsession / ADHD-like features
- vision abnormalities
- hearing loss
- limb abnormalities including clinodactyly / brachydactyly
- shared craniofacial gestalt including:
  - hypertelorism
  - short palpebral fissures
  - short neck
- published case-level ptosis support

## Safe first shadow candidates

These are reasonable first shadow candidates because they are both:
- missing from the current `MONDO:0957810` disease profile for `PMID_37962958_43`
- and supported by the inspected public sources

### Directly supported or strongly supported phenotype families
- `HP:0001249` `Intellectual disability`
- `HP:0000750` `Delayed speech and language development`
- `HP:0010862` `Delayed fine motor development`
- `HP:0031936` `Delayed ability to walk`
- `HP:0002069` `Bilateral tonic-clonic seizure`
- `HP:0000739` `Anxiety`
- `HP:0008770` `Obsessive-compulsive trait`
- `HP:0030084` `Clinodactyly`
- `HP:0012745` `Short palpebral fissure`
- `HP:0000316` `Hypertelorism`
- `HP:0001488` `Bilateral ptosis`
- `HP:0007687` `Unilateral ptosis`
- `HP:0000470` `Short neck`
- `HP:0000365` `Hearing impairment`

### Reasoning notes
- `Intellectual disability`, `speech/language delay`, and `motor delay` are supported by the larger cohort summary.
- `Seizures` are supported by both the larger cohort summary and later case-based review.
- `Anxiety` / `obsession` / behavioral issues are supported by the cohort summary.
- `Clinodactyly`, `hypertelorism`, `short palpebral fissures`, and `short neck` are supported by the cohort facial/limb summary.
- `Ptosis` is supported by the case-review paper describing bilateral ptosis in an OMIM-linked `U2AF2` patient.

## Terms that are still too weakly sourced from the currently inspected public pages

Do **not** add these yet on the basis of the currently inspected public evidence alone:
- `HP:0001561` `Polyhydramnios`
- `HP:0001511` `Intrauterine growth retardation`
- `HP:0002505` `Loss of ambulation`
- `HP:0001332` `Dystonia`
- `HP:0003396` `Syringomyelia`
- `HP:0002020` `Gastroesophageal reflux`
- `HP:0002019` `Constipation`
- `HP:0001852` `Sandal gap`
- `HP:0000431` `Wide nasal bridge`
- `HP:0011968` `Feeding difficulties`
- `HP:0011927` `Short digit`
- `HP:0004691` `2-3 toe syndactyly`
- `HP:0000490` `Deeply set eye`
- `HP:0006610` `Wide intermamillary distance`

These remain valid hypothesis terms, but they still need stronger source confirmation before shadow promotion.

## Recommended next U2AF2 step

1. Keep this list in a shadow-only lane
2. Build a U2AF2 shadow script that adds only the safe first candidates above to `MONDO:0957810`
3. Rerun the two U2AF2 cases only
4. Measure separately:
- does `PMID_37962958_43` improve from the added syndrome surface?
- does `PMID_36747105_proband` stay fragile because its main problem is still the support seam?

## Status
- open
