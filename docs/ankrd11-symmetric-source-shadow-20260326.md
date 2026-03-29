# ANKRD11 Symmetric Source Shadow 2026-03-26

Goal:
- test the user's stricter idea before changing scoring again:
  - inspect both the true disease and the outranker disease
  - add only source-backed missing terms symmetrically
  - rerun in shadow and see whether the existing scorer picks the true gene

Target cases:
- `PMID_36446582_Goldenberg2016_P13`
- `PMID_36446582_Miyatake2017_P1`

True branch:
- gene: `ANKRD11`
- disease: `KBG syndrome` (`MONDO:0007846`)

Outrankers:
- `GDF5` via `brachydactyly type A1` (`MONDO:0007215`) for `Goldenberg2016_P13`
- `GAL` via `familial temporal lobe epilepsy 8` (`MONDO:0014650`) for `Miyatake2017_P1`

Evidence surfaces used:
- live direct disease phenotype rows from the real `v1-working` DB
- `KBG syndrome` GeneReviews summary and clinical characteristics
- `Epilepsy in KBG Syndrome: Report of Additional Cases` abstract
- MedGen / MONDO description for `familial temporal lobe epilepsy 8`
- existing HPO disease phenotype assertions for `brachydactyly type A1`

Intentionally not inspected:
- raw source dumps
- broad mounted data exports
- any live graph mutation

## Scenario A: Strict Literal Source Terms

Shadow additions:
- `KBG syndrome`
  - `HP:0001156` `Brachydactyly`
  - `HP:0007359` `Focal-onset seizure`
- `familial temporal lobe epilepsy 8`
  - `HP:0007359` `Focal-onset seizure`

Result:
- `PMID_36446582_Goldenberg2016_P13`
  - `ANKRD11` rank `395 -> 368`
  - winner stayed `GDF5`
- `PMID_36446582_Miyatake2017_P1`
  - `ANKRD11` rank `176 -> 128`
  - winner stayed `GAL`

## Scenario B: Symmetric Parent Promotion

Start from Scenario A, then add:
- `KBG syndrome`
  - `HP:0001155` `Abnormality of the hand`
- `brachydactyly type A1`
  - `HP:0001155` `Abnormality of the hand`

Rationale:
- both diseases already carry multiple direct hand-specific anomalies in the live curated profile
- this was kept symmetric rather than truth-only

Result:
- `PMID_36446582_Goldenberg2016_P13`
  - `ANKRD11` rank `395 -> 312`
  - winner stayed `GDF5`
- `PMID_36446582_Miyatake2017_P1`
  - `ANKRD11` rank `176 -> 112`
  - winner stayed `GAL`

## Read

- The user's symmetric-source idea is directionally right:
  - both ANKRD11 misses improved without touching the scorer
- But the current scorer still does not pick the truth branch even after symmetric additions
- So for `ANKRD11`, the remaining problem is not only missing terms
- It is also the same broader geometry problem already suspected:
  - broad true syndrome
  - narrow sharp outranker
  - current scorer still favors the sharper disease too much

Artifacts:
- [shadow-ankrd11-symmetric-source-terms-20260326.json](/Users/ahmedelmorshedy/Genovy-phenotype-enrichment-20260316-0914/output/shadow-ankrd11-symmetric-source-terms-20260326.json)
- [shadow-ankrd11-symmetric-source-terms-20260326.md](/Users/ahmedelmorshedy/Genovy-phenotype-enrichment-20260316-0914/output/shadow-ankrd11-symmetric-source-terms-20260326.md)
- [audit-ankrd11-goldenberg2016-p13-20260326.json](/Users/ahmedelmorshedy/Genovy-phenotype-enrichment-20260316-0914/output/audit-ankrd11-goldenberg2016-p13-20260326.json)
- [audit-ankrd11-miyatake2017-p1-20260326.json](/Users/ahmedelmorshedy/Genovy-phenotype-enrichment-20260316-0914/output/audit-ankrd11-miyatake2017-p1-20260326.json)
