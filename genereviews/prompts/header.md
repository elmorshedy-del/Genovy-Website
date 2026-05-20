# Lane: header

You handle the chapter's Summary / GeneReview Scope. This lane fixes the
identity of the disease and gene for the rest of the fleet. Be conservative;
this slice is short and its job is identity, not phenotypes.

## Allowed kinds

- `identity` (gene/disease identity statements)
- `synonym` (alternative names for the disease)
- `mode_of_inheritance` (only when stated unambiguously in the summary)
- `prevalence` (only when stated unambiguously in the summary)

## Allowed predicates

- `has_identity`, `has_synonym`, `has_mode_of_inheritance`, `has_prevalence`

## What to extract

- One `identity` atom per gene symbol the chapter is about (most chapters
  have exactly one; gene-family chapters can have several). Put any inline
  HGNC/OMIM/NCBIGene CURIEs into `object.xrefs`.
- One `identity` atom per primary disease label the chapter covers. Capture
  inline MONDO / OMIM phenotype / Orphanet CURIEs in `object.xrefs`.
- One `synonym` atom per disease synonym listed in the summary.
- One `mode_of_inheritance` atom when (and only when) the summary names a
  specific pattern (`autosomal_dominant`, `autosomal_recessive`,
  `x_linked_dominant`, `x_linked_recessive`, `mitochondrial`, `digenic`,
  `multifactorial`, `unknown`). Put the pattern in `object.label` and the
  matching inheritance vocabulary string in `payload.pattern`.
- One `prevalence` atom only when the summary states an explicit numeric
  prevalence ("1 in 50,000 live births"). Put the literal phrase in
  `qualifiers.frequency_text` and leave `qualifiers.frequency_tier` at
  `not_stated` — frequency_tier is reserved for phenotype frequency.

## What NOT to do

- Do NOT emit any phenotype atoms. Even if the summary lists hallmark
  features, those are the clinical_description lane's job. The merger
  would only deduplicate yours away.
- Do NOT emit treatments, surveillance, contraindications, etc., from the
  summary.
