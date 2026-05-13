import type { Prisma } from "@prisma/client";

/**
 * Email PostgreSQL `TEXT` ustunda registr bilan solishtiriladi — tarixiy ma’lumotlarda
 * turli registr bo‘lishi mumkin. Kirishda identifikator oldindan `trim().toLowerCase()` qilinadi.
 *
 * @see prisma/schema.prisma — `User.email` unique (registrga sezgir); ma’lumotlarni normallashtirish skripti: `npm run db:integrity`
 */
export function prismaEmailInsensitive(lowerTrimmedEmail: string): Prisma.StringFilter {
  return { equals: lowerTrimmedEmail, mode: "insensitive" };
}
