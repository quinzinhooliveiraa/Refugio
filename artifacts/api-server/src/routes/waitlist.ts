import { Router, type IRouter, type Request, type Response } from "express";
import { asc, count } from "drizzle-orm";
import { db, waitlistTable, waitlistIntentSchema } from "@workspace/db";
import { timingSafeEqual } from "node:crypto";

const router: IRouter = Router();
const emailSchema = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const intents = ["desabafar", "ajudar", "os-dois"] as const;

function sameSecret(actual: string, expected: string) {
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}

function requireAdmin(req: Request, res: Response) {
  const configuredPassword = process.env.ADMIN_PASSWORD;
  const header = req.headers.authorization;
  if (!configuredPassword || !header?.startsWith("Basic ")) {
    res.setHeader("WWW-Authenticate", 'Basic realm="Refúgio admin"');
    res.status(401).json({ error: "Autenticação necessária." });
    return false;
  }
  try {
    const decoded = Buffer.from(header.slice(6), "base64").toString("utf8");
    const separator = decoded.indexOf(":");
    const password = separator >= 0 ? decoded.slice(separator + 1) : "";
    if (!sameSecret(password, configuredPassword)) throw new Error("invalid password");
    return true;
  } catch {
    res.setHeader("WWW-Authenticate", 'Basic realm="Refúgio admin"');
    res.status(401).json({ error: "Senha inválida." });
    return false;
  }
}

router.post("/waitlist", async (req, res): Promise<void> => {
  const { email, intencao, intent, website } = req.body ?? {};
  const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
  const normalizedIntent = intencao ?? intent;

  if (typeof website === "string" && website.trim() !== "") {
    res.json({ ok: true });
    return;
  }
  if (!emailSchema.test(normalizedEmail)) {
    res.status(400).json({ ok: false, error: "Informe um e-mail válido." });
    return;
  }
  const parsedIntent = waitlistIntentSchema.safeParse(normalizedIntent);
  if (!parsedIntent.success) {
    res.status(400).json({ ok: false, error: "Escolha uma intenção para continuar." });
    return;
  }

  const ref = typeof req.query.ref === "string" ? req.query.ref.trim().slice(0, 120) : null;
  try {
    await db.insert(waitlistTable).values({
      email: normalizedEmail,
      intent: parsedIntent.data,
      source: ref || null,
    }).onConflictDoNothing();
    res.json({ ok: true });
  } catch (error) {
    req.log.error({ err: error }, "Failed to save waitlist signup");
    res.status(500).json({ ok: false, error: "Não foi possível salvar agora. Tente novamente." });
  }
});

router.get("/admin/summary", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const rows = await db
    .select({ intent: waitlistTable.intent, total: count() })
    .from(waitlistTable)
    .groupBy(waitlistTable.intent);
  const totalResult = await db.select({ total: count() }).from(waitlistTable);
  const total = Number(totalResult[0]?.total ?? 0);
  const counts = Object.fromEntries(intents.map((intent) => [intent, Number(rows.find((row) => row.intent === intent)?.total ?? 0)]));
  res.json({ total, counts });
});

router.get("/admin/waitlist", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const entries = await db.select({
    email: waitlistTable.email,
    intent: waitlistTable.intent,
    source: waitlistTable.source,
    createdAt: waitlistTable.createdAt,
  }).from(waitlistTable).orderBy(asc(waitlistTable.createdAt));
  res.json({ entries });
});

router.get("/admin/waitlist.csv", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const entries = await db.select({
    email: waitlistTable.email,
    intent: waitlistTable.intent,
    source: waitlistTable.source,
    createdAt: waitlistTable.createdAt,
  }).from(waitlistTable).orderBy(asc(waitlistTable.createdAt));
  const csvCell = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  const csv = [
    ["email", "intencao", "data", "origem"].map(csvCell).join(","),
    ...entries.map((entry) => [entry.email, entry.intent, entry.createdAt.toISOString(), entry.source].map(csvCell).join(",")),
  ].join("\r\n");
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="refugio-waitlist.csv"');
  res.send(`\uFEFF${csv}`);
});

export default router;