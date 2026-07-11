/**
 * Refresh digi snapshot from aprs.fi API.
 * Usage: set APRSFI_API_KEY then: node refresh-digis.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const API_KEY = process.env.APRSFI_API_KEY;
if (!API_KEY) {
  console.error("Set APRSFI_API_KEY in the environment first.");
  process.exit(1);
}

const CALLS = [
  "VE1TPL", "VE1TRO", "VE1EXP", "VE1MTT", "VE1AEH", "VE1ARC", "VE1YAR",
  "VE1PKT", "VE1AAQ", "VE1VZ", "VE1ALB", "VA1BAR", "VE1EKV", "VE1MHR",
  "VE1BBY", "VE1GYS", "VE1OBN", "VE1LUN", "VE1VO", "VE1JCF", "VE1BHS",
  "VA1COR", "VE1XK", "VE1HCA", "VE1ZX",
];

function chunk(arr, n) {
  const out = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

async function fetchBatch(names) {
  const url =
    `https://api.aprs.fi/api/get?name=${names.join(",")}` +
    `&what=loc&apikey=${encodeURIComponent(API_KEY)}&format=json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  if (json.result !== "ok") throw new Error(`API result=${json.result}`);
  return json.entries || [];
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

const all = [];
for (const batch of chunk(CALLS, 20)) {
  all.push(...(await fetchBatch(batch)));
  await sleep(1100);
}

const slim = all.map((e) => ({
  name: e.name,
  lat: +e.lat,
  lng: +e.lng,
  lasttime: +e.lasttime,
  phg: e.phg ? String(e.phg).replace(/\D/g, "").slice(0, 4) : null,
  comment: e.comment || "",
}));

fs.writeFileSync(
  path.join(__dirname, "digis-raw.json"),
  JSON.stringify(slim, null, 2),
  "utf8"
);

const htmlPath = path.join(__dirname, "index.html");
let html = fs.readFileSync(htmlPath, "utf8");
const fetchedAt = new Date().toISOString();
const digisLiteral = JSON.stringify(slim, null, 2);

html = html.replace(
  /const FETCHED_AT = "[^"]*";/,
  `const FETCHED_AT = "${fetchedAt}";`
);
html = html.replace(
  /const DIGIS = \[[\s\S]*?\];/,
  `const DIGIS = ${digisLiteral};`
);

fs.writeFileSync(htmlPath, html, "utf8");
console.log(`Updated ${slim.length} stations at ${fetchedAt}`);
const missing = CALLS.filter((c) => !slim.some((s) => s.name === c));
if (missing.length) console.log("Not found:", missing.join(", "));
