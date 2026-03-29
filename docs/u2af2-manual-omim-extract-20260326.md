# U2AF2 Manual OMIM Extract

Created:
- 2026-03-26

Entries inspected manually in-browser:
- `191318` gene entry
- `620535` phenotype entry

Evidence surface:
- [OMIM gene entry 191318](https://www.omim.org/entry/191318)
- [OMIM phenotype entry 620535](https://www.omim.org/entry/620535)

Intentionally not inspected:
- OMIM API/download files
- GeneReviews
- graph mutation

## What OMIM clearly supports for DEVDFB

High-confidence syndrome-level features explicitly stated in the phenotype entry:
- global developmental delay
- impaired intellectual development
- speech delay
- hypotonia
- impaired overall growth / poor growth
- small head circumference / microcephaly
- early-onset seizures, variable severity
- hypoplasia of the corpus callosum
- delayed myelination

Case-level features explicitly described in OMIM clinical features text:
- walked at 21 months
- febrile seizures, later afebrile seizures
- pes planus
- broad eyebrows
- smooth philtrum
- dental crowding / dental anomalies
- ptosis
- exotropia
- small low-set ears
- cleft palate
- mandibular protrusion / prognathism / underbite
- poor communication skills
- poor feeding
- laryngomalacia with obstructive sleep apnea
- short palpebral fissures
- short nose
- finger flexion contractures
- recurrent upper respiratory infections
- asthma
- gastroesophageal reflux
- vertical nystagmus
- absent speech
- choreic involuntary movements
- ballismus
- limb hypertonia
- long / upslanting palpebral fissures
- depressed nasal bridge
- prominent nasal alae
- prominent philtrum
- small mouth
- retrognathia

## Immediate implications

1. OMIM confirms the earlier public-source conclusion:
- `PMID_37962958_43` really is undercovered by the current graph surface

2. OMIM also strengthens the idea that some previously "weakly sourced" terms are now promotable into shadow, including:
- `Gastroesophageal reflux`
- `Short palpebral fissure`
- `Ptosis`
- `Poor feeding` / feeding difficulties family
- `Small low-set ears`
- `Poor growth`

3. OMIM does **not** change the main negative result yet:
- we still have not repaired the `U2AF2 -> disease` seam
- so OMIM-backed enrichment should still remain shadow-only until that seam issue is addressed

## Status
- active source note
