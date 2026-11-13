import { TransactionHost } from '@nestjs-cls/transactional';
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  AuditDraft,
  AuditLogView,
} from '../../../domain/entity/audit-log.entity';
import {
  AuditLogFilter,
  AuditLogRepository,
} from '../../../domain/repository/audit-log.repository';
import type { PrismaTx } from '../transaction';

@Injectable()
export class PrismaAuditLogRepository extends AuditLogRepository {
  constructor(private readonly txHost: TransactionHost) {
    super();
  }

  private get tx() {
    return (this.txHost as PrismaTx).tx;
  }

  async append(e: AuditDraft): Promise<void> {
    await this.tx.auditLog.create({
      data: { ...e, payload: e.payload as Prisma.InputJsonObject },
    });
  }

  async find(f: AuditLogFilter): Promise<AuditLogView[]> {
    const rows = await this.tx.auditLog.findMany({
      where: {
        actorId: f.actorId,
        occurredAt: { gte: f.from, lt: f.to },
      },
      include: { actor: { select: { name: true } } },
      orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
      take: f.limit,
    });
    return rows.map(({ actor, payload, ...r }) => ({
      ...r,
      action: r.action,
      payload: (payload ?? {}) as Record<string, unknown>,
      actorName: actor?.name ?? null,
    }));
  }
}
