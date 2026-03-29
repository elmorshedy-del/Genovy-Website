# ANKRD11 Manual OMIM Extract (Truth and Outrankers) - 2026-03-26

## Scope

Manual browser extraction only. No live graph mutation.

OMIM entries inspected:
- `148050` `KBG syndrome`
- `615072` `Brachydactyly, type A1, C`
- `616461` `Epilepsy, familial temporal lobe, 8`

Important correction:
- The actual hand-focused outranker in the current `ANKRD11` miss audit is `GDF5`, not the classical `IHH` BDA1 entry.
- For that reason, the relevant OMIM comparison is `615072 BDA1C`, not only `112500 BDA1`.

## Truth Disease: KBG Syndrome (`OMIM:148050`)

OMIM confirms the broad syndrome picture already seen in Genovy:
- global developmental delay
- intellectual disability
- seizures
- short stature
- delayed bone maturation
- hypertelorism
- hand anomalies
- brachydactyly / short hands / clinodactyly

Additional syndrome-wide findings in OMIM text include:
- wide eyebrows / bushy eyebrows
- long/prominent philtrum
- large/prominent ears
- behavioral problems / hyperactivity / anxiety / poor concentration
- recurrent respiratory infections
- feeding difficulties
- palatal anomalies with secondary speech disorder

Case relevance:
- `PMID_36446582_Goldenberg2016_P13`
  - OMIM clearly supports a general hand-anomaly / brachydactyly branch for KBG syndrome.
- `PMID_36446582_Miyatake2017_P1`
  - OMIM clearly supports delayed bone age, short stature, developmental delay, intellectual disability, seizures, hypertelorism, and hand anomalies.

## Outranker 1: Brachydactyly, Type A1, C (`OMIM:615072`)

Gene:
- `GDF5`

OMIM-supported core features:
- shortening of middle phalanges of digits 2 to 5
- shortened first distal phalanx
- very short first metacarpal
- shortening of third to fifth metacarpals
- similarly affected feet
- short stature in affected sibs
- hand-focused skeletal pattern

Interpretation:
- This is a narrow hand-and-short-stature branch.
- It is a better OMIM match for the current `GDF5` outranker than the broader classical `IHH` BDA1 entry.

## Outranker 2: Familial Temporal Lobe Epilepsy 8 (`OMIM:616461`)

Gene:
- `GAL`

OMIM-supported core features:
- temporal lobe epilepsy
- onset around age 13 years in reported twins
- aura with abdominal discomfort
- incoherent speech
- blurred vision
- auditory hallucinations
- slow ideation
- deja vu
- complex partial seizures
- occasional secondary generalization
- normal brain MRI
- response to antiepileptic medication

Interpretation:
- This is an extremely narrow seizure-only branch.
- It does not carry the broad developmental / skeletal / dysmorphic surface that KBG syndrome has.

## Comparison Against The Prior Symmetric Shadow

Already shadowed previously:
- `KBG syndrome`
  - `HP:0001156` `Brachydactyly`
  - `HP:0007359` `Focal-onset seizure`
  - `HP:0001155` `Abnormality of the hand` (parent-promotion scenario)
- `familial temporal lobe epilepsy 8`
  - `HP:0007359` `Focal-onset seizure`
- hand-focused outranker branch
  - `HP:0001155` `Abnormality of the hand` on the hand-disease side in the parent-promotion scenario

What OMIM mainly adds is confidence, not a large new term set:
- it strongly confirms that `KBG syndrome` genuinely is a hand-anomaly + short stature + developmental delay + seizure syndrome
- it strongly confirms that `ETL8` is a narrow epilepsy branch
- it confirms that the actual `GDF5` subtype is a narrow hand-focused brachydactyly branch

## New Candidate Terms Worth Considering In A Future Shadow

Conservative truth-side additions suggested by OMIM:
- `HP:0000202` `Delayed speech and language development`
  - OMIM describes palatal/speech disorder and developmental delay; this needs careful phenotype normalization before use.
- `HP:0009826` `Broad hand`
  - only if the target ontology mapping is clean and present in the case packet family; otherwise avoid speculative promotion.

Conservative outranker-side additions suggested by OMIM:
- `HP:0009381` `Short middle phalanx of finger`
- `HP:0009638` `Short metacarpal`

But the main read is:
- OMIM does not reveal a big hidden missing term set that obviously rescues `ANKRD11`.
- It mostly sharpens the interpretation that the true branch is broad and valid, while the outrankers are narrow and sharp.

## Current Conclusion

The manual OMIM pass supports the earlier symmetric-shadow conclusion:
- `ANKRD11` is not failing because OMIM reveals a large undiscovered truth term set.
- `Goldenberg2016_P13` still looks mostly like undercoverage of the KBG hand branch.
- `Miyatake2017_P1` still looks hybrid:
  - real KBG syndrome support exists
  - but the current scorer still over-rewards narrow sharp diseases such as `GAL` and the hand-focused `GDF5` branch.
