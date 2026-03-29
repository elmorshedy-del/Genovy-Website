# RERE Manual OMIM Extract - 2026-03-26

Scope:
- truth disease: `OMIM 616975` `neurodevelopmental disorder with or without anomalies of the brain, eye, or heart`
- outranker disease: `OMIM 618009` `intellectual developmental disorder 61`
- purpose:
  - verify whether a strict manual OMIM pass exposes new exact terms for the `RERE` truth branch that could plausibly close the gap to the `MED13` outranker

Truth branch `OMIM 616975`:
- clear OMIM-backed terms visible on the disease page / clinical synopsis:
  - `Anteverted nares`
  - `Broad eyebrow`
  - `Micrognathia`
  - `Downslanted palpebral fissures`
  - `Hypotonia`
  - `Global developmental delay`
  - `Autism spectrum disorder`
  - `Short stature`
  - `Poor feeding`
- important limitation:
  - the strict OMIM text does **not** expose the two main exact discriminators that the current outranker wins on:
    - `Synophrys`
    - `Wide mouth`

Outranker branch `OMIM 618009`:
- clear OMIM-backed terms visible on the disease page / clinical synopsis:
  - `Synophrys`
  - `Wide mouth`
  - `Attention deficit hyperactivity disorder`
  - `Strabismus`
  - `Nystagmus`
  - `Expressive language delay`
  - `Speech apraxia`
  - `Hypotonia`
  - `Global developmental delay`
- important read:
  - OMIM explicitly supports the exact facial/behavioral features that are already driving the outranker

Working conclusion:
- strict OMIM does **not** reveal a hidden exact-term rescue for the `RERE` truth branch
- the asymmetry is real:
  - `MED13` has canonical exact OMIM support for `Synophrys` and `Wide mouth`
  - `RERE` does not, at least not in the strict OMIM disease text / clinical synopsis
- so a strict symmetric OMIM shadow is expected to be weak or null for `RERE`

Next principle:
- do not invent a truth rescue from OMIM where OMIM does not support it
- if `RERE` is going to improve through source-backed enrichment, the next place to look is:
  - `GeneReviews`
  - the core `RERE` case series (`PMID:27087320`, `PMID:29330883`)
  - but still symmetrically and still shadow-only first
