/**
 * Refúgio — servidor da landing + lista de espera.
 * Servidor Node puro, sem dependências externas.
 */

const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";
const DATA_DIR = path.join(__dirname, "data");
const DATA_FILE = path.join(DATA_DIR, "signups.json");
const FRONTEND_DIST = path.join(__dirname, "..", "refugio-landing", "dist");
const CONTENT_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, "[]");

function loadSignups() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8")) || [];
  } catch {
    return [];
  }
}

function saveSignups(list) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(list, null, 2));
}

const INTENT_FROM_LEGACY = {
  desabafar: "desabafar",
  acolher: "ajudar",
  ambos: "os-dois",
};
const FIRST_INTENT_KEYS = [
  "desabafar-especifico",
  "ouvir-primeiro",
  "entender-antes",
];
const isEmail = (s) => typeof s === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

function readBody(req) {
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
      if (data.length > 1e5) req.destroy();
    });
    req.on("end", () => resolve(data));
  });
}

function json(res, code, obj) {
  res.writeHead(code, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(obj));
}

function checkAuth(req) {
  if (!ADMIN_PASSWORD) return false;
  const header = req.headers.authorization || "";
  const [, b64] = header.split(" ");
  if (!b64) return false;
  const decoded = Buffer.from(b64, "base64").toString();
  const separator = decoded.indexOf(":");
  const given = separator >= 0 ? decoded.slice(separator + 1) : "";
  const actual = Buffer.from(given);
  const expected = Buffer.from(ADMIN_PASSWORD);
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

function requireAuth(res) {
  res.writeHead(401, {
    "WWW-Authenticate": 'Basic realm="Refugio Admin"',
    "Content-Type": "text/plain; charset=utf-8",
  });
  res.end("Acesso restrito.");
}

function serveFrontendFile(res, filePath) {
  let stats;
  try {
    stats = fs.statSync(filePath);
  } catch {
    return false;
  }
  if (!stats.isFile()) return false;

  const extension = path.extname(filePath).toLowerCase();
  const isIndex = path.resolve(filePath) === path.join(FRONTEND_DIST, "index.html");
  const headers = {
    "Content-Type": CONTENT_TYPES[extension] || "application/octet-stream",
    "Cache-Control": isIndex
      ? "no-cache"
      : "public, max-age=31536000, immutable",
  };
  res.writeHead(200, headers);
  res.end(fs.readFileSync(filePath));
  return true;
}

function serveFrontend(res, pathname) {
  let decodedPathname;
  try {
    decodedPathname = decodeURIComponent(pathname);
  } catch {
    return false;
  }

  const relativePath = decodedPathname.replace(/^\/+/, "");
  const candidate = path.resolve(FRONTEND_DIST, relativePath);
  const frontendRoot = path.resolve(FRONTEND_DIST);
  if (candidate !== frontendRoot && !candidate.startsWith(`${frontendRoot}${path.sep}`)) {
    return false;
  }

  if (serveFrontendFile(res, candidate)) return true;
  return serveFrontendFile(res, path.join(FRONTEND_DIST, "index.html"));
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const pathname = url.pathname;

  if (req.method === "GET" && pathname === "/api/healthz") {
    return json(res, 200, { ok: true });
  }

  if (req.method === "POST" && pathname === "/api/waitlist") {
    const raw = await readBody(req);
    let body = {};
    try {
      body = JSON.parse(raw || "{}");
    } catch {
      try { body = Object.fromEntries(new URLSearchParams(raw)); } catch {}
    }
    if (body.website) return json(res, 200, { ok: true });
    const email = String(body.email || "").trim().toLowerCase();
    const rawIntent = body.intencao ?? body.intent ?? body.motivo ?? "";
    const canonicalIntent = String(rawIntent).trim().slice(0, 40);
    const motivo = ({ ajudar: "acolher", "os-dois": "ambos" }[canonicalIntent] || canonicalIntent);
    const primeiraIntencao = String(body.primeira_intencao ?? "").trim().slice(0, 40);
    const queryRef = url.searchParams.get("ref") || "";
    const ref = String(body.ref ?? queryRef).trim().slice(0, 120);
    if (!isEmail(email)) return json(res, 400, { ok: false, error: "E-mail inválido." });
    if (!["desabafar", "acolher", "ambos"].includes(motivo)) {
      return json(res, 400, { ok: false, error: "Escolha uma intenção para continuar." });
    }
    if (primeiraIntencao && !FIRST_INTENT_KEYS.includes(primeiraIntencao)) {
      return json(res, 400, { ok: false, error: "Escolha uma primeira intenção válida." });
    }
    const list = loadSignups();
    if (list.some((x) => x.email === email)) return json(res, 200, { ok: true, already: true });
    list.push({ email, motivo, primeira_intencao: primeiraIntencao, ref, created_at: new Date().toISOString() });
    saveSignups(list);
    return json(res, 200, { ok: true });
  }

  if (req.method === "GET" && pathname === "/api/admin/summary") {
    if (!checkAuth(req)) return requireAuth(res);
    const list = loadSignups();
    const counts = { desabafar: 0, ajudar: 0, "os-dois": 0 };
    const firstIntentCounts = Object.fromEntries(FIRST_INTENT_KEYS.map((key) => [key, 0]));
    for (const entry of list) {
      const intent = INTENT_FROM_LEGACY[entry.motivo] || entry.motivo;
      if (intent in counts) counts[intent]++;
      const firstIntent = String(entry.primeira_intencao || "");
      if (Object.prototype.hasOwnProperty.call(firstIntentCounts, firstIntent)) firstIntentCounts[firstIntent]++;
    }
    return json(res, 200, { total: list.length, counts, firstIntentCounts });
  }

  if (req.method === "GET" && pathname === "/api/admin/waitlist") {
    if (!checkAuth(req)) return requireAuth(res);
    const entries = loadSignups().map((entry) => ({
      email: entry.email,
      intent: INTENT_FROM_LEGACY[entry.motivo] || entry.motivo,
      firstIntent: entry.primeira_intencao || "",
      source: entry.ref || null,
      createdAt: entry.created_at,
    }));
    return json(res, 200, { entries });
  }

  if (req.method === "GET" && pathname === "/api/admin/waitlist.csv") {
    if (!checkAuth(req)) return requireAuth(res);
    const csvCell = (value) => `"${String(value == null ? "" : value).replace(/"/g, '""')}"`;
    const entries = loadSignups().map((entry) => [
      entry.email,
      INTENT_FROM_LEGACY[entry.motivo] || entry.motivo,
       entry.primeira_intencao || "",
      entry.created_at,
      entry.ref || "",
    ]);
    const csv = [
       ["email", "intencao", "primeira_intencao", "data", "origem"].map(csvCell).join(","),
      ...entries.map((entry) => entry.map(csvCell).join(",")),
    ].join("\r\n");
    res.writeHead(200, {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="refugio-waitlist.csv"',
    });
    return res.end(`\uFEFF${csv}`);
  }

  if (req.method === "GET" && pathname === "/admin/export.csv") {
    if (!checkAuth(req)) return requireAuth(res);
    const list = loadSignups();
    const escCsv = (v) => `"${String(v == null ? "" : v).replace(/"/g, '""')}"`;
    const csv = ["email,motivo,primeira_intencao,ref,created_at", ...list.map((x) => [x.email, x.motivo, x.primeira_intencao || "", x.ref, x.created_at].map(escCsv).join(","))].join("\n");
    res.writeHead(200, {"Content-Type":"text/csv; charset=utf-8","Content-Disposition":'attachment; filename="refugio-signups.csv"'});
    return res.end(csv);
  }

  if (req.method === "GET" && pathname !== "/api" && !pathname.startsWith("/api/")) {
    if (serveFrontend(res, pathname)) return;
  }

  res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("Não encontrado.");
});

server.listen(PORT, () => {
  console.log(`Refúgio API rodando em http://localhost:${PORT}`);
  console.log(`Painel: http://localhost:${PORT}/admin (usuário: admin)`);
  if (!ADMIN_PASSWORD) console.log("⚠ Defina ADMIN_PASSWORD no Secret do Replit.");
});