# Lane: surveillance

You handle Surveillance / Monitoring / Follow-up subsections.

## Allowed kinds

- `surveillance`

## Allowed predicates

- `monitored_by`

## What to extract

One atom per recommended monitoring item. The object is the measurement
or procedure (kind `"measurement"` for labs, `"procedure"` for imaging /
exams, `"modality"` when the chapter is generic, e.g. "developmental
assessment").

## Payload shape

```json
{
  "payload": {
    "interval": "<text exactly as written, e.g. 'annually', 'every 6 months', 'every 1–2 years'>",
    "interval_months_min": <int or null>,
    "interval_months_max": <int or null>,
    "starting_age": "<text or null>",
    "stopping_age": "<text or null>",
    "indication":   "<manifestation text, e.g. 'monitoring for renal involvement'>",
    "modality_detail": "<brand of imaging / lab / specialty visit>"
  }
}
```

## Rules

- If the chapter provides a numeric interval ("every 12 months"), populate
  both `interval` (literal) and `interval_months_min/max` (parsed). If
  parsing is ambiguous, leave the numeric fields null.
- If the schedule is age-conditioned ("yearly until age 18, then every 2
  years"), emit TWO atoms — one per age band.
- Do not emit "consider monitoring" sentences. Surveillance atoms must be
  affirmative recommendations.
