import { Injectable } from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import { PrismaService } from 'src/db/prisma.service';
import { PrismaTx } from 'src/db/prisma.service';

export interface AuditLogEntry {
  userId?: string;
  action: string;
  entity: string;
  entityId?: string;
  details?: Prisma.InputJsonValue;
  ipAddress?: string;
}

@Injectable()
export class AuditLogService {
  constructor(private readonly prisma: PrismaService) {}

  async log(entry: AuditLogEntry, tx?: PrismaTx) {
    const client = tx ?? this.prisma;
    return client.auditLog.create({
      data: {
        userId: entry.userId,
        action: entry.action,
        entity: entry.entity,
        entityId: entry.entityId,
        details: entry.details ?? undefined,
        ipAddress: entry.ipAddress,
      },
    });
  }

  async logMany(entries: AuditLogEntry[], tx?: PrismaTx) {
    const client = tx ?? this.prisma;
    return client.auditLog.createMany({
      data: entries.map((e) => ({
        userId: e.userId,
        action: e.action,
        entity: e.entity,
        entityId: e.entityId,
        details: e.details ?? undefined,
        ipAddress: e.ipAddress,
      })),
    });
  }
}
