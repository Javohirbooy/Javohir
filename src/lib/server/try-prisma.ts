import { logStructured } from "@/lib/logger";

/**
 * Server komponentlarida Prisma (yoki boshqa async) xatosi butun segment `error.tsx` ga
 * tushmasin — foydalanuvchiga tushunarli fallback berish uchun.
 */
export async function tryPrismaPage<T>(
  event: string,
  fn: () => Promise<T>,
  logFields?: Record<string, string | undefined>,
): Promise<{ ok: true; data: T } | { ok: false }> {
  try {
    return { ok: true, data: await fn() };
  } catch (e) {
    logStructured("error", event, {
      message: e instanceof Error ? e.message : String(e),
      ...logFields,
    });
    return { ok: false };
  }
}
