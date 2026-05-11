/**
 * .env yo'q bo'lsa .env.example dan yaratadi: tasodifiy AUTH_SECRET, mahalliy URL.
 * DATABASE_URL / DIRECT_URL — Neon dan qo'lda (yoki Vercel env).
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envPath = path.join(root, ".env");
const examplePath = path.join(root, ".env.example");

if (fs.existsSync(envPath)) {
  console.log("[bootstrap-env] .env allaqachon bor — o‘zgartirilmadi.");
  process.exit(0);
}

if (!fs.existsSync(examplePath)) {
  console.error("[bootstrap-env] .env.example topilmadi.");
  process.exit(1);
}

let content = fs.readFileSync(examplePath, "utf8");
const secret = crypto.randomBytes(32).toString("base64url");
content = content.replace(/^AUTH_SECRET=.*$/m, `AUTH_SECRET="${secret}"`);
content = content.replace(
  /^NEXT_PUBLIC_SITE_URL=.*$/m,
  'NEXT_PUBLIC_SITE_URL="http://localhost:3000"',
);

if (!/^ALLOW_INSECURE_SITE_URL=/m.test(content)) {
  content =
    content.trimEnd() +
    `

# Mahalliy dev (bootstrap-env)
ALLOW_INSECURE_SITE_URL="1"
`;
}

fs.writeFileSync(envPath, content, "utf8");
console.log("[bootstrap-env] .env yaratildi.");
console.log("[bootstrap-env] Keyingi qadam: DATABASE_URL va DIRECT_URL ni Neon connection string bilan to‘ldiring.");
console.log("[bootstrap-env] Tekshiruv: npm run env:check");
