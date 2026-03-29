# SMARCC2 Reopen

Date:
- 2026-03-27

Goal:
- Re-open the remaining `SMARCC2` miss from preserved artifacts first.
- Use one narrow live DB lookup only to resolve whether the packet negatives favor truth or the outranker.

Case:
- `PMID_30580808_Lo_twin_2-Fam-52`

Sources:
- [ranked-output-audit-ranking-problem-cases-20260324.md](/Users/ahmedelmorshedy/Genovy/output/ranked-output-audit-ranking-problem-cases-20260324.md)
- [truth-missed-term-gaps-pass-1.md](/Users/ahmedelmorshedy/Genovy/output/truth-missed-term-gaps-pass-1.md)
- [truth-coverage-not-best-linked-details.json](/Users/ahmedelmorshedy/Genovy-phenotype-enrichment-20260316-0914/preservation/original-output-snapshot-20260326/truth-coverage-not-best-linked-details.json)
- [audit-ranking-pressure.md](/Users/ahmedelmorshedy/Genovy-phenotype-enrichment-20260316-0914/preservation/original-output-snapshot-20260326/audit-ranking-pressure.md)
- [PMID_30580808_Lo_twin_2-Fam-52.json](/Users/ahmedelmorshedy/Genovy-phenotype-enrichment-20260316-0914/preservation/original-output-snapshot-20260326/pheval-official-sample-100/phenopackets/PMID_30580808_Lo_twin_2-Fam-52.json)

Truth:
- gene: `SMARCC2`
- disease in packet: `OMIM:618362` `Coffin-Siris syndrome 8`

Saved benchmark position:
- Genovy full-rank truth position: `423`
- current benchmark bucket: `miss`
- Exomiser rank: `927`

Packet:
- present:
  - `Autistic behavior`
- excluded:
  - `Plagiocephaly`
  - `Microcephaly`
  - `Triangular face`
  - `Narrow forehead`
  - `Midface retrusion`
  - `Dolichocephaly`

Top outranker from the saved ranking audit:
- gene: `NLGN1`
- disease: `MONDO:0030004` `autism, susceptibility to, 20`
- rank: `1`

## Saved truth-side coverage picture

Best linked truth diseases in preserved audits:
- `MONDO:0015452` `Coffin-Siris syndrome`
  - direct phenotypes: `0`
  - propagated phenotypes: `371`
  - exact direct overlap: `0`
  - exact any-profile overlap: `1`
- `MONDO:0032702` `Coffin-Siris syndrome 8`
  - direct phenotypes: `29`
  - propagated phenotypes: `0`
  - exact direct overlap: `0`
  - exact any-profile overlap: `0`

Truth-gap audit:
- `Autistic behavior` is missing from all linked truth diseases' direct profiles
- but it is not missing from all linked truth profiles at any level

Read:
- the truth disease layer is misaligned with the packet
- `CSS8` has a real direct disease branch, but it does not speak the packet's only positive term directly
- generic `Coffin-Siris syndrome` can reach the positive term only through propagation

## Narrow live DB lookup

Scope:
- only `3` diseases and `2` genes
- only the `7` packet terms above

Disease direct lookup:
- `MONDO:0032702` `Coffin-Siris syndrome 8`
  - no direct hits on any of the `7` packet terms
- `MONDO:0015452` `Coffin-Siris syndrome`
  - no direct hits on any of the `7` packet terms
- `MONDO:0030004` `autism, susceptibility to, 20`
  - no direct hits on any of the `7` packet terms

Gene direct lookup:
- `NCBIGene:6601` `SMARCC2`
  - exact direct hit: `Autistic behavior`
  - exact direct hit on excluded term: `Microcephaly`
- `NCBIGene:22871` `NLGN1`
  - exact direct hit: `Autistic behavior`
  - no direct hits on any excluded packet term

## Clean interpretation

`SMARCC2` is not a normal undercoverage miss.

Why:
- the packet has only `1` positive term
- both truth and outranker match that positive term directly at the gene level
- the truth disease layer is weak/misaligned
- and the truth gene carries at least one excluded craniofacial term directly (`Microcephaly`)
- while the outranker does not pick up any of the excluded craniofacial baggage in the narrow live check

So the real failure mode is:
- sparse packet
- weak truth disease routing
- and negative evidence still not dominating enough

This is much closer to `SPTAN1` than to `SETD2`.

Practical implication:
- do not spend OMIM/manual enrichment cycles here first
- if revisited, it should be as:
  - negative-evidence/ranking work
  - or later ML/reranking work

## Evidence boundaries

Inspected:
- preserved phenopacket
- saved ranking-problem audit
- saved truth-gap audit
- saved truth-coverage audit
- one narrow live DB lookup on the packet's `7` terms only

Intentionally not inspected:
- no fresh heavy rerank
- no broad Railway data crawl
- no OMIM pass

Confidence:
- high
