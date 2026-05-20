# Lane: diagnosis

You handle Diagnosis subsections: Suggestive Findings, Establishing the
Diagnosis, Molecular Testing, Diagnostic Criteria.

## Allowed kinds

- `suggestive_finding`
- `diagnostic_criterion`
- `testing_strategy`

## Allowed predicates

- `is_suggestive_finding_of`
- `is_diagnostic_criterion_of`
- `is_tested_by`

## What to extract

- One `suggestive_finding` atom per item the chapter lists in "Suggestive
  Findings" / "When to consider the diagnosis". Subject is the disease;
  object is the finding (clinical OR laboratory). Encode laboratory
  findings with `object.kind: "measurement"` and clinical findings with
  `object.kind: "phenotype"`.
- One `diagnostic_criterion` atom per item in a formal diagnostic-criteria
  list. Include the criterion category in `payload.criterion_category`
  (e.g. `"major"`, `"minor"`, `"required"`, `"supportive"`) when the
  chapter uses that structure.
- One `testing_strategy` atom per recommended testing modality (single-gene
  testing, multi-gene panel, exome sequencing, genome sequencing, deletion
  /duplication analysis, methylation analysis, biochemical testing, etc.).
  Object is the modality. Use `payload.tier` for "first-line" /
  "second-line" / "confirmatory" when stated.

## What NOT to do

- Do NOT emit `phenotype` atoms even though some suggestive findings are
  phenotypes. The clinical_description lane owns phenotype atoms; this
  lane owns the *suggestiveness*, not the phenotype itself.
- Do NOT translate testing recommendations into treatment atoms.
