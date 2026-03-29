# RERE Behavior Diagnostic Shadow

Date:
- 2026-03-26

Case:
- `PMID_29330883_Subject9`

Question:
- Does the `RERE` miss mainly depend on the weak wrong-side semantic fallback from `MED13 -> ADHD` for `Compulsive behaviors`?

Design:
- diagnostic only
- not source-backed curation
- do not promote these terms into the live graph

Scenarios:
- remove `MED13 -> ADHD` only
- add exact `RERE -> Compulsive behaviors` only
- do both together

Result:
- baseline:
  - `RERE` rank `237`
  - top1 `MED13`
- remove wrong side only:
  - `RERE` rank `237`
  - top1 `MED13`
- add right side only:
  - `RERE` rank `209`
  - top1 `MED13`
- do both:
  - `RERE` rank `209`
  - top1 `MED13`

Interpretation:
- the semantic complaint is real:
  - `Self-injurious behavior` is a more defensible proxy for `Compulsive behaviors` than `ADHD`
- but it is not the main thing deciding the case
- removing the weak `MED13` fallback did not materially hurt the outranker
- adding exact `Compulsive behaviors` to the `RERE` branch only helped a little

Conclusion:
- `Compulsive behaviors` is not the key rescue lever for `RERE`
- the larger remaining pressure still comes from:
  - the sharper facial exacts on the `MED13` branch
  - broader scorer geometry

Files:
- script:
  - [shadowRereBehaviorDiagnostic.js](/Users/ahmedelmorshedy/Genovy-phenotype-enrichment-20260316-0914/src/scripts/shadowRereBehaviorDiagnostic.js)
- outputs:
  - [shadow-rere-behavior-diagnostic-20260326.json](/Users/ahmedelmorshedy/Genovy-phenotype-enrichment-20260316-0914/output/shadow-rere-behavior-diagnostic-20260326.json)
  - [shadow-rere-behavior-diagnostic-20260326.md](/Users/ahmedelmorshedy/Genovy-phenotype-enrichment-20260316-0914/output/shadow-rere-behavior-diagnostic-20260326.md)
