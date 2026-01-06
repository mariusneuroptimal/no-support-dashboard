# NO Support Dashboard

Static dashboard for NO Support diagnostics. Hosted on GitHub Pages, fetches data from NAS.

## Setup

1. Enable GitHub Pages (Settings → Pages → main branch / root)
2. Ensure NAS serves `http://192.168.2.90/diagnostics/index.json` with CORS headers

## Data Source

Dashboard fetches from `http://192.168.2.90/diagnostics/index.json`
