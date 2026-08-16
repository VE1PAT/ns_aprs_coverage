/**
 * Local helper for the NS APRS coverage map.
 * - Serves the web app
 * - Proxies aprs.fi API (avoids browser CORS; key never stored on disk)
 * - Saves digi callsign list + refreshed position snapshot
 *
 * Usage: node server.mjs
 * Then open http://127.0.0.1:8765/
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 8765);
const HOST = "127.0.0.1";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
};

function send(res, status, body, type = "application/json; charset=utf-8") {
  const data = typeof body === "string" || Buffer.isBuffer(body) ? body : JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": type,
    "Cache-Control": "no-store",
  });
  res.end(data);
}

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJson(file, obj) {
  fs.writeFileSync(file, JSON.stringify(obj, null, 2) + "\n", "utf8");
}

function normalizeCallsigns(list) {
  const seen = new Set();
  const out = [];
  for (const raw of list || []) {
    const call = String(raw || "")
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9-]/g, "");
    if (!call || seen.has(call)) continue;
    seen.add(call);
    out.push(call);
  }
  return out;
}

function parseSources(sources) {
  if (!Array.isArray(sources)) return [];
  return sources
    .map((s) => {
      if (typeof s === "string") {
        const url = s.trim();
        return url ? { name: url, url } : null;
      }
      if (s && typeof s === "object" && s.url) {
        return {
          name: String(s.name || s.url).trim(),
          url: String(s.url).trim(),
        };
      }
      return null;
    })
    .filter(Boolean);
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return {};
  return JSON.parse(raw);
}

function chunk(arr, n) {
  const out = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchAprsBatch(names, apiKey) {
  const url =
    `https://api.aprs.fi/api/get?name=${encodeURIComponent(names.join(","))}` +
    `&what=loc&apikey=${encodeURIComponent(apiKey)}&format=json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`aprs.fi HTTP ${res.status}`);
  const json = await res.json();
  if (json.result !== "ok") {
    throw new Error(json.description || `aprs.fi result=${json.result}`);
  }
  return json.entries || [];
}

async function refreshDigis(apiKey, callsigns) {
  const all = [];
  for (const batch of chunk(callsigns, 20)) {
    all.push(...(await fetchAprsBatch(batch, apiKey)));
    if (callsigns.length > 20) await sleep(1100);
  }

  const slim = all.map((e) => ({
    name: e.name,
    lat: Number(e.lat),
    lng: Number(e.lng),
    lasttime: Number(e.lasttime),
    phg: e.phg ? String(e.phg).replace(/\D/g, "").slice(0, 4) : null,
    comment: e.comment || "",
  }));

  const found = new Set(slim.map((s) => s.name.toUpperCase()));
  const missing = callsigns.filter((c) => !found.has(c.toUpperCase()));

  return {
    fetchedAt: new Date().toISOString(),
    digis: slim,
    missing,
    requested: callsigns.length,
  };
}

function serveStatic(req, res, urlPath) {
  let rel = decodeURIComponent(urlPath.split("?")[0]);
  if (rel === "/") rel = "/index.html";
  if (rel.includes("..")) return send(res, 400, { error: "Bad path" });

  const filePath = path.join(__dirname, rel.replace(/^\//, ""));
  if (!filePath.startsWith(__dirname)) return send(res, 400, { error: "Bad path" });
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    return send(res, 404, { error: "Not found" });
  }

  const ext = path.extname(filePath).toLowerCase();
  send(res, 200, fs.readFileSync(filePath), MIME[ext] || "application/octet-stream");
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://${HOST}:${PORT}`);

    if (req.method === "GET" && url.pathname === "/api/health") {
      return send(res, 200, { ok: true });
    }

    if (req.method === "GET" && url.pathname === "/api/config") {
      const list = readJson(path.join(__dirname, "digis-list.json"), {
        title: "",
        sources: [],
        notes: "",
        callsigns: [],
      });
      const snapshot = readJson(path.join(__dirname, "digis-raw.json"), null);
      return send(res, 200, {
        title: list.title || "",
        notes: list.notes || "",
        sources: parseSources(list.sources),
        callsigns: normalizeCallsigns(list.callsigns),
        snapshot,
        hasSnapshot: Array.isArray(snapshot) && snapshot.length > 0,
      });
    }

    if (req.method === "POST" && url.pathname === "/api/digi-list") {
      const body = await readBody(req);
      const callsigns = normalizeCallsigns(body.callsigns);
      if (!callsigns.length) {
        return send(res, 400, { error: "Add at least one callsign." });
      }
      const next = {
        title: String(body.title || "APRS digipeater list").trim(),
        sources: parseSources(body.sources),
        notes: String(body.notes || "").trim(),
        callsigns,
      };
      writeJson(path.join(__dirname, "digis-list.json"), next);
      return send(res, 200, { ok: true, callsigns: next.callsigns, sources: next.sources });
    }

    if (req.method === "POST" && url.pathname === "/api/refresh") {
      const body = await readBody(req);
      const apiKey = String(body.apiKey || "").trim();
      if (!apiKey) return send(res, 400, { error: "Paste your aprs.fi API key first." });

      let callsigns = normalizeCallsigns(body.callsigns);
      if (!callsigns.length) {
        const list = readJson(path.join(__dirname, "digis-list.json"), { callsigns: [] });
        callsigns = normalizeCallsigns(list.callsigns);
      }
      if (!callsigns.length) {
        return send(res, 400, { error: "No callsigns in the digi list." });
      }

      // Persist list if caller sent one (keeps editor + refresh in sync).
      if (Array.isArray(body.callsigns)) {
        const existing = readJson(path.join(__dirname, "digis-list.json"), {});
        writeJson(path.join(__dirname, "digis-list.json"), {
          title: String(body.title || existing.title || "APRS digipeater list").trim(),
          sources: parseSources(body.sources ?? existing.sources),
          notes: String(body.notes ?? existing.notes ?? "").trim(),
          callsigns,
        });
      }

      const result = await refreshDigis(apiKey, callsigns);
      writeJson(path.join(__dirname, "digis-raw.json"), result.digis);
      return send(res, 200, result);
    }

    if (req.method === "GET") return serveStatic(req, res, url.pathname);

    send(res, 405, { error: "Method not allowed" });
  } catch (err) {
    console.error(err);
    send(res, 500, { error: err.message || String(err) });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`NS APRS coverage map running at http://${HOST}:${PORT}/`);
  console.log("Keep this window open while using the map. Press Ctrl+C to stop.");
});
