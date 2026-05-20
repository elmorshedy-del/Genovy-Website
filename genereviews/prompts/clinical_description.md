# Lane: clinical_description

You handle the chapter's Clinical Description / Phenotype / Natural History
section. This lane is the single largest contributor to the rare-disease
ranker, so quality here matters more than quantity.

## Allowed kinds

- `phenotype` (mandatory primary output of this lane)

## Allowed predicates

- `has_phenotype` (when `presence_status == "present"` or `"unknown"`)
- `lacks_phenotype` (when `presence_status == "absent"`)

## What to extract

For each distinct clinical feature the chapter describes for the disease:

- One atom per HPO-conceptual feature. "Intellectual disability that is mild
  to moderate" is ONE feature (severity goes in `qualifiers.severity`) not
  three.
- Look for explicit frequency language ("in approximately 70% of affected
  individuals", "the majority", "rarely reported"). Map it strictly to the
  six-tier vocabulary defined in the base prompt.
- Look for onset language ("congenital", "in infancy", "by age 5",
  "adult-onset"). Map to `qualifiers.onset_class`.
- Look for severity, progression, laterality, and modifier qualifiers.
  Leave them at `not_stated` unless the chapter is explicit.
- Look for `n_referenced` numerators ("17 of 23 reported individuals"). Put
  the numerator in `qualifiers.n_referenced` and the literal phrase in
  `qualifiers.frequency_text`.
- Track absent / explicitly excluded features. These are critical: emit them
  with `presence_status: "absent"` and predicate `lacks_phenotype`.

## What NOT to do

- Do NOT translate every adjective into HPO terms — wait for the mapper.
  Use the chapter's exact label as `object.label` and leave `curie: null`
  with `qc.needs_mapping: true` when no canonical CURIE is given inline.
- Do NOT extract treatments, surveillance items, or differential diagnoses
  from this slice even if they appear. Those belong to other lanes.
- Do NOT split one HPO concept across multiple atoms based on case
  variation ("two individuals had X" + "three individuals had X" should
  remain one atom unless the chapter is making a meaningful distinction).

## Required JSON fields per atom

```json
{
  "atom_id": "NBK_____-clinical_description-001",
  "kind": "phenotype",
  "subject": { "kind": "disease", "curie": null, "label": "<disease label from chapter header>" },
  "predicate": "has_phenotype" | "lacks_phenotype",
  "object":  { "kind": "phenotype", "curie": null, "label": "<exact feature label>" },
  "qualifiers": { "presence_status": "...", "frequency_tier": "...", "onset_class": "...", "severity": "...", "laterality": "...", "progression": "...", "modifier": null, "sex": "...", "aspect": "...", "n_referenced": null, "frequency_text": null },
  "grounded_sentence": "<single-claim present-tense sentence>",
  "verbatim_quote": "<exact substring of the slice>",
  "evidence": { "strength": "established | common_finding | case_series | single_case | anecdotal | not_stated", "n_cases_referenced": null, "cited_pmids": [] },
  "provenance": { "chapter_id": "...", "chapter_title": "...", "chapter_version": null, "section_lane": "clinical_description", "section_path": [...], "char_span": { "start": 0, "end": 0 }, "retrieved_at": "...", "agent_id": "clinical_description.v1", "model_id": null, "retrieval_url": null },
  "qc": { "grounded": true, "needs_mapping": true, "review_required": false, "review_reasons": [] }
}
```

## Sentence templates

- Presence: `"<Disease> {frequency adverb} presents with {feature label}{ severity clause}{ onset clause}."`
- Absence: `"<Feature label> is not observed in <Disease>."`

Examples (good):

- `"KBG syndrome very frequently presents with intellectual disability of childhood onset and mild-to-moderate severity."`
- `"Hearing impairment is not observed in U2AF2-related developmental delay, dysmorphic facies, and brain anomalies."`

Examples (bad — do not emit):

- `"Patients in this case series had ID and microcephaly."`  (compound, narrates the source rather than the disease)
- `"KBG patients are typically smart."`  (fabricated)
