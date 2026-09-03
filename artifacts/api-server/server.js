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

const MOTIVOS = {
  desabafar: "Quero desabafar",
  acolher: "Quero acolher",
  ambos: "Os dois",
};
const INTENT_FROM_LEGACY = {
  desabafar: "desabafar",
  acolher: "ajudar",
  ambos: "os-dois",
};
const isEmail = (s) => typeof s === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
const esc = (s) =>
  String(s == null ? "" : s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );

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

function adminPage(list) {
  const total = list.length;
  const c = (m) => list.filter((x) => x.motivo === m).length;
  const d = c("desabafar"), a = c("acolher"), amb = c("ambos");
  const querAjudar = a + amb;
  const pct = (n) => (total ? Math.round((n / total) * 100) : 0);
  const rows = list.slice().reverse().map((x) => `<tr>
    <td>${esc(x.email)}</td>
    <td>${esc(MOTIVOS[x.motivo] || x.motivo || "—")}</td>
    <td>${esc(x.ref || "—")}</td>
    <td>${esc(new Date(x.created_at).toLocaleString("pt-BR"))}</td>
  </tr>`).join("");

  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Refúgio · Admin</title>
<style>
  :root{--green:#193f3c;--coral:#d7775d;--paper:#f1ede4;--paper2:#e7e1d6;--line:rgba(25,63,60,.15);--gray:#69736f}
  *{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--green);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif}
  .wrap{max-width:1000px;margin:0 auto;padding:34px 22px 70px}h1{font-size:26px;letter-spacing:-.02em;margin:0 0 4px}.sub{color:var(--gray);font-size:13px;margin:0 0 26px}
  .cards{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:14px}.card{background:#fbf9f4;border:1px solid var(--line);border-radius:14px;padding:16px}.card .n{font-size:30px;font-weight:700;letter-spacing:-.03em}.card .l{font-size:11px;color:var(--gray);margin-top:2px}.card.hi{background:var(--coral);color:#fff7ef;border-color:transparent}.card.hi .l{color:rgba(255,247,239,.85)}
  .bar{height:8px;border-radius:99px;background:var(--paper2);overflow:hidden;margin-top:18px}.bar>i{display:block;height:100%;background:linear-gradient(90deg,var(--green),var(--coral))}.barlabel{display:flex;justify-content:space-between;font-size:12px;color:var(--gray);margin-top:8px}
  .actions{margin:26px 0 14px}.btn{display:inline-block;background:var(--green);color:#fff;text-decoration:none;font-size:13px;font-weight:600;padding:10px 16px;border-radius:99px}
  table{width:100%;border-collapse:collapse;margin-top:8px;font-size:13px;background:#fbf9f4;border:1px solid var(--line);border-radius:14px;overflow:hidden}th,td{text-align:left;padding:11px 14px;border-bottom:1px solid var(--line)}th{font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:var(--gray);background:var(--paper2)}tr:last-child td{border-bottom:0}.empty{padding:40px;text-align:center;color:var(--gray);background:#fbf9f4;border:1px solid var(--line);border-radius:14px}
  @media(max-width:640px){.cards{grid-template-columns:1fr 1fr}table{display:block;overflow-x:auto;white-space:nowrap}}
</style></head><body><div class="wrap">
  <h1>Refúgio · Painel</h1><p class="sub">Cadastros da lista de espera. Atualize a página para ver os novos.</p>
  <div class="cards">
    <div class="card"><div class="n">${total}</div><div class="l">Total de inscritos</div></div>
    <div class="card hi"><div class="n">${pct(querAjudar)}%</div><div class="l">Querem ajudar (acolher + os dois)</div></div>
    <div class="card"><div class="n">${d}</div><div class="l">Só desabafar · ${pct(d)}%</div></div>
    <div class="card"><div class="n">${querAjudar}</div><div class="l">Dispostos a acolher</div></div>
  </div>
  <div class="bar"><i style="width:${pct(querAjudar)}%"></i></div><div class="barlabel"><span>Quem topa acolher — o sinal que importa</span><span>${querAjudar} de ${total}</span></div>
  <div class="actions"><a class="btn" href="/admin/export.csv">Baixar CSV ↓</a></div>
  ${total ? `<table><thead><tr><th>E-mail</th><th>Intenção</th><th>Origem</th><th>Quando</th></tr></thead><tbody>${rows}</tbody></table>` : `<div class="empty">Ainda não há cadastros. Compartilhe o link e volte aqui.</div>`}
</div></body></html>`;
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
    const queryRef = url.searchParams.get("ref") || "";
    const ref = String(body.ref ?? queryRef).trim().slice(0, 120);
    if (!isEmail(email)) return json(res, 400, { ok: false, error: "E-mail inválido." });
    if (!["desabafar", "acolher", "ambos"].includes(motivo)) {
      return json(res, 400, { ok: false, error: "Escolha uma intenção para continuar." });
    }
    const list = loadSignups();
    if (list.some((x) => x.email === email)) return json(res, 200, { ok: true, already: true });
    list.push({ email, motivo, ref, created_at: new Date().toISOString() });
    saveSignups(list);
    return json(res, 200, { ok: true });
  }

  if (req.method === "GET" && pathname === "/api/admin/summary") {
    if (!checkAuth(req)) return requireAuth(res);
    const list = loadSignups();
    const counts = { desabafar: 0, ajudar: 0, "os-dois": 0 };
    for (const entry of list) {
      const intent = INTENT_FROM_LEGACY[entry.motivo] || entry.motivo;
      if (intent in counts) counts[intent]++;
    }
    return json(res, 200, { total: list.length, counts });
  }

  if (req.method === "GET" && pathname === "/api/admin/waitlist") {
    if (!checkAuth(req)) return requireAuth(res);
    const entries = loadSignups().map((entry) => ({
      email: entry.email,
      intent: INTENT_FROM_LEGACY[entry.motivo] || entry.motivo,
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
      entry.created_at,
      entry.ref || "",
    ]);
    const csv = [
      ["email", "intencao", "data", "origem"].map(csvCell).join(","),
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
    const csv = ["email,motivo,ref,created_at", ...list.map((x) => [x.email, x.motivo, x.ref, x.created_at].map(escCsv).join(","))].join("\n");
    res.writeHead(200, {"Content-Type":"text/csv; charset=utf-8","Content-Disposition":'attachment; filename="refugio-signups.csv"'});
    return res.end(csv);
  }

  if (req.method === "GET" && pathname === "/admin") {
    if (!checkAuth(req)) return requireAuth(res);
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    return res.end(adminPage(loadSignups()));
  }

  res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("Não encontrado.");
});

server.listen(PORT, () => {
  console.log(`Refúgio API rodando em http://localhost:${PORT}`);
  console.log(`Painel: http://localhost:${PORT}/admin (usuário: admin)`);
  if (!ADMIN_PASSWORD) console.log("⚠ Defina ADMIN_PASSWORD no Secret do Replit.");
});