# Unsolved Miss Bulk Reopen - 2026-03-27

Created: 2026-03-27T13:07:16.087Z
Method:
- preserved official 100-case phenopackets
- current live direct disease-phenotype surface from the real `v1-working` DB
- current live narrow direct gene-phenotype edges for the truth and top outranker only
- existing saved audit/shadow notes for per-case status

Skipped from this unresolved batch:
- PMID_33766796_16 / SETD2: already source-rescued in saved symmetric shadow (140 -> 1), so excluded from this unresolved batch.

## PMID_29330883_Subject9
- Truth: `RERE` / `neurodevelopmental disorder with or without anomalies of the brain, eye, or heart`
- Outranker: `MED13` / `intellectual developmental disorder 61`
- Exomiser rank: `3`
- Current read: Symmetric case-series presence shadow moved truth 238 -> 82, but MED13 stayed 1; now looks like frequency/contradiction handling after exact recovery.

| Surface | Truth present exact | Rival present exact | Truth excluded contradictions | Rival excluded contradictions |
|---|---|---|---|---|
| Disease direct | Anteverted nares, Hypertelorism, Autistic behavior, Hypotonia, Global developmental delay | Wide mouth, Synophrys, Hypertelorism, Autistic behavior, Hypotonia, Global developmental delay | Cleft lip, Smooth philtrum, Bulbous nose, Macrocephaly, Triangular face, Broad alveolar ridges, High palate, Blepharophimosis, Frontal bossing, Broad eyebrow, Deeply set eye, Prominent stem of antihelix, Preauricular pit, Anterior creases of earlobe, Epicanthus, Micrognathia, Upslanted palpebral fissure, Downslanted palpebral fissures, Hypotelorism, Simple ear, Choanal atresia, Vesicoureteral reflux, Coloboma, Sensorineural hearing impairment, Scoliosis | Smooth philtrum |
| Gene direct | Anteverted nares, Hypertelorism, Autistic behavior, Hypotonia, Global developmental delay, Intellectual disability | Wide mouth, Synophrys, Hypertelorism, Autistic behavior, Hypotonia, Global developmental delay | Cleft lip, Smooth philtrum, Bulbous nose, Macrocephaly, Midface retrusion, Triangular face, Broad alveolar ridges, High palate, Blepharophimosis, Frontal bossing, Broad eyebrow, Deeply set eye, Depressed nasal bridge, Prominent stem of antihelix, Preauricular pit, Anterior creases of earlobe, Epicanthus, Micrognathia, Upslanted palpebral fissure, Downslanted palpebral fissures, Hypotelorism, Simple ear, Choanal atresia, Vesicoureteral reflux, Ptosis, Coloboma, Sensorineural hearing impairment, Scoliosis | Smooth philtrum |

- Disease direct ownership, present:
  - truth-only: Anteverted nares
  - rival-only: Wide mouth, Synophrys
  - shared: Hypertelorism, Autistic behavior, Hypotonia, Global developmental delay
- Gene direct ownership, present:
  - truth-only: Anteverted nares, Intellectual disability
  - rival-only: Wide mouth, Synophrys
  - shared: Hypertelorism, Autistic behavior, Hypotonia, Global developmental delay

## PMID_30580808_Lo_twin_2-Fam-52
- Truth: `SMARCC2` / `Coffin-Siris syndrome 8`
- Outranker: `NLGN1` / `autism, susceptibility to, 20`
- Exomiser rank: `927`
- Current read: Sparse ranking plus negative-evidence case; not an enrichment-first target.

| Surface | Truth present exact | Rival present exact | Truth excluded contradictions | Rival excluded contradictions |
|---|---|---|---|---|
| Disease direct | none | Autistic behavior | none | none |
| Gene direct | Autistic behavior | Autistic behavior | Microcephaly | none |

- Disease direct ownership, present:
  - truth-only: none
  - rival-only: Autistic behavior
  - shared: none
- Gene direct ownership, present:
  - truth-only: none
  - rival-only: none
  - shared: Autistic behavior

## PMID_32376980_11
- Truth: `TRAF7` / `cardiac, facial, and digital anomalies with developmental delay`
- Outranker: `DOT1L` / `Nil-Deshwar neurodevelopmental syndrome`
- Exomiser rank: `19`
- Current read: Symmetric source pass was a null; sharp eye/feeding/hearing exacts still favor DOT1L.

| Surface | Truth present exact | Rival present exact | Truth excluded contradictions | Rival excluded contradictions |
|---|---|---|---|---|
| Disease direct | Patent ductus arteriosus, Pes planus, Short neck, Telecanthus, Short stature, Ptosis, Strabismus, Global developmental delay, Motor delay, Hypertelorism, Hypotonia, Overlapping toe | Poor suck, High palate, Amblyopia, Short stature, Ptosis, Strabismus, Global developmental delay, Conductive hearing impairment, High myopia, Hypertelorism, Retrognathia, Hypotonia, Overlapping toe | Seizure | Seizure |
| Gene direct | Patent ductus arteriosus, Pes planus, Short neck, Telecanthus, Short stature, Ptosis, Strabismus, Global developmental delay, Motor delay, Hypertelorism, Hypotonia, Overlapping toe | Poor suck, High palate, Amblyopia, Short stature, Ptosis, Strabismus, Global developmental delay, Conductive hearing impairment, High myopia, Hypertelorism, Retrognathia, Hypotonia, Overlapping toe | Seizure | Seizure |

- Disease direct ownership, present:
  - truth-only: Patent ductus arteriosus, Pes planus, Short neck, Telecanthus, Motor delay
  - rival-only: Poor suck, High palate, Amblyopia, Conductive hearing impairment, High myopia, Retrognathia
  - shared: Short stature, Ptosis, Strabismus, Global developmental delay, Hypertelorism, Hypotonia, Overlapping toe
- Gene direct ownership, present:
  - truth-only: Patent ductus arteriosus, Pes planus, Short neck, Telecanthus, Motor delay
  - rival-only: Poor suck, High palate, Amblyopia, Conductive hearing impairment, High myopia, Retrognathia
  - shared: Short stature, Ptosis, Strabismus, Global developmental delay, Hypertelorism, Hypotonia, Overlapping toe

## PMID_35190816_STX_26865513_Patient_45
- Truth: `STXBP1` / `developmental and epileptic encephalopathy, 4`
- Outranker: unavailable in saved current artifacts
- Exomiser rank: `21`
- Current read: Still undercoverage-looking; no fresh current outranker trace was recovered because the heavy live audit path failed on infrastructure capacity.

| Surface | Truth present exact | Rival present exact | Truth excluded contradictions | Rival excluded contradictions |
|---|---|---|---|---|
| Disease direct | Intellectual disability, severe, Absent speech | none | none | none |
| Gene direct | Global developmental delay, Intellectual disability, severe, EEG with abnormally slow frequencies, Absent speech | none | none | none |

- Disease direct ownership, present:
  - truth-only: Intellectual disability, severe, Absent speech
  - rival-only: none
  - shared: none
- Gene direct ownership, present:
  - truth-only: Global developmental delay, Intellectual disability, severe, EEG with abnormally slow frequencies, Absent speech
  - rival-only: none
  - shared: none

## PMID_35190816_STX_28944233_270001
- Truth: `STXBP1` / `isolated cerebellar hypoplasia/agenesis`
- Outranker: `RAI1` / `Smith-Magenis syndrome`
- Exomiser rank: `2713`
- Current read: Proven strong mimic case; branch weakness plus a genuinely strong RAI1 packet fit.

| Surface | Truth present exact | Rival present exact | Truth excluded contradictions | Rival excluded contradictions |
|---|---|---|---|---|
| Disease direct | Global developmental delay | Global developmental delay, Impulsivity, Frontal bossing, Broad face, Short nose, Depressed nasal bridge, Pain insensitivity, Gastroesophageal reflux, Constipation, Broad palm, Strabismus | none | none |
| Gene direct | Global developmental delay, Absent speech, Narrow mouth, Constipation, Strabismus | Global developmental delay, Impulsivity, Frontal bossing, Broad face, Short nose, Depressed nasal bridge, Infantile muscular hypotonia, Pain insensitivity, Gastroesophageal reflux, Constipation, Broad palm, Strabismus | none | none |

- Disease direct ownership, present:
  - truth-only: none
  - rival-only: Impulsivity, Frontal bossing, Broad face, Short nose, Depressed nasal bridge, Pain insensitivity, Gastroesophageal reflux, Constipation, Broad palm, Strabismus
  - shared: Global developmental delay
- Gene direct ownership, present:
  - truth-only: Absent speech, Narrow mouth
  - rival-only: Impulsivity, Frontal bossing, Broad face, Short nose, Depressed nasal bridge, Infantile muscular hypotonia, Pain insensitivity, Gastroesophageal reflux, Broad palm
  - shared: Global developmental delay, Constipation, Strabismus

## PMID_36331550_Family16Patient21
- Truth: `SPTAN1` / `developmental delay with or without epilepsy`
- Outranker: `ZBTB11` / `intellectual developmental disorder, autosomal recessive 69`
- Exomiser rank: `1`
- Current read: True ranking/specificity failure; tiny positive packet and weak use of negatives.

| Surface | Truth present exact | Rival present exact | Truth excluded contradictions | Rival excluded contradictions |
|---|---|---|---|---|
| Disease direct | Delayed speech and language development, Microcephaly | Delayed speech and language development, Microcephaly | Myoclonic seizure, Atonic seizure, Focal impaired awareness seizure, Generalized non-motor (absence) seizure, Bilateral tonic-clonic seizure, Infantile spasms, Febrile seizure (within the age range of 3 months to 6 years), Intellectual disability, Motor delay, Hypotonia, Lower limb hypertonia, Lower limb hyperreflexia, Lower limb muscle weakness, Attention deficit hyperactivity disorder, Ataxia, Spasticity, Strabismus, Nystagmus, Cerebellar atrophy | Hypotonia, Ataxia, Spasticity |
| Gene direct | Delayed speech and language development, Microcephaly | Delayed speech and language development, Microcephaly | Myoclonic seizure, Atonic seizure, Focal impaired awareness seizure, Generalized non-motor (absence) seizure, Bilateral tonic-clonic seizure, Infantile spasms, Febrile seizure (within the age range of 3 months to 6 years), Intellectual disability, Motor delay, Hypotonia, Lower limb hypertonia, Lower limb hyperreflexia, Lower limb muscle weakness, Attention deficit hyperactivity disorder, Ataxia, Spasticity, Strabismus, Nystagmus, Cerebellar atrophy | Hypotonia, Ataxia, Spasticity |

- Disease direct ownership, present:
  - truth-only: none
  - rival-only: none
  - shared: Delayed speech and language development, Microcephaly
- Gene direct ownership, present:
  - truth-only: none
  - rival-only: none
  - shared: Delayed speech and language development, Microcephaly

## PMID_36446582_Goldenberg2016_P13
- Truth: `ANKRD11` / `KBG syndrome`
- Outranker: `GDF5` / `brachydactyly type A1`
- Exomiser rank: `217`
- Current read: Symmetric source/OMIM shadow helped but did not rescue; still mostly truth-branch thinness.

| Surface | Truth present exact | Rival present exact | Truth excluded contradictions | Rival excluded contradictions |
|---|---|---|---|---|
| Disease direct | Short stature | Short stature | Microcephaly | none |
| Gene direct | Short stature | Short stature | Microcephaly | none |

- Disease direct ownership, present:
  - truth-only: none
  - rival-only: none
  - shared: Short stature
- Gene direct ownership, present:
  - truth-only: none
  - rival-only: none
  - shared: Short stature

## PMID_36446582_Miyatake2017_P1
- Truth: `ANKRD11` / `KBG syndrome`
- Outranker: `GAL` / `familial temporal lobe epilepsy 8`
- Exomiser rank: `1`
- Current read: Hybrid case: partial truthful lift, but narrow seizure mimic still wins.

| Surface | Truth present exact | Rival present exact | Truth excluded contradictions | Rival excluded contradictions |
|---|---|---|---|---|
| Disease direct | Intellectual disability, Global developmental delay, Short stature, Delayed skeletal maturation, Hypertelorism | none | Macrodontia, Feeding difficulties, Low anterior hairline, Synophrys, Anteverted nares | none |
| Gene direct | Intellectual disability, Global developmental delay, Short stature, Delayed skeletal maturation, Delayed speech and language development, Hypertelorism | none | Macrodontia, Feeding difficulties, Low anterior hairline, Synophrys, Anteverted nares | none |

- Disease direct ownership, present:
  - truth-only: Intellectual disability, Global developmental delay, Short stature, Delayed skeletal maturation, Hypertelorism
  - rival-only: none
  - shared: none
- Gene direct ownership, present:
  - truth-only: Intellectual disability, Global developmental delay, Short stature, Delayed skeletal maturation, Delayed speech and language development, Hypertelorism
  - rival-only: none
  - shared: none

## PMID_37156989_P1
- Truth: `SOCS1` / `autoinflammatory syndrome with immunodeficiency`
- Outranker: `CTLA4` / `autoimmune lymphoproliferative syndrome due to CTLA4 haploinsufficiency`
- Exomiser rank: `455`
- Current read: Truthful source repair lifted truth 400 -> 48, but CTLA4 still owns the sharpest inflammatory exacts.

| Surface | Truth present exact | Rival present exact | Truth excluded contradictions | Rival excluded contradictions |
|---|---|---|---|---|
| Disease direct | none | Psoriasiform dermatitis, Crohn's disease | none | none |
| Gene direct | none | Autoimmunity, Psoriasiform dermatitis, Otitis media, Sinusitis, Crohn's disease | none | none |

- Disease direct ownership, present:
  - truth-only: none
  - rival-only: Psoriasiform dermatitis, Crohn's disease
  - shared: none
- Gene direct ownership, present:
  - truth-only: none
  - rival-only: Autoimmunity, Psoriasiform dermatitis, Otitis media, Sinusitis, Crohn's disease
  - shared: none

## PMID_37761890_41
- Truth: `PPP2R1A` / `Houge-Janssens syndrome 2`
- Outranker: `HNRNPC` / `intellectual developmental disorder, autosomal dominant 74`
- Exomiser rank: `399`
- Current read: Truthful head-to-head repair improved truth 3 -> 2, but HNRNPC still wins.

| Surface | Truth present exact | Rival present exact | Truth excluded contradictions | Rival excluded contradictions |
|---|---|---|---|---|
| Disease direct | Microcephaly, Seizure, Hypoplasia of the corpus callosum | Intrauterine growth retardation, Microcephaly, Intellectual disability, moderate, Delayed speech and language development, Feeding difficulties | none | none |
| Gene direct | Microcephaly, Seizure, Hypoplasia of the corpus callosum | Intrauterine growth retardation, Microcephaly, Intellectual disability, moderate, Delayed speech and language development, Feeding difficulties | none | none |

- Disease direct ownership, present:
  - truth-only: Seizure, Hypoplasia of the corpus callosum
  - rival-only: Intrauterine growth retardation, Intellectual disability, moderate, Delayed speech and language development, Feeding difficulties
  - shared: Microcephaly
- Gene direct ownership, present:
  - truth-only: Seizure, Hypoplasia of the corpus callosum
  - rival-only: Intrauterine growth retardation, Intellectual disability, moderate, Delayed speech and language development, Feeding difficulties
  - shared: Microcephaly

## PMID_37761890_43
- Truth: `PPP2R1A` / `Houge-Janssens syndrome 2`
- Outranker: `MACF1` / `lissencephaly 9 with complex brainstem malformation`
- Exomiser rank: `39`
- Current read: Truthful head-to-head repair flipped truth 2 -> 1, but this still needs symmetric confirmation before treating it as fully solved.

| Surface | Truth present exact | Rival present exact | Truth excluded contradictions | Rival excluded contradictions |
|---|---|---|---|---|
| Disease direct | Microcephaly, Global developmental delay, Seizure, Agenesis of corpus callosum, Hypotonia | Short stature, Microcephaly, Global developmental delay, Seizure, Hypotonia, Feeding difficulties | none | none |
| Gene direct | Microcephaly, Global developmental delay, Seizure, Agenesis of corpus callosum, Hypotonia | Short stature, Microcephaly, Global developmental delay, Seizure, Hypotonia, Feeding difficulties | none | none |

- Disease direct ownership, present:
  - truth-only: Agenesis of corpus callosum
  - rival-only: Short stature, Feeding difficulties
  - shared: Microcephaly, Global developmental delay, Seizure, Hypotonia
- Gene direct ownership, present:
  - truth-only: Agenesis of corpus callosum
  - rival-only: Short stature, Feeding difficulties
  - shared: Microcephaly, Global developmental delay, Seizure, Hypotonia

## PMID_37962958_43
- Truth: `U2AF2` / `neurodevelopmental disorder with poor growth and dysmorphic facies`
- Outranker: `LRRC7` / `intellectual developmental disorder, autosomal dominant 77`
- Exomiser rank: `1374`
- Current read: Truthful symmetric source repair moved truth 959 -> 2, but LRRC7 stays 1 despite multiple exact excluded contradictions.

| Surface | Truth present exact | Rival present exact | Truth excluded contradictions | Rival excluded contradictions |
|---|---|---|---|---|
| Disease direct | Global developmental delay, Retrognathia, Low-set ears | Global developmental delay, Intellectual disability, Delayed fine motor development, Delayed ability to walk, Delayed speech and language development, Anxiety, Dystonia, Hypermetropia, Syringomyelia, Gastroesophageal reflux, Hypertelorism, Bilateral ptosis, Wide nasal bridge, Low-set ears | Autistic behavior | Feeding difficulties, Autistic behavior, Attention deficit hyperactivity disorder, Hearing impairment |
| Gene direct | none | Global developmental delay, Intellectual disability, Delayed fine motor development, Delayed ability to walk, Delayed speech and language development, Anxiety, Dystonia, Hypermetropia, Syringomyelia, Gastroesophageal reflux, Hypertelorism, Bilateral ptosis, Wide nasal bridge, Low-set ears | none | Feeding difficulties, Autistic behavior, Attention deficit hyperactivity disorder, Hearing impairment |

- Disease direct ownership, present:
  - truth-only: Retrognathia
  - rival-only: Intellectual disability, Delayed fine motor development, Delayed ability to walk, Delayed speech and language development, Anxiety, Dystonia, Hypermetropia, Syringomyelia, Gastroesophageal reflux, Hypertelorism, Bilateral ptosis, Wide nasal bridge
  - shared: Global developmental delay, Low-set ears
- Gene direct ownership, present:
  - truth-only: none
  - rival-only: Global developmental delay, Intellectual disability, Delayed fine motor development, Delayed ability to walk, Delayed speech and language development, Anxiety, Dystonia, Hypermetropia, Syringomyelia, Gastroesophageal reflux, Hypertelorism, Bilateral ptosis, Wide nasal bridge, Low-set ears
  - shared: none

## Evidence Boundaries
- Inspected: official benchmark JSON, preserved phenopackets, existing saved audit/shadow notes, live narrow direct disease/gene exact surfaces.
- Intentionally not inspected: no broad Railway data crawl, no raw mounted-data scan, no fresh heavy full reranks for the batch.
