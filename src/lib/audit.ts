import { prisma } from "@/lib/prisma";

export type AuditPayload = {
  actorUserId: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
};

export async function writeAuditLog(payload: AuditPayload) {
  await prisma.auditLog.create({
    data: {
      actorUserId: payload.actorUserId,
      action: payload.action,
      entityType: payload.entityType,
      entityId: payload.entityId ?? null,
      metadataJson: payload.metadata ? JSON.stringify(payload.metadata) : "{}",
    },
  });
}
