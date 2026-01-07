# NO Support Dashboard

Static dashboard for NO Support diagnostics. Hosted on GitHub Pages.

## Purpose

Provides observational context for where the NO Support Tool is being run, surfacing recurring network failure patterns by country — **without asserting cause, ownership, or recommended actions**.

This dashboard is:
- **Observational** — reports what was measured
- **Contextual** — provides environment information
- **Non-decisional** — draws no conclusions

## Setup

1. Enable GitHub Pages (Settings > Pages > main branch / root)
2. Data files go in `/data/` directory
3. Dashboard fetches from `./data/index.json`

## Data Source

Dashboard fetches from `./data/index.json` which lists session files to load.

### Data Format

Each session file in `/data/` must conform to:

```json
{
  "SchemaVersion": "1.0",
  "SessionId": "NST-XXXX",
  "Actions": [
    {
      "Category": "<operation>",
      "Result": "PASS|WARN|FAIL",
      "Evidence": {
        "CountryCode": "CA"
      }
    }
  ]
}
```

## Contract

See `winconfig/docs/OBSERVED_NETWORK_ENVIRONMENTS.md` for the full vNext contract.

### Country Card Schema

Each country card shows:
1. **Flag** (header, hover for country name)
2. **Diagnostics runs** count
3. **Most observed network failures** (max 3, ranked by count)

### Low-Data Handling

If `runs < 3`, shows: "Insufficient data to identify recurring patterns"

### Sorting

Cards sorted by:
1. Diagnostics runs (descending)
2. Total failure count (descending)

### Removed Elements (Do Not Reintroduce)

- Signal counts/density
- PASS/WARN/FAIL labels at country level
- Performance metrics (latency, speed, packet loss)
- Owner/attribution
- Recommendations

## Language Contract

**Allowed:** "Observed", "Most observed failures", "Recurring patterns", "Insufficient data"

**Forbidden:** "Issues", "Problems", "Likely cause", "Owner", "Recommended"
