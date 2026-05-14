import { Prisma } from "@prisma/client";

/**
 * Applies publish state + per-class dense ranks entirely in PostgreSQL.
 *
 * WHY: Loading every `OlympiadResult` into Node for sorting/ranking does not scale
 * (memory + CPU) for large olympiads. `DENSE_RANK()` matches the previous rule:
 * same score shares a rank within each grade group; rank advances only when score drops.
 */
export async function executeOlympiadPublishRankingInTx(
  tx: Prisma.TransactionClient,
  params: { olympiadId: string; includeAutoFinalized: boolean; approvedAt: Date },
): Promise<void> {
  const { olympiadId, includeAutoFinalized, approvedAt } = params;

  const eligibleFilter = includeAutoFinalized
    ? Prisma.sql`TRUE`
    : Prisma.sql`r."autoFinalized" = false`;

  // First publish everyone and clear ranks so excluded rows (auto-finalized when filtered out) stay rank=null.
  await tx.$executeRaw`
    UPDATE "OlympiadResult"
    SET "published" = true, "approvedAt" = ${approvedAt}, "rank" = NULL
    WHERE "olympiadId" = ${olympiadId}
  `;

  await tx.$executeRaw`
    WITH ranked AS (
      SELECT r.id,
        DENSE_RANK() OVER (
          PARTITION BY COALESCE(NULLIF(TRIM(BOTH FROM p."gradeLabel"), ''), '—')
          ORDER BY COALESCE(r.score, 0) DESC
        ) AS rk
      FROM "OlympiadResult" r
      INNER JOIN "OlympiadParticipant" p ON p.id = r."participantId"
      WHERE r."olympiadId" = ${olympiadId}
        AND (${eligibleFilter})
    )
    UPDATE "OlympiadResult" r
    SET "rank" = ranked.rk
    FROM ranked
    WHERE r.id = ranked.id
  `;
}
