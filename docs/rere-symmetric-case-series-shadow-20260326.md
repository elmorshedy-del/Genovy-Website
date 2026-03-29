# RERE Symmetric Case-Series Shadow - 2026-03-26

Question:
- If we add richer source-backed terms symmetrically to both the true `RERE` branch and the outranking `MED13` branch, does the current scorer finally move toward the truth?

Case:
- `PMID_29330883_Subject9`

| Scenario | Terms Added To RERE | Terms Added To MED13 | RERE Rank | MED13 Rank | Read |
|---|---|---|---:|---:|---|
| Baseline | none | none | 238 | 1 | Truth loses sharply. |
| Case-series presence | `Synophrys`, `Wide mouth`, `Intellectual disability` | `Intellectual disability`, `Expressive language delay`, `Strabismus`, `Nystagmus` | 82 | 1 | Real truth-side improvement, but not rescue. |
| Case-series + frequency | same terms, with RERE facial terms marked `Occasional (5-29%)` and MED13 `Intellectual disability` marked `Obligate (100%)` | same | 230 | 1 | Frequency weighting almost cancels the truth-side gain. |

Main result:
- Symmetric richer-source additions do move `RERE` materially when treated as plain present terms: `238 -> 82`.
- The improvement comes from the truth branch finally gaining the exact discriminators OMIM missed: `Synophrys` and `Wide mouth`.
- But the current scorer still keeps `MED13` at rank `1`.
- When frequency buckets are added, the gain mostly disappears: `238 -> 230`.

Interpretation:
- Exact truth-side recovery matters a lot.
- Frequency also matters in the current scorer, but here it hurts `RERE` because the recovered facial terms are source-backed as occasional rather than common.
- This is strong evidence that the remaining `RERE` miss is not just "missing terms" and not just "scorer geometry"; it is the interaction of both.
