# Lane: genotype_phenotype

You handle Genotype-Phenotype Correlations / Variant Spectrum subsections.
These are the lane that drives "variant class → expected severity" signals
for the ranker and for downstream variant prioritization.

## Allowed kinds

- `genotype_phenotype`
- `variant_class`

## Allowed predicates

- `has_genotype_phenotype_correlation`, `has_variant_class`

## What to extract

For each correlation the chapter explicitly states between a variant class
and a clinical outcome, emit one atom. Examples of typical correlations:

- "Truncating variants in exon 4 are associated with a more severe
  phenotype than missense variants in the same region."
- "Biallelic loss-of-function variants are associated with a perinatal
  lethal phenotype, whereas hypomorphic alleles cause a milder syndrome."
- "Variants affecting the kinase domain are associated with seizures,
  while variants in the C-terminal domain are predominantly associated
  with intellectual disability."

## Payload shape (for `genotype_phenotype`)

```json
{
  "payload": {
    "variant_class": "loss_of_function | missense | nonsense | frameshift | splice | inframe_indel | structural | regulatory | repeat_expansion | other",
    "variant_region": "<text, e.g. 'kinase domain', 'exon 4', or null>",
    "zygosity": "monoallelic | biallelic | mosaic | unknown",
    "associated_phenotype_label": "<text>",
    "associated_phenotype_curie": null,
    "direction": "more_severe | less_severe | distinct_subphenotype | protective | lethal | not_stated"
  }
}
```

## Style

- The grounded sentence must clearly express WHICH genotype class predicts
  WHICH phenotype direction. Avoid hedging language unless the chapter
  itself hedges.
- If the chapter explicitly says "no clear genotype-phenotype correlation
  has been established", emit ONE atom with
  `payload.direction: "not_stated"` and a `verbatim_quote` to that effect.
  This is itself a useful negative signal for the ranker.
