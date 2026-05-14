import { z } from "zod";

export const olympiadJoinSchema = z.object({
  firstName: z.string().trim().min(1, "Ism kiriting").max(80),
  lastName: z.string().trim().min(1, "Familiya kiriting").max(80),
  gradeLabel: z.string().trim().min(1, "Sinf kiriting").max(40),
  age: z.coerce.number().int().min(6).max(99),
  schoolName: z.string().trim().min(1, "Maktab nomi").max(200),
  region: z.string().trim().min(1, "Hudud").max(120),
  phone: z
    .string()
    .trim()
    .max(32)
    .optional()
    .transform((v) => (v === "" ? undefined : v)),
  accessCode: z.string().trim().min(4, "Kod juda qisqa").max(64),
  deviceFp: z.string().max(2000).optional(),
  website: z.string().max(10).optional(),
});

export type OlympiadJoinInput = z.infer<typeof olympiadJoinSchema>;

function clampInt(n: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(n)));
}

/**
 * GET /api/olympiad/monitor/:id — query parametrlar (cheklangan, xavfsiz).
 */
export const olympiadMonitorGetQuerySchema = z.object({
  limit: z
    .string()
    .max(24)
    .optional()
    .transform((s) => clampInt(Number(s ?? "120"), 20, 200, 120)),
  violationLimit: z
    .string()
    .max(24)
    .optional()
    .transform((s) => clampInt(Number(s ?? "6"), 0, 20, 6)),
  cursor: z
    .string()
    .max(240)
    .optional()
    .transform((s) => {
      const t = s?.trim();
      return t && t.length > 0 ? t : null;
    })
    .refine((c) => c == null || c.includes("|"), { message: "invalid_cursor" }),
});

export type OlympiadMonitorGetQuery = z.infer<typeof olympiadMonitorGetQuerySchema>;

/** WHY: Fail closed on malformed integrity probes — prevents wide scans from arbitrary strings. */
export const olympiadMonitorIntegrityQuerySchema = z.object({
  sessionId: z.string().trim().min(20).max(40),
});

export type OlympiadMonitorIntegrityQuery = z.infer<typeof olympiadMonitorIntegrityQuerySchema>;

/** WHY: Route params must match Prisma cuid shape before any DB work (injection + wasted queries). */
export const olympiadIdParamSchema = z.string().trim().min(20).max(40).regex(/^c[a-z0-9]+$/i);
