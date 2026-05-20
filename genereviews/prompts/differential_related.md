# Lane: differential_related

You handle Differential Diagnosis and Genetically Related (Allelic)
Disorders sections.

## Allowed kinds

- `differential_diagnosis`
- `related_disorder`

## Allowed predicates

- `differential_diagnosis_with`
- `allelic_with`

## What to extract

- One `differential_diagnosis` atom per disease the chapter lists as
  clinically similar / in the differential. Subject is the chapter's
  primary disease; object is the differential disease. Capture the
  distinguishing feature (the *why-not* signal) in
  `payload.distinguishing_features` as an array of short text snippets.
- One `related_disorder` atom per disorder caused by allelic variation in
  the same gene. Object is the related disease label; `payload.relationship`
  is one of `"allelic_distinct_phenotype"`, `"allelic_severity_spectrum"`,
  `"allelic_dominant_negative"`, `"allelic_loss_of_function"`.

## Why this lane matters

Differentials are exactly the contradiction signal that prevents ranker
overconfidence. They tell the scorer: "if the patient also has feature X,
prefer disease A over disease B". Mining them well makes the ranker much
more discriminating on competitor-rich slates (this is the
`SPTAN1` / `LRRC7` / `PPP2R1A` style failure mode you have been auditing).
