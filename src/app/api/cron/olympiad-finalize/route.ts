import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { runOlympiadOverdueFinalization } from "@/lib/olympiad/finalize-overdue-worker";
import { recordOlympiadFinalizeHeartbeat } from "@/lib/worker/olympiad-cron-heartbeat";

/** Prisma + worker mantiq — Edge emas. */
export const runtime = "nodejs";

/** Vercel Cron / tashqi scheduler har chaqiruvda yangi ma’lumot. */
export const dynamic = "force-dynamic";

/** Bir nechta partiya (rounds) uchun vaqt. */
export const maxDuration = 120;

function isAuthorizedCron(req: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return process.env.NODE_ENV !== "production";
  }
  const auth = req.headers.get("authorization");
  const bearer = auth?.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  const header = req.headers.get("x-cron-secret")?.trim() ?? "";
  return bearer === secret || header === secret;
}

function parsePositiveInt(v: string | null, fallback: number, max: number) {
  if (v == null || v === "") return fallback;
  const n = Number.parseInt(v, 10);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(max, n);
}

export async function GET(req: Request) {
  return handleFinalize(req);
}

export async function POST(req: Request) {
  return handleFinalize(req);
}

async function handleFinalize(req: Request) {
  if (!isAuthorizedCron(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  try {
    const url = new URL(req.url);
    const batchLimit = parsePositiveInt(url.searchParams.get("batch"), 50, 200);
    const maxRounds = parsePositiveInt(url.searchParams.get("rounds"), 25, 100);

    const stats = await runOlympiadOverdueFinalization({
      batchLimit,
      maxRounds,
    });

    await recordOlympiadFinalizeHeartbeat({
      at: new Date().toISOString(),
      ok: true,
      finalized: stats.finalized,
      repaired: stats.repaired,
      skipped: stats.skipped,
      errors: stats.errors,
      durationMs: stats.durationMs,
      runId: stats.runId,
      staleSubmittingFinalized: stats.staleSubmittingFinalized,
      staleSubmittingRepaired: stats.staleSubmittingRepaired,
    });

    return NextResponse.json({ ok: true, ...stats });
  } catch (e) {
    Sentry.captureException(e, { tags: { component: "cron", route: "olympiad-finalize" } });
    await recordOlympiadFinalizeHeartbeat({
      at: new Date().toISOString(),
      ok: false,
      errors: 1,
    });
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
