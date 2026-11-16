import type { Prisma } from "@prisma/client";
import { prisma } from "../db";

export interface RecordAuditLogInput {
  actorUserId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Prisma.InputJsonValue;
  ipAddress?: string | null;
}

export async function recordAuditLog(
  input: RecordAuditLogInput,
  tx?: Prisma.TransactionClient
): Promise<void> {
  const client = tx ?? prisma;
  await client.auditLog.create({
    data: {
      actorUserId: input.actorUserId ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      metadataJson: input.metadata ?? undefined,
      ipAddress: input.ipAddress ?? null,
    },
  });
}
