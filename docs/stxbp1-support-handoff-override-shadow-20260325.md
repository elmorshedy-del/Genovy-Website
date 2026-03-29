# STXBP1 Support-Handoff Override Shadow

## Goal
- Test the next March 25 hypothesis directly after the discriminating-term shadow:
  - keep the 4-term `DEE4` enrichment fixed
  - do not change disease ranking again
  - only shadow the disease-to-gene handoff
  - determine whether a narrow floor override on the specific direct disease would finally move `STXBP1`

## Source artifact
- [shadow-stxbp1-discriminating-case-20260325.json](/Users/ahmedelmorshedy/Genovy/output/shadow-stxbp1-discriminating-case-20260325.json)

## Script
- [shadowStxbp1SupportHandoffOverride.js](/Users/ahmedelmorshedy/Genovy-phenotype-enrichment-20260316-0914/src/scripts/shadowStxbp1SupportHandoffOverride.js)

## Case
- Phenopacket: `PMID_35190816_STX_28944233_270001`
- Truth gene: `STXBP1`
- Specific disease branch: `MONDO:0012812` `developmental and epileptic encephalopathy, 4`

## Baseline carried forward from the discriminating-term shadow
- Enriched `DEE4` disease score:
  - `0.186806`
- Support evidence weight:
  - `1.0`
- Current gene-disease support weight:
  - `0.68`
- Current handoff score:
  - `0.127028`
- Existing direct `STXBP1` gene score:
  - `0.163948`

So under the current scorer:
- the enriched specific disease is stronger than before
- but it still loses at gene level because `0.127028 < 0.163948`

## Threshold result
- Minimum support weight required to beat the existing direct `STXBP1` gene score:
  - `0.877638`

## Shadow scenarios
- `0.68`:
  - handoff `0.127028`
  - final gene score unchanged
- `0.80`:
  - handoff `0.149445`
  - final gene score unchanged
- `0.85`:
  - handoff `0.158785`
  - final gene score unchanged
- `0.90`:
  - handoff `0.168125`
  - final gene score changes
- `1.00`:
  - handoff `0.186806`
  - final gene score changes

## Narrow override test
- Policy tested in shadow:
  - if a specific direct disease has exact direct overlaps after enrichment, raise its disease-to-gene handoff weight to at least `0.9`
- Result:
  - `STXBP1` gene score moves from `0.163948` to `0.168125`

## Interpretation
- This confirms the main leak is now in the disease-to-gene handoff, not in disease-level semantic matching.
- The discriminating enrichment already made `DEE4` strong enough.
- What prevents `STXBP1` from benefiting is the current `0.68` handoff weight.
- A narrow floor override at `0.9` is sufficient to let the improved specific branch beat the existing direct `STXBP1` gene score.

## Practical conclusion
- `STXBP1` is no longer best described as “enrichment alone failed.”
- The sharper sequence is:
  - broad generic enrichment failed
  - targeted discriminating enrichment succeeded at disease level
  - gene-level handoff still suppressed the gain
  - a narrow support-handoff override is enough to surface the gain

## Evidence boundaries
- Inspected:
  - March 25 discriminating-term shadow artifact
  - the current `similarityEngine` handoff formula
  - repo-side shadow script for handoff override
- Intentionally not inspected:
  - no fresh benchmark rerun
  - no broad DB crawl
  - no scorer change in production logic
- Confidence:
  - high for this single STXBP1 case and this specific handoff-leak diagnosis
