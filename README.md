# Nova Scotia APRS digipeater coverage

Interactive map of MARCAN / Nova Scotia APRS digipeaters using live data from [aprs.fi](https://aprs.fi/).

Circles are **PHG planning estimates** (not terrain-aware RF coverage). Useful for spotting likely gaps and overlaps when talking with NSARA.

## Quick start (Windows)

1. Install [Node.js](https://nodejs.org/) (LTS is fine) if you do not already have it.
2. Double-click **`start.bat`**.
3. Your browser opens the map.
4. Get a free API key: sign in at [aprs.fi](https://aprs.fi/) → account / API page.
5. Paste the key → **Remember key** → **Update map**.

Keep the black `start.bat` window open while using the map.

### Or from a terminal

```bash
npm start
```

Then open http://127.0.0.1:8765/

## Add / remove digipeaters

In the left panel under **Update from aprs.fi**:

1. Edit **Digi callsigns** — one callsign per line (example: `VE1LUN`).
2. Optionally edit **Reference URLs** — useful for lists like MARCAN:

   ```text
   MARCAN APRS page | http://ve1cra.net/aprs/
   ```

3. Click **Save digi list** (writes `digis-list.json`).
4. Click **Update map** to pull fresh positions from aprs.fi into `digis-raw.json`.

Lines starting with `#` in the callsign box are treated as comments.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | Map UI |
| `server.mjs` | Local helper (serves UI + talks to aprs.fi) |
| `digis-list.json` | Editable callsign list + reference URLs |
| `digis-raw.json` | Last downloaded positions/PHG |
| `start.bat` | One-click start on Windows |

Your API key is stored only in the browser (`localStorage`). It is **not** saved into Git files.

## First-time GitHub upload (for the project owner)

If this folder is not on GitHub yet:

1. Create a free account at [github.com](https://github.com) if needed.
2. On GitHub: **New repository** → name it e.g. `ns-aprs-coverage` → leave it empty (no README) → Create.
3. On your PC, open PowerShell in this folder and run (replace `YOURUSER` and repo name):

```powershell
cd C:\Users\home\ns-aprs-coverage
git init
git add .
git status
git commit -m "Add Nova Scotia APRS coverage map with easy API key updates"
git branch -M main
git remote add origin https://github.com/YOURUSER/ns-aprs-coverage.git
git push -u origin main
```

GitHub will ask you to sign in the first time (browser or token).

## Later updates (after you change the map)

Whenever you improve the project and want GitHub to match your PC:

```powershell
cd C:\Users\home\ns-aprs-coverage
git add .
git status
git commit -m "Describe your change in a short sentence"
git push
```

### Tips

- Run `git status` before committing so you can see what will be uploaded.
- Do **not** commit API keys. This project is set up so keys stay in the browser only.
- If `git push` says the remote has new commits, run `git pull` first, then `git push`.

## For people who download / clone your repo

```powershell
git clone https://github.com/YOURUSER/ns-aprs-coverage.git
cd ns-aprs-coverage
```

Then use **`start.bat`**, paste **their own** aprs.fi API key, and click **Update map**.

## Optional command-line refresh

```powershell
$env:APRSFI_API_KEY = "your-key-here"
npm run refresh
```

## Credits / sources

- Digi inventory inspired by [MARCAN APRS](http://ve1cra.net/aprs/)
- Positions and PHG from the [aprs.fi API](https://aprs.fi/page/api/)
