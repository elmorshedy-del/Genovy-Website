# STXBP1 Case-Slice Handoff Floor Shadow

## Goal
- Test the next scorer-side step after the single-case handoff result:
  - keep the same `4` discriminating `DEE4` terms
  - keep the narrow `0.9` handoff floor for the specific direct `DEE4` branch
  - rerun only the `STXBP1` benchmark cases
  - determine whether the single-case handoff win actually changes the STXBP1 family slice

## Scripts and artifacts
- Script:
  - [shadowStxbp1CaseSliceHandoffFloor.js](/Users/ahmedelmorshedy/Genovy-phenotype-enrichment-20260316-0914/src/scripts/shadowStxbp1CaseSliceHandoffFloor.js)
- Benchmark-comparable run (`limit=100`):
  - [shadow-stxbp1-case-slice-handoff-floor-20260325-limit100.json](/Users/ahmedelmorshedy/Genovy/output/shadow-stxbp1-case-slice-handoff-floor-20260325-limit100.json)
  - [shadow-stxbp1-case-slice-handoff-floor-20260325-limit100.md](/Users/ahmedelmorshedy/Genovy/output/shadow-stxbp1-case-slice-handoff-floor-20260325-limit100.md)
- Full-rank diagnostic run (`limit=500`):
  - [shadow-stxbp1-case-slice-handoff-floor-20260325.json](/Users/ahmedelmorshedy/Genovy/output/shadow-stxbp1-case-slice-handoff-floor-20260325.json)
  - [shadow-stxbp1-case-slice-handoff-floor-20260325.md](/Users/ahmedelmorshedy/Genovy/output/shadow-stxbp1-case-slice-handoff-floor-20260325.md)

## Policy tested
- Add the same `4` discriminating terms to `DEE4` in shadow:
  - `Broad face`
  - `Pain insensitivity`
  - `Broad palm`
  - `Impulsivity`
- Then apply a narrow scorer-side floor:
  - if the `DEE4` branch has direct exact overlaps, raise the disease-to-gene handoff weight from `0.68` to `0.9`

## Benchmark-comparable result (`limit=100`)
- Cases:
  - `10` STXBP1 truth-gene benchmark cases
- Baseline:
  - `6 / 10` found
  - `top-10 = 1`
  - `MRR = 0.024438`
- Shadow:
  - `6 / 10` found
  - `top-10 = 1`
  - `MRR = 0.024438`
- Delta:
  - `0` improved
  - `0` worsened
  - `10` unchanged

So under the same top-100 benchmark convention used in the earlier STXBP1 shadow benchmark, the handoff floor does **not** produce a visible benchmark gain.

## Full-rank diagnostic result (`limit=500`)
- Baseline:
  - all `10` STXBP1 cases are visible
  - `MRR = 0.026578`
- Shadow:
  - all `10` still visible
  - `MRR = 0.026688`
- Delta:
  - `2` improved
  - `0` worsened

The two actual rank improvements were:
- `PMID_35190816_STX_27159321_LD_0358`
  - `153 -> 152`
- `PMID_35190816_STX_28944233_270001`
  - `267 -> 208`

## Interpretation
- The single-case handoff diagnosis was real.
- The `0.9` floor is enough to help the hard March 25 STXBP1 case numerically.
- But when rerun across the STXBP1 family, that gain is still too small to change the benchmark-visible slice.

So the sharper read is:
- disease-level enrichment helps
- handoff suppression is a real second leak
- but `4` added terms plus a `0.9` handoff floor are still **not sufficient** to rescue STXBP1 at the top-100 benchmark level

## Practical conclusion
- This is still a useful positive result, but it is not yet a ship signal.
- It means:
  - the handoff floor was a real bottleneck
  - removing that bottleneck alone is not enough
- The next STXBP1 lever now looks like:
  - either richer discriminating branch enrichment than the current `4` terms
  - or a stronger gene-level aggregation change than a narrow floor override

## Evidence boundaries
- Inspected:
  - live graph rerun against the STXBP1 case family
  - benchmark-comparable top-100 slice
  - deeper top-500 diagnostic slice
- Intentionally not inspected:
  - full 100-case benchmark rerun
  - non-STXBP1 truth genes
  - broader scorer patches beyond the narrow floor rule
- Confidence:
  - high for the STXBP1 slice under this exact `4-term + 0.9 floor` shadow configuration
