# RERE Symmetric OMIM Shadow - 2026-03-26

Artifacts:
- [shadow-rere-symmetric-omim-terms-20260326.json](/Users/ahmedelmorshedy/Genovy-phenotype-enrichment-20260316-0914/output/shadow-rere-symmetric-omim-terms-20260326.json)
- [shadow-rere-symmetric-omim-terms-20260326.md](/Users/ahmedelmorshedy/Genovy-phenotype-enrichment-20260316-0914/output/shadow-rere-symmetric-omim-terms-20260326.md)
- [rere-manual-omim-extract-20260326.md](/Users/ahmedelmorshedy/Genovy-phenotype-enrichment-20260316-0914/docs/rere-manual-omim-extract-20260326.md)

Question:
- If we add strict manual OMIM-backed terms symmetrically to both the true `RERE` disease branch and the outranking `MED13` disease branch, does the current scorer finally move toward the truth?

Case:
- `PMID_29330883_Subject9`

Result:
- truth rank: `237 -> 237`
- top1 winner: `MED13 -> MED13`
- `0` improvement

What was actually added:
- only `3` new terms total, all on the `MED13` outranker branch:
  - `Strabismus`
  - `Nystagmus`
  - `Expressive language delay`

What was already present and therefore skipped:
- `RERE` truth branch:
  - `Broad eyebrow`
  - `Downslanted palpebral fissures`
  - `Micrognathia`
  - `Short stature`
- `MED13` outranker branch:
  - `Synophrys`
  - `Wide mouth`
  - `Attention deficit hyperactivity disorder`
  - `Speech apraxia`

Interpretation:
- this is a strong negative result for a strict OMIM-only rescue
- the key exact outranking terms were **already** canonically present on `MED13`
- the truth branch got **no new direct OMIM exact terms** that matter for this patient
- so the current result is not caused by us failing to read OMIM carefully enough

Working conclusion:
- `RERE` is not an OMIM-hidden-term miss in the way a simple enrichment story would suggest
- if `RERE` is going to improve from source repair, it likely needs:
  - broader canonical source inspection beyond OMIM alone
  - or later ML-based handling of broad-truth vs narrow-sharp branch geometry
