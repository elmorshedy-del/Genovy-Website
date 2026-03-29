# SOCS1 Symmetric Source Shadow

Date:
- 2026-03-26

Case:
- `PMID_37156989_P1`

Truth:
- gene: `SOCS1`
- disease: `autoinflammatory syndrome with immunodeficiency`

Outranker:
- gene: `CTLA4`
- disease: `autoimmune lymphoproliferative syndrome due to CTLA4 haploinsufficiency`

Question:
- If we add only the narrow exact source-backed disease terms that `OMIM` and the core syndrome papers literally support for `SOCS1`, plus the matching missing literal term on `CTLA4`, does the truth branch materially lift?

Evidence surface:
- manual `OMIM` browser pass:
  - `OMIM:619375` for `SOCS1`
  - `OMIM:616100` for `CTLA4`
- cited `SOCS1` case series in `OMIM`:
  - `Lee et al. 2020`
- live real `v1-working` DB shadow run

Scenario:
- literal source-backed disease terms only
- `SOCS1` target terms:
  - `Autoimmunity`
  - `Otitis media`
  - `Chronic colitis`
  - `Eczematoid dermatitis`
- `CTLA4` target terms:
  - `Autoimmunity`

Result:
- added terms: `5`
- skipped existing terms: `0`
- new truth-side exact additions:
  - `Autoimmunity`
  - `Otitis media`
  - `Chronic colitis`
  - `Eczematoid dermatitis`
- new outranker-side exact additions:
  - `Autoimmunity`
- `SOCS1` rank:
  - `400 -> 48`
- `CTLA4` stayed top1

Interpretation:
- this is a real source-backed rescue, but not a full rescue
- `SOCS1` was badly undercovered on the literal disease surface
- once the truth branch gained exact immune, ENT, gut, and eczema-family support, it jumped from the deep tail into visible range
- `CTLA4` still wins because it keeps the strongest sharp packet exacts:
  - `Crohn's disease`
  - `Psoriasiform dermatitis`
  - `Sinusitis`
- so this case is now cleaner:
  - `SOCS1` had a true source-gap
  - but `CTLA4` is still a strong mimic under the current scorer

Why this matters:
- unlike `TRAF7`, this was not a null source test
- unlike `SETD2`, it was not enough to flip top1
- this puts `SOCS1` in the middle bucket:
  - real source-gap
  - plus remaining scorer / mimic pressure

Files:
- script:
  - [shadowSocs1SymmetricSourceTerms.js](/Users/ahmedelmorshedy/Genovy-phenotype-enrichment-20260316-0914/src/scripts/shadowSocs1SymmetricSourceTerms.js)
- outputs:
  - [shadow-socs1-symmetric-source-terms-20260326.json](/Users/ahmedelmorshedy/Genovy-phenotype-enrichment-20260316-0914/output/shadow-socs1-symmetric-source-terms-20260326.json)
  - [shadow-socs1-symmetric-source-terms-20260326.md](/Users/ahmedelmorshedy/Genovy-phenotype-enrichment-20260316-0914/output/shadow-socs1-symmetric-source-terms-20260326.md)
