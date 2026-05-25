import { timingSafeEqual } from "crypto";

function safeSecretEqual(provided: string, expected: string): boolean {
  if (!provided || !expected) return false;
  const a = Buffer.from(provided, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/** Vercel Cron, GitHub Actions yoki UptimeRobot — `CRON_SECRET` bilan. */
export function isAuthorizedCron(req: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return process.env.NODE_ENV !== "production";
  }
  const auth = req.headers.get("authorization");
  const bearer = auth?.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  const header = req.headers.get("x-cron-secret")?.trim() ?? "";
  if (bearer && safeSecretEqual(bearer, secret)) return true;
  if (header && safeSecretEqual(header, secret)) return true;
  return false;
}

/** Scheduler manbasi (log/Sentry uchun, maxfiy emas). */
export function cronInvokerHint(req: Request): string {
  if (req.headers.get("x-vercel-cron")) return "vercel";
  if (req.headers.get("user-agent")?.includes("GitHub-Actions")) return "github_actions";
  return "external";
}
