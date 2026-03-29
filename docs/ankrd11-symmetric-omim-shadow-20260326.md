# ANKRD11 Symmetric OMIM Shadow - 2026-03-26

## Scope

Shadow-only rerun on the two missed `ANKRD11` benchmark cases using manual OMIM-backed terms on both the truth disease branch and the outranker branches. No live graph mutation.

Artifacts:
- [shadowAnkrd11SymmetricOmimTerms.js](/Users/ahmedelmorshedy/Genovy-phenotype-enrichment-20260316-0914/src/scripts/shadowAnkrd11SymmetricOmimTerms.js)
- [shadow-ankrd11-symmetric-omim-terms-20260326.json](/Users/ahmedelmorshedy/Genovy-phenotype-enrichment-20260316-0914/output/shadow-ankrd11-symmetric-omim-terms-20260326.json)
- [shadow-ankrd11-symmetric-omim-terms-20260326.md](/Users/ahmedelmorshedy/Genovy-phenotype-enrichment-20260316-0914/output/shadow-ankrd11-symmetric-omim-terms-20260326.md)
- [ankrd11-manual-omim-extract-20260326.md](/Users/ahmedelmorshedy/Genovy-phenotype-enrichment-20260316-0914/docs/ankrd11-manual-omim-extract-20260326.md)

## OMIM-backed term policy

Strict structural OMIM additions only:
- `KBG syndrome`
  - `HP:0010049` `Short metacarpal`
- `brachydactyly type A1` branch
  - `HP:0005819` `Short middle phalanx of finger`
  - `HP:0010049` `Short metacarpal`

Cumulative scenario:
- adds the strict structural OMIM terms on top of the earlier symmetric source-backed shadow:
  - `KBG syndrome`
    - `Brachydactyly`
    - `Focal-onset seizure`
    - `Abnormality of the hand`
    - `Short metacarpal`
  - `familial temporal lobe epilepsy 8`
    - `Focal-onset seizure`
  - `brachydactyly type A1` branch
    - `Abnormality of the hand`
    - `Short middle phalanx of finger`
    - `Short metacarpal`

## Results

### Scenario 1: OMIM Literal Structural Terms
- `PMID_36446582_Goldenberg2016_P13`
  - truth rank: `696 -> 696`
  - winner stayed `GDF5`
- `PMID_36446582_Miyatake2017_P1`
  - truth rank: `175 -> 175`
  - winner stayed `GAL`

Interpretation:
- the new literal OMIM structural terms by themselves do essentially nothing

### Scenario 2: OMIM Cumulative With Prior Source Shadow
- `PMID_36446582_Goldenberg2016_P13`
  - truth rank: `696 -> 696`
  - winner stayed `GDF5`
- `PMID_36446582_Miyatake2017_P1`
  - truth rank: `175 -> 88`
  - winner stayed `GAL`

Interpretation:
- the cumulative OMIM-backed truth/outranker additions help the second case materially
- they still do not flip either case to the truth gene

## Read

This OMIM-backed symmetric shadow sharpens the earlier conclusion:
- `ANKRD11` is not missing because OMIM reveals a large hidden term set
- `Goldenberg2016_P13` remains a hand-focused loss where the narrow `GDF5` branch still dominates
- `Miyatake2017_P1` improves when the broad true branch is enriched further, but the narrow `GAL` seizure branch still wins

So the OMIM-backed result still points to the same structural conclusion:
- `ANKRD11` is a hybrid miss
- source-backed enrichment helps
- current scorer geometry still favors narrow sharp branches over broader true syndromes
