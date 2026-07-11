# Nova Scotia APRS coverage map

Interactive Leaflet map of MARCAN digipeaters in Nova Scotia, using positions and PHG from the [aprs.fi API](https://aprs.fi/page/api/).

## Open the map

Open `index.html` in a browser (double-click, or drag into Chrome/Edge/Firefox).

## What the circles mean

- Circles are **PHG-based planning estimates**, not terrain-aware RF coverage.
- Toggle fixed 40/60/80 km radii for a simpler gap discussion.
- Digis not heard in 7+ days are marked **stale** (e.g. Digby `VE1ALB` at last fetch).
- `VE1ZX` (Parrsboro) was not returned by the API.

## Refresh data

Do **not** put your aprs.fi API key in this repo. Set it in the environment, then run:

```powershell
$env:APRSFI_API_KEY = "your-key-here"
node refresh-digis.mjs
```

That updates `digis-raw.json` and rewrites the embedded snapshot in `index.html`.

## Source

- Digi list: MARCAN / [ve1cra.net/aprs](http://ve1cra.net/aprs/)
- Positions: aprs.fi `what=loc` API
