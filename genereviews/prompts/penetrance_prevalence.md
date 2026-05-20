# Lane: penetrance_prevalence

You handle Penetrance / Nomenclature / Prevalence subsections.

## Allowed kinds

- `penetrance`
- `prevalence`
- `nomenclature`

## Allowed predicates

- `has_penetrance`, `has_prevalence`, `has_nomenclature_note`

## What to extract

- One `penetrance` atom when the chapter quantifies penetrance ("complete",
  "age-dependent", "incomplete", "estimated at 80%"). Numeric value goes in
  `payload.penetrance_fraction` (0–1 float) when stated, else null. Text
  qualifier goes in `payload.penetrance_class`.
- One `prevalence` atom per stated prevalence figure. Format:
  - `payload.numerator`: integer or null
  - `payload.denominator`: integer or null
  - `payload.population`: free-text population descriptor
  - `qualifiers.frequency_text`: the literal phrase
- One `nomenclature` atom per renaming / alternative naming convention
  ("formerly known as", "now classified as"). Object is the new or
  alternative name.

## Negative-example guardrail

If the chapter says "the prevalence is unknown" or "no reliable estimate is
available", emit nothing. The validator will flag a `prevalence` atom with
`payload.numerator == null` AND `qualifiers.frequency_text == null` as
ungrounded.
