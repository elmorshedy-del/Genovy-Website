# STXBP1 Single-Case Audit: PMID_35190816_STX_28944233_270001

## Goal
- Test a single hard STXBP1 miss with a high-information patient packet and determine why the truth gene loses.
- Compare the live truth row for `STXBP1` against the live `#1` winner on the current working graph.

## Case
- Phenopacket: `PMID_35190816_STX_28944233_270001`
- Present phenotypes: `18`
- Truth gene: `STXBP1`

## Method
- Use the live similarity index from the current working DB, not only the saved top-25 benchmark artifact.
- Rerank the single case with:
  - [auditStxbp1MissCase.js](/Users/ahmedelmorshedy/Genovy-phenotype-enrichment-20260316-0914/src/scripts/auditStxbp1MissCase.js)
- Output artifact:
  - [audit-stxbp1-missed-case-28944233-270001.json](/Users/ahmedelmorshedy/Genovy/output/audit-stxbp1-missed-case-28944233-270001.json)

## Scores

### Winner
- Gene: `RAI1`
- Rank: `1`
- Supporting disease: `MONDO:0008434` `Smith-Magenis syndrome`
- Normalized score: `0.240032`
- Direct normalized score: `0.240032`
- Disease support score: `0.222258`
- Patient average score: `3.3087314516599386`
- Phenotype average score: `1.2056005720659515`

### Truth
- Gene: `STXBP1`
- Rank: `270`
- Supporting disease: `MONDO:0100062` `genetic developmental and epileptic encephalopathy`
- Normalized score: `0.163948`
- Direct normalized score: `0.163948`
- Disease support score: `0.077722`
- Patient average score: `2.103207328220199`
- Phenotype average score: `0.9801869019040262`

## Exact-overlap comparison

### Winner support disease exact overlaps
- Count: `11`
- Direct support disease phenotype count: `134`
- High-signal overlapping patient terms include:
  - `Broad face` count `35`
  - `Pain insensitivity` count `57`
  - `Broad palm` count `67`
  - `Impulsivity` count `132`
  - plus several broader terms such as `Constipation`, `Strabismus`, and `Global developmental delay`

### Truth support disease exact overlaps
- Count: `0`
- Direct support disease phenotype count: `0`

## Patient term rarity
- This patient is not dominated only by generic neurodevelopmental terms.
- Rare or fairly specific present terms include:
  - `Broad face` count `35`
  - `Pain insensitivity` count `57`
  - `Broad palm` count `67`
  - `Bruxism` count `74`
  - `Impulsivity` count `132`
  - `Broad hallux` count `155`

## Interpretation
- This case does **not** support the simple theory that STXBP1 loses because the scorer only rewards common terms like developmental delay and seizures.
- The winner is supported by many exact matches on rare or fairly specific patient terms, not just generic ones.
- The truth row is currently being carried by a broad STXBP1 support disease that contributes no direct exact phenotype overlap for this patient.
- So the strongest failure mode in this case is:
  - poor truth support-disease selection / truth-branch fit
  - plus weaker specific phenotype explanation for this patient
- This is **not** clean evidence that propagation penalty alone is the main fix.
- It is also **not** clean evidence that information-content weighting alone would rescue STXBP1 here, because the winner already owns multiple rare exact matches.

## Practical conclusion
- For this case, `RAI1` / Smith-Magenis syndrome is a genuinely better phenotypic explanation under the current graph than the STXBP1 support disease being chosen.
- The next STXBP1 question should be:
  - does a more specific STXBP1 disease/profile exist in the graph and lose during support selection,
  - or is the needed specific STXBP1 phenotype surface still missing?

## Evidence boundaries
- Inspected:
  - one saved raw benchmark artifact for this case
  - one live single-case rerank on the working DB
  - one narrow patient-term rarity slice from the live similarity index
- Intentionally not inspected:
  - broad raw DB dumps
  - full benchmark reruns
  - broad large-data recursive scans
- Confidence:
  - high for this single-case diagnosis
