# STXBP1 Discriminating-Term Shadow Test

## Goal
- Test the consultant hypothesis directly on one hard STXBP1 miss:
  - add only the rare/discriminating terms that matter for `PMID_35190816_STX_28944233_270001`
  - rerank in shadow
  - determine whether `STXBP1` can actually move

## Case
- Phenopacket: `PMID_35190816_STX_28944233_270001`
- Truth gene: `STXBP1`
- Target disease: `MONDO:0012812` `developmental and epileptic encephalopathy, 4`

## Terms added in shadow
- `HP:0000283` `Broad face`
- `HP:0007021` `Pain insensitivity`
- `HP:0001169` `Broad palm`
- `HP:0100710` `Impulsivity`

Artifact:
- [shadow-stxbp1-discriminating-case-20260325.json](/Users/ahmedelmorshedy/Genovy/output/shadow-stxbp1-discriminating-case-20260325.json)
- Script:
  - [shadowStxbp1DiscriminatingCase.js](/Users/ahmedelmorshedy/Genovy-phenotype-enrichment-20260316-0914/src/scripts/shadowStxbp1DiscriminatingCase.js)

## Result

### DEE4 disease score
- Baseline:
  - rank `5253`
  - normalized score `0.076491`
  - direct phenotype count `27`
- Shadow:
  - rank `95`
  - normalized score `0.186806`
  - direct phenotype count `31`

So the targeted discriminating-term enrichment **does help DEE4 a lot**.

### STXBP1 gene score
- Baseline live truth gene score:
  - `0.163948`
- Baseline direct gene score:
  - `0.163948`
- Shadow-derived DEE4 disease-support score:
  - `0.127028`
- Inferred shadow STXBP1 gene score:
  - `0.163948`

### Bottom line
- `DEE4` improves massively as a disease explanation for this patient.
- But `STXBP1` still does **not** move, because the new DEE4-derived support score stays below the existing direct STXBP1 gene score.

## Interpretation
- This means the earlier “enrichment does nothing” conclusion was too blunt.
- The targeted discriminating enrichment **does work at the disease level**.
- But for this case, it still does not propagate into a better gene rank because:
  - the DEE4 gene-disease support weight is weak enough that the improved disease score still does not beat the existing direct STXBP1 gene score

## Practical conclusion
- The consultant’s correction was partly right:
  - discriminating enrichment matters more than generic enrichment
- But there is still a second bottleneck:
  - disease improvement alone is not enough if the gene-level aggregation/support weighting prevents that disease improvement from surfacing in the final gene score

So for this patient, the real picture is:
- targeted enrichment helps
- but support aggregation / weighting still blocks the gene from benefiting

## Evidence boundaries
- Inspected:
  - one live single-case shadow disease rerank
  - one saved live truth-gene audit artifact
- Intentionally not inspected:
  - broad benchmark reruns
  - large raw DB exports
  - recursive scans of mounted data
- Confidence:
  - high for this patient and this targeted 4-term STXBP1 shadow test
