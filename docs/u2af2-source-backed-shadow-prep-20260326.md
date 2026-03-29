# U2AF2 Source-Backed Shadow Prep

Created:
- 2026-03-26

Question:
- Before any OMIM/GeneReviews-driven shadow enrichment, what do the two current `U2AF2` benchmark cases actually tell us about the live disease surface for `MONDO:0957810`?

Purpose:
- Start the safe `U2AF2` workflow without polluting the graph.
- Separate:
  - support-seam fragility
  - from genuine disease-profile undercoverage

Evidence surface:
- phenopackets:
  - [PMID_36747105_proband.json](/Users/ahmedelmorshedy/Genovy/output/pheval-official-sample-100/phenopackets/PMID_36747105_proband.json)
  - [PMID_37962958_43.json](/Users/ahmedelmorshedy/Genovy/output/pheval-official-sample-100/phenopackets/PMID_37962958_43.json)
- live disease phenotype surface:
  - `MONDO:0957810`
  - `26` current `has_phenotype` rows on the working DB

Intentionally not inspected:
- OMIM browser text
- GeneReviews text
- raw literature full text
- graph mutation
- source promotion into the live graph

## Current `MONDO:0957810` phenotype surface

The current disease profile already contains:
- `Microcephaly`
- `Global developmental delay`
- `Febrile seizure (within the age range of 3 months to 6 years)`
- `Hypoplasia of the corpus callosum`
- `Microtia`
- `Low-set ears`
- `Mandibular prognathia`
- plus many currently excluded features such as:
  - `Single transverse palmar crease`
  - `Pes planus`
  - `Exotropia`
  - `Ptosis`
  - `Hypotonia`
  - `Autistic behavior`
  - `Vertical nystagmus`
  - `Chorea`
  - `Lower limb hyperreflexia`
  - `Thick eyebrow`
  - `Upslanted palpebral fissure`
  - `Depressed nasal bridge`
  - `Deep philtrum`
  - `Retrognathia`
  - `Delayed CNS myelination`

## Case split

### Case 1: `PMID_36747105_proband`

Positive overlap with current disease profile:
- `7 / 7`

Positive terms already covered:
- `Microcephaly`
- `Global developmental delay`
- `Febrile seizure (within the age range of 3 months to 6 years)`
- `Hypoplasia of the corpus callosum`
- `Microtia`
- `Low-set ears`
- `Mandibular prognathia`

Excluded overlap with current disease profile:
- `15 / 15`

Interpretation:
- This case is **not** mainly a thin-disease-profile problem.
- The syndrome surface already matches the positive packet completely.
- The difficulty here is more likely:
  - fragile support seam
  - scorer instability around indirect support
  - and possibly how exclusions interact with the chosen support path

### Case 2: `PMID_37962958_43`

Positive overlap with current disease profile:
- `3 / 25`

Positive terms already covered:
- `Global developmental delay`
- `Retrognathia`
- `Low-set ears`

Positive terms currently missing from the disease profile:
- `Polyhydramnios`
- `Intrauterine growth retardation`
- `Intellectual disability`
- `Delayed fine motor development`
- `Delayed ability to walk`
- `Delayed speech and language development`
- `Anxiety`
- `Obsessive-compulsive trait`
- `Bilateral tonic-clonic seizure`
- `Loss of ambulation`
- `Dystonia`
- `Hypermetropia`
- `Syringomyelia`
- `Gastroesophageal reflux`
- `Constipation`
- `Clinodactyly`
- `Sandal gap`
- `Short palpebral fissure`
- `Hypertelorism`
- `Bilateral ptosis`
- `Unilateral ptosis`
- `Wide nasal bridge`

Excluded overlap with current disease profile:
- `1`
  - `Autistic behavior`

Excluded terms currently missing from the disease profile:
- `Feeding difficulties`
- `Attention deficit hyperactivity disorder`
- `Hearing impairment`
- `Short digit`
- `2-3 toe syndactyly`
- `Deeply set eye`
- `Short neck`
- `Wide intermamillary distance`

Interpretation:
- This case really is a thin-profile problem.
- The current syndrome surface misses most of the clinically important packet.

## Main conclusion

`U2AF2` is not one problem.

It currently splits into two different failure modes:

1. `PMID_36747105_proband`
- mostly seam/support fragility
- not mainly missing positive disease terms

2. `PMID_37962958_43`
- genuine phenotype undercoverage
- strong candidate for source-backed syndrome enrichment

This is why the earlier expectation of a clean `+2` from ClinVar alone was too optimistic:
- ClinVar gave a partial bridge
- it was enough to surface the easier case once
- it did not solve the harder undercovered case

## Safe next step

1. Pull source-backed candidate terms for `OMIM:620535` from OMIM/GeneReviews/manual curation
2. Restrict the candidate list initially to terms missing from `PMID_37962958_43`
3. Keep them in a shadow profile only
4. Re-test both U2AF2 cases together
5. Only promote anything if it is source-backed and survives the family slice

## Status
- open
