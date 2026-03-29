# RERE Live Symmetric Reopen - 2026-03-27

Question:
- After the saved symmetric `RERE`/`MED13` case-series additions, what does the current live direct disease surface say the two branches actually own against the packet?

Case:
- `PMID_29330883_Subject9`

Sources used:
- live direct disease-phenotype surface from the real `v1-working` DB
- saved symmetric presence-shadow artifact:
  - [shadow-rere-symmetric-case-series-terms-20260326.json](/Users/ahmedelmorshedy/Genovy-phenotype-enrichment-20260316-0914/output/shadow-rere-symmetric-case-series-terms-20260326.json)
- core truth stack:
  - `OMIM:616975`
  - `PMID:29330883`
  - `GeneReviews: RERE-Related Disorders`
- core rival stack:
  - `OMIM:618009`
  - `PMID:29740699`

Important continuity note:
- the saved single-case audit and the saved symmetric shadow baseline differ by `1` rank on `RERE`:
  - saved audit: `237`
  - saved symmetric baseline: `238`
- this reopen uses the saved symmetric artifact for the before/after rank comparison so the numbers stay internally consistent with the original shadow run

Patient packet:
- present:
  - `Anteverted nares`
  - `Wide mouth`
  - `Synophrys`
  - `Hypertelorism`
  - `Autistic behavior`
  - `Compulsive behaviors`
  - `Hypotonia`
  - `Global developmental delay`
  - `Intellectual disability`
- excluded:
  - `Cleft lip`
  - `Smooth philtrum`
  - `Low anterior hairline`
  - `Narrow forehead`
  - `Prominent forehead`
  - `Bulbous nose`
  - `Macrocephaly`
  - `Plagiocephaly`
  - `Midface retrusion`
  - `Triangular face`
  - `Broad alveolar ridges`
  - `High palate`
  - `Blepharophimosis`
  - `Frontal bossing`
  - `Broad eyebrow`
  - `Deeply set eye`
  - `Depressed nasal bridge`
  - `Prominent stem of antihelix`
  - `Hypoplastic helices`
  - `Preauricular pit`
  - `Cupped ear`
  - `Overfolded helix`
  - `Anterior creases of earlobe`
  - `Epicanthus`
  - `Micrognathia`
  - `Upslanted palpebral fissure`
  - `Downslanted palpebral fissures`
  - `Hypotelorism`
  - `Simple ear`
  - `Choanal atresia`
  - `Vesicoureteral reflux`
  - `Ptosis`
  - `Coloboma`
  - `Sensorineural hearing impairment`
  - `Scoliosis`

Saved symmetric presence additions:
- `RERE`:
  - `Synophrys`
  - `Wide mouth`
  - `Intellectual disability`
- `MED13`:
  - `Intellectual disability`
  - `Expressive language delay`
  - `Strabismus`
  - `Nystagmus`

Rank outcome from the saved symmetric artifact:

| Branch | Baseline rank | Presence-shadow rank | Baseline score | Presence-shadow score |
|---|---:|---:|---:|---:|
| `RERE` | `238` | `82` | `0.156189` | `0.172357` |
| `MED13` | `1` | `1` | `0.198770` | `0.198717` |

Current live direct disease-surface exact fit before the saved additions:

| Branch | Present exacts | Excluded contradictions |
|---|---|---|
| `RERE / MONDO:0014857` | `Anteverted nares`, `Hypertelorism`, `Autistic behavior`, `Hypotonia`, `Global developmental delay` | `Cleft lip`, `Smooth philtrum`, `Bulbous nose`, `Macrocephaly`, `Triangular face`, `Broad alveolar ridges`, `High palate`, `Blepharophimosis`, `Frontal bossing`, `Broad eyebrow`, `Deeply set eye`, `Prominent stem of antihelix`, `Preauricular pit`, `Anterior creases of earlobe`, `Epicanthus`, `Micrognathia`, `Upslanted palpebral fissure`, `Downslanted palpebral fissures`, `Hypotelorism`, `Simple ear`, `Choanal atresia`, `Vesicoureteral reflux`, `Coloboma`, `Sensorineural hearing impairment`, `Scoliosis` |
| `MED13 / MONDO:0032485` | `Wide mouth`, `Synophrys`, `Hypertelorism`, `Autistic behavior`, `Hypotonia`, `Global developmental delay` | `Smooth philtrum` |

Exact ownership before the saved additions:
- `RERE`-only present exact:
  - `Anteverted nares`
- `MED13`-only present exact:
  - `Wide mouth`
  - `Synophrys`
- shared present exact:
  - `Hypertelorism`
  - `Autistic behavior`
  - `Hypotonia`
  - `Global developmental delay`
- `Compulsive behaviors` exact on neither side:
  - `RERE` semantic fallback: `Self-injurious behavior`
  - `MED13` semantic fallback: `Attention deficit hyperactivity disorder`

Exact ownership after the saved presence additions:
- `RERE`-only present exact:
  - `Anteverted nares`
- `MED13`-only present exact:
  - none
- shared present exact:
  - `Wide mouth`
  - `Synophrys`
  - `Hypertelorism`
  - `Autistic behavior`
  - `Hypotonia`
  - `Global developmental delay`
  - `Intellectual disability`
- excluded contradictions:
  - unchanged from the current live direct surface for both branches

Read:
- the saved symmetric presence additions do recover the two major truth-side facial discriminators:
  - `Wide mouth`
  - `Synophrys`
- after that recovery, `MED13` no longer owns the key present exacts that originally separated it from `RERE`
- but `MED13` still stays rank `1`
- the strongest remaining asymmetry in the live direct disease surface is actually on excluded terms:
  - `RERE` carries a very large excluded-contradiction set
  - `MED13` carries only `Smooth philtrum`
- that means this reopen does not support a “truth branch is still missing the obvious exacts” explanation anymore
- it supports a harder conclusion:
  - exact truth-side recovery matters a lot
  - but the current scorer still does not convert that recovery into the correct winner
  - and frequency / contradiction handling remain the likely reason the case stays unresolved

Inspected:
- live narrow direct disease-phenotype rows for `RERE` and `MED13` only
- saved `RERE` audit and saved symmetric case-series shadow artifacts

Intentionally not inspected:
- no broad graph crawl
- no recursive mounted-data scan
- no second heavy full rerank over the centerbeam proxy

Operational note:
- a fresh full live rerun path was attempted through a scratch script and stalled long enough to be abandoned
- this note is based on the live direct disease surface plus the saved symmetric rank artifact, which is enough to preserve the exact ownership story cleanly
