# Miss Tail Triage: RERE, TRAF7, SETD2

Created:
- 2026-03-26

Scope:
- real Railway `genovy-v1-working-20260322`
- case-level single-miss audits for:
  - `RERE`
  - `TRAF7`
  - `SETD2`

Artifacts:
- [/Users/ahmedelmorshedy/Genovy-phenotype-enrichment-20260316-0914/output/audit-rere-subject9-20260326.json](/Users/ahmedelmorshedy/Genovy-phenotype-enrichment-20260316-0914/output/audit-rere-subject9-20260326.json)
- [/Users/ahmedelmorshedy/Genovy-phenotype-enrichment-20260316-0914/output/audit-traf7-11-20260326.json](/Users/ahmedelmorshedy/Genovy-phenotype-enrichment-20260316-0914/output/audit-traf7-11-20260326.json)
- [/Users/ahmedelmorshedy/Genovy-phenotype-enrichment-20260316-0914/output/audit-setd2-16-20260326.json](/Users/ahmedelmorshedy/Genovy-phenotype-enrichment-20260316-0914/output/audit-setd2-16-20260326.json)

## RERE

Case:
- `PMID_29330883_Subject9`

Truth:
- gene: `RERE`
- disease: `neurodevelopmental disorder with or without anomalies of the brain, eye, or heart`
- truth rank: `237`

Winner:
- gene: `MED13`
- disease: `intellectual developmental disorder 61`
- winner rank: `1`

Read:
- `MED13` wins on sharper exact facial and behavioral terms:
  - `Synophrys`
  - `Wide mouth`
  - `Autistic behavior`
  - plus other exact overlaps
- `RERE` is broad and real, but still lacks direct exact coverage for some of the highest-value terms in this packet
- this is not a pure scorer bug
- it is a mixed case:
  - broad true syndrome
  - outranker with stronger canonical exact facial/behavioral support

## TRAF7

Case:
- `PMID_32376980_11`

Truth:
- gene: `TRAF7`
- disease: `cardiac, facial, and digital anomalies with developmental delay`
- truth rank: `145`

Winner:
- gene: `DOT1L`
- disease: `Nil-Deshwar neurodevelopmental syndrome`
- winner rank: `1`

Read:
- `TRAF7` already has strong truth-side support with `12` exact overlaps
- but `DOT1L` wins with `13` exact overlaps and a sharper direct profile
- the exact differentiators match the older gap note:
  - `High myopia`
  - `Poor suck`
  - `Narrow palpebral fissure`
- this is the cleanest undercoverage case of the three

## SETD2

Case:
- `PMID_33766796_16`

Truth:
- gene: `SETD2`
- disease: `Luscan-Lumish syndrome`
- truth rank: `140`

Winner:
- gene: `TCF20`
- disease: `developmental delay with variable intellectual impairment and behavioral abnormalities`
- winner rank: `1`

Read:
- `TCF20` wins with exact direct support for the most discriminating terms:
  - `Accelerated skeletal maturation`
  - `Aggressive behavior`
  - `Macrocephaly`
  - `Motor delay`
  - `Delayed speech and language development`
- `SETD2` still misses the strongest exact support on:
  - `Accelerated skeletal maturation`
  - `Motor delay`
- this again fits the older undercoverage bucket

## Emerging Pattern

The pattern is becoming clearer:

1. Broad true syndromes are not empty.
2. Many remaining misses still have real truth-side support.
3. The outranker often wins because it has a few high-value exact direct terms that the broad true syndrome is still missing.
4. The current scorer then amplifies that advantage because narrower direct profiles keep a higher disease-side average.

So the remaining tail is not one thing:

- `RERE`:
  - mixed broad-truth plus stronger exact facial/behavior terms on the outranker
- `TRAF7`:
  - mostly undercoverage
- `SETD2`:
  - mostly undercoverage

## Working conclusion

This does support a global scoring suspicion, but only partially.

The current scorer does seem to over-reward narrow sharp branches once they have a small set of exact direct hits.

But the case work also keeps showing that many broad truth syndromes really are still missing exact direct terms that matter.

So the honest next principle remains:
- source-backed disease-profile repair first
- then let a later learned ranker solve the harder coverage-versus-sharpness tradeoff
