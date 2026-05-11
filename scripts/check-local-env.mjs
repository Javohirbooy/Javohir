/**
 * Mahalliy .env da majburiy kalitlar bor-yo‘qligini tekshiradi (qiymatlarni chiqarmaydi).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envPath = path.join(root, ".env");

function parseEnv(raw) {
  const out = {};
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq <= 0) continue;
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

if (!fs.existsSync(envPath)) {
  console.error("[env:check] .env yo‘q. Avval: npm run env:bootstrap");
  process.exit(1);
}

const env = parseEnv(fs.readFileSync(envPath, "utf8"));
const errors = [];

const db = env.DATABASE_URL?.trim();
if (!db) errors.push("DATABASE_URL bo‘sh");
else if (/USER:PASSWORD|ep-PROJECT/i.test(db)) errors.push("DATABASE_URL hali namuna (Neon string qo‘ying)");

const sec = env.AUTH_SECRET?.trim();
if (!sec) errors.push("AUTH_SECRET bo‘sh");
else if (sec.length < 32) errors.push("AUTH_SECRET kamida 32 belgi bo‘lishi kerak");

if (errors.length) {
  console.error("[env:check] Muammolar:");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}

console.log("[env:check] DATABASE_URL va AUTH_SECRET OK (mahalliy).");
