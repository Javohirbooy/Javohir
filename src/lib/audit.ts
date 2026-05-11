import { prisma } from "@/lib/prisma";

export type AuditPayload = {
  /** Tizim ishlar (cron/worker) uchun `null`. */
  actorUserId?: string | null;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
};

export async function writeAuditLog(payload: AuditPayload) {
  await prisma.auditLog.create({
    data: {
      actorUserId: payload.actorUserId ?? null,
      action: payload.action,
      entityType: payload.entityType ?? null,
      entityId: payload.entityId ?? null,
      metadataJson: payload.metadata ? JSON.stringify(payload.metadata) : "{}",
    },
  });
}
