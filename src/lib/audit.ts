import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";

export async function audit(input: {
  actorId?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  metadata?: Prisma.InputJsonValue;
  ipAddress?: string | null;
}) {
  await prisma.auditLog.create({
    data: {
      action: input.action,
      resourceType: input.resourceType,
      resourceId: input.resourceId ?? null,
      metadata: input.metadata,
      ipAddress: input.ipAddress ?? null,

      ...(input.actorId
        ? {
            actor: {
              connect: {
                id: input.actorId,
              },
            },
          }
        : {}),
    },
  });
}