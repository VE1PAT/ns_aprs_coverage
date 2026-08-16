/**
 * Optional command-line refresh (same as the Update map button).
 * Prefer the web UI for most people.
 *
 * Usage:
 *   set APRSFI_API_KEY=your-key
 *   node refresh-digis.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const API_KEY = process.env.APRSFI_API_KEY;
if (!API_KEY) {
  console.error("Set APRSFI_API_KEY first, or use start.bat and the Update map button.");
  process.exit(1);
}

const listPath = path.join(__dirname, "digis-list.json");
const list = JSON.parse(fs.readFileSync(listPath, "utf8"));
const callsigns = [...new Set((list.callsigns || []).map((c) => String(c).trim().toUpperCase()).filter(Boolean))];

function chunk(arr, n) {
  const out = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

async function fetchBatch(names) {
  const url =
    `https://api.aprs.fi/api/get?name=${encodeURIComponent(names.join(","))}` +
    `&what=loc&apikey=${encodeURIComponent(API_KEY)}&format=json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  if (json.result !== "ok") throw new Error(json.description || `result=${json.result}`);
  return json.entries || [];
}

const all = [];
for (const batch of chunk(callsigns, 20)) {
  all.push(...(await fetchBatch(batch)));
  await new Promise((r) => setTimeout(r, 1100));
}

const slim = all.map((e) => ({
  name: e.name,
  lat: Number(e.lat),
  lng: Number(e.lng),
  lasttime: Number(e.lasttime),
  phg: e.phg ? String(e.phg).replace(/\D/g, "").slice(0, 4) : null,
  comment: e.comment || "",
}));

fs.writeFileSync(path.join(__dirname, "digis-raw.json"), JSON.stringify(slim, null, 2) + "\n", "utf8");
const found = new Set(slim.map((s) => s.name.toUpperCase()));
const missing = callsigns.filter((c) => !found.has(c));
console.log(`Wrote ${slim.length} stations to digis-raw.json`);
if (missing.length) console.log("Not found:", missing.join(", "));
