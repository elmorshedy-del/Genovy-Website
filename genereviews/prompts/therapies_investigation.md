# Lane: therapies_investigation

You handle Therapies Under Investigation / Investigational / Clinical
Trials subsections. This lane is the pipeline-stage signal for the
drug-discovery / pharma query service.

## Allowed kinds

- `investigational_therapy`

## Allowed predicates

- `under_investigation_with`

## What to extract

One atom per investigational agent or modality the chapter discusses.
Modalities include small molecules, biologics, gene therapy (AAV, LNP),
antisense oligonucleotides, CRISPR-based editing, enzyme replacement,
substrate reduction, stem cell, autologous cellular therapy, and clinical
trial protocols by ClinicalTrials.gov identifier.

## Payload shape

```json
{
  "payload": {
    "modality": "small_molecule | biologic | gene_therapy_aav | gene_therapy_lnp | aso | crispr | enzyme_replacement | substrate_reduction | cell_therapy | dietary | repurposed | other | not_stated",
    "phase":    "preclinical | phase_0 | phase_1 | phase_1_2 | phase_2 | phase_2_3 | phase_3 | phase_4 | observational | unspecified",
    "trial_ids": ["NCT12345678", ...],
    "sponsor":  "<text or null>",
    "target_manifestation": "<text>"
  }
}
```

## Rules

- Phase is a key pharma signal. Map literal text strictly. "First-in-human"
  → `phase_1`. "Early-phase clinical trial" with no further detail →
  `unspecified`.
- Include ClinicalTrials.gov NCT ids exactly as written when present;
  validator pattern: `^NCT[0-9]{8}$`.
- Do NOT mix investigational therapies with established treatments. If
  the chapter says "X has been used off-label with reported benefit", that
  is investigational (`evidence_basis: "case_series"`).
