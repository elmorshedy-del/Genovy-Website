# Lane: contraindications

You handle Agents / Circumstances to Avoid subsections. This lane drives
the pharma query service's adverse-interaction surface.

## Allowed kinds

- `contraindication`

## Allowed predicates

- `contraindicated_with`

## What to extract

One atom per drug, drug class, food, activity, anesthetic, vaccine,
environmental factor, or treatment listed as contraindicated. Object kind
is `"drug"` for specific agents, `"agent"` for classes/categories, and
`"concept"` for circumstances (e.g. "hyperthermia", "high-altitude
exposure").

## Payload shape

```json
{
  "payload": {
    "severity":   "absolute | relative | caution | not_stated",
    "reason":     "<short text describing why, when stated>",
    "alternative": "<recommended alternative, when stated, else null>"
  }
}
```

## Rules

- Statements about "use with caution" are NOT the same as
  "contraindicated". Encode in `payload.severity`.
- Drug-class statements ("nonsteroidal anti-inflammatory drugs should be
  avoided") emit one atom with `object.kind: "agent"` and the class name
  in `object.label`. If the chapter lists specific examples, emit
  ADDITIONAL atoms — one per named drug — so the downstream query service
  matches both class-level and drug-level queries.
