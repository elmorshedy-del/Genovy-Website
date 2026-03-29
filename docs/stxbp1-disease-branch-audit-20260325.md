# STXBP1 Disease-Branch Audit: DEE4 vs Umbrella

## Goal
- Determine whether the STXBP1 miss for `PMID_35190816_STX_28944233_270001` is mainly:
  - a missing-feature problem on the specific STXBP1 disease branch, or
  - a support-selection leak where the umbrella branch is incorrectly beating a specific branch that already has the right features.

## Checks run

### Check 1
- For all `STXBP1`-linked diseases in the current working graph, inspect direct and propagated presence of:
  - `HP:0000283` `Broad face`
  - `HP:0007021` `Pain insensitivity`
  - `HP:0001169` `Broad palm`
  - `HP:0100710` `Impulsivity`

### Check 2
- For patient `PMID_35190816_STX_28944233_270001`, compare disease-only scores for:
  - `MONDO:0012812` `developmental and epileptic encephalopathy, 4` (`DEE4`)
  - `MONDO:0100062` `genetic developmental and epileptic encephalopathy` (umbrella)

Artifact:
- [audit-stxbp1-disease-branch-selection-20260325.json](/Users/ahmedelmorshedy/Genovy/output/audit-stxbp1-disease-branch-selection-20260325.json)
- Script:
  - [auditStxbp1DiseaseBranchSelection.js](/Users/ahmedelmorshedy/Genovy-phenotype-enrichment-20260316-0914/src/scripts/auditStxbp1DiseaseBranchSelection.js)

## Check 1 result

Across all currently linked STXBP1 diseases:
- **none** of the four tested phenotypes appear as **direct** terms on any STXBP1-linked disease
- `DEE4` (`MONDO:0012812`) has **none** of the four terms, direct or propagated

Observed propagated-only appearances:
- `MONDO:0100062` `genetic developmental and epileptic encephalopathy`
  - `Broad face`
  - `Impulsivity`
- `MONDO:0005258` `autism spectrum disorder`
  - `Pain insensitivity`
  - `Impulsivity`

No STXBP1-linked disease currently carries:
- direct `Broad face`
- direct `Pain insensitivity`
- direct `Broad palm`
- direct `Impulsivity`

## Check 2 result

### DEE4
- Disease: `MONDO:0012812` `developmental and epileptic encephalopathy, 4`
- Disease rank for this patient: `5247`
- Normalized score: `0.076491`
- Patient average score: `0.665760016525597`
- Phenotype average score: `0.7728139488838445`
- Direct phenotype count: `27`
- Propagated phenotype count: `0`
- Exact direct overlaps: `1`
  - `Absent speech`

### Umbrella
- Disease: `MONDO:0100062` `genetic developmental and epileptic encephalopathy`
- Disease rank for this patient: `7`
- Normalized score: `0.227175`
- Patient average score: `3.423199408255687`
- Phenotype average score: `0.8493216641100655`
- Direct phenotype count: `0`
- Propagated phenotype count: `786`
- Exact direct overlaps: `0`
- But many propagated matches, including:
  - exact `Broad face`
  - exact `Impulsivity`
  - exact `Floppy infant`
  - exact `Tapered finger`
  - exact `Narrow mouth`
  - exact `Aggressive behavior`
  - exact `Short nose`
  - exact `Gastroesophageal reflux`
  - exact `Absent speech`
  - exact `Frontal bossing`
  - exact `Depressed nasal bridge`
  - plus near matches for `Pain insensitivity`, `Broad palm`, `Broad hallux`, `Bruxism`, `Strabismus`, and `Global developmental delay`

## Interpretation
- This is **not** the pattern “DEE4 already has the discriminating terms, but the umbrella still wins.”
- Instead, the specific STXBP1 branch is missing the discriminating terms almost completely.
- `DEE4` is not close to competitive in this patient:
  - only `1` exact direct overlap
  - very low normalized score
  - rank `5247`
- The umbrella wins because it accumulates many propagated phenotype matches that DEE4 does not currently have.

## Practical conclusion
- For this STXBP1 case, the strongest diagnosis is:
  - **missing specific STXBP1 phenotype surface on DEE4**
  - with the umbrella branch compensating through large propagated coverage
- So this audit supports:
  - enrichment/profile repair on the specific STXBP1 disease branch
- It does **not** support the narrower hypothesis:
  - “DEE4 already has the right features and support selection alone is the leak”

## Evidence boundaries
- Inspected:
  - live working DB similarity index
  - one patient phenopacket
  - one exact STXBP1-linked disease slice
- Intentionally not inspected:
  - broad raw DB exports
  - full benchmark reruns
  - recursive scans of large data
- Confidence:
  - high for this patient and these tested STXBP1 disease branches
