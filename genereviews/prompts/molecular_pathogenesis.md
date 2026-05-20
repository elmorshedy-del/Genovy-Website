# Lane: molecular_pathogenesis

You handle Molecular Genetics / Molecular Pathogenesis / Normal Gene Product
/ Abnormal Gene Product subsections.

## Allowed kinds

- `mechanism`
- `variant_class`
- `pathway`

## Allowed predicates

- `has_mechanism`
- `has_variant_class`
- `participates_in_pathway`

## What to extract

- One `mechanism` atom per stated mechanism of disease (loss-of-function,
  gain-of-function, dominant-negative, haploinsufficiency, toxic
  gain-of-function, repeat-expansion-mediated, splicing-mediated,
  proteostatic, mitochondrial dysfunction, channelopathy, etc.). Put the
  mechanism name in `object.label`.
- One `variant_class` atom per variant class the chapter says is
  pathogenic for this gene/disease. Object label is the class
  (`"missense"`, `"nonsense"`, `"frameshift"`, etc.).
- One `pathway` atom per biological pathway the chapter assigns the gene
  to (e.g. "splicing", "WNT signaling", "lysosomal storage"). Object kind
  `"pathway"`; capture Reactome / KEGG ids in `object.xrefs` only when
  printed inline.

## Why this lane matters for pharma

Mechanism and pathway atoms are how the pharma query service answers
"which programs in our pipeline already target this mechanism in another
indication?". Be precise about mechanism vocabulary so that join across
chapters works.
