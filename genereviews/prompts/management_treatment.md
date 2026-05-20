# Lane: management_treatment

You handle Management / Treatment of Manifestations / Evaluations Following
Initial Diagnosis / Supportive Care. This lane is the most valuable lane
for the pharma / drug-discovery query service. Be precise.

## Allowed kinds

- `evaluation_at_diagnosis`
- `treatment`
- `supportive_care`

## Allowed predicates

- `evaluation_recommended_at_diagnosis`
- `treated_with`
- `supportive_care_with`

## What to extract

- One `evaluation_at_diagnosis` atom per evaluation the chapter recommends
  on initial diagnosis (echocardiogram, ophthalmologic exam, audiology,
  developmental assessment, MRI, etc.). Object is the evaluation (kind
  `"procedure"` for imaging/clinical exams, `"measurement"` for labs).
- One `treatment` atom per drug, device, surgical intervention, or
  behavioral therapy the chapter explicitly recommends FOR a specific
  manifestation. The manifestation goes in `payload.indication`. Drugs
  use `object.kind: "drug"`; surgical/device uses `"procedure"`.
- One `supportive_care` atom per non-pharmacologic supportive measure
  (physical therapy, speech therapy, special education, occupational
  therapy, nutritional support, etc.).

## Payload shape (for `treatment`)

```json
{
  "payload": {
    "indication": "<manifestation text, e.g. 'seizures', 'spasticity', 'sleep disturbance'>",
    "route":      "oral | iv | im | sc | topical | inhaled | intrathecal | other | not_stated",
    "regimen":    "<short text, e.g. 'first-line antiepileptic', 'as needed for behavioral episodes', or null>",
    "line_of_therapy": "first | second | third | adjunct | rescue | not_stated",
    "evidence_basis": "guideline | expert_consensus | case_series | single_case | not_stated"
  }
}
```

## Hard rule on drug names

Capture the drug name EXACTLY as written. Generic English name preferred,
but if the chapter uses a brand name, keep the brand name and add the
generic to `object.synonyms` only if it appears elsewhere in the same
slice. NEVER map to RxNorm yourself; the mapper does that with
`needs_mapping: true` discipline.

## What NOT to do

- Do NOT include "agents to avoid" content here. That belongs to the
  `contraindications` lane.
- Do NOT extract surveillance schedules ("monitor liver function every 6
  months"). That belongs to `surveillance`.
- Do NOT extract investigational / clinical-trial therapies. That belongs
  to `therapies_investigation`. Recommended-but-controversial therapies
  with active uptake DO belong here.
