import { TransactionHost } from '@nestjs-cls/transactional';
import { Injectable } from '@nestjs/common';
import { Request } from '../../../domain/entity/request.entity';
import { RequestStatus } from '../../../domain/repository/request-day.repository';
import { RequestRepository } from '../../../domain/repository/request.repository';
import { RequestMapper } from '../mapper/request.mapper';
import type { PrismaTx } from '../transaction';

@Injectable()
export class PrismaRequestRepository extends RequestRepository {
  constructor(private readonly txHost: TransactionHost) {
    super();
  }

  private get tx() {
    return (this.txHost as PrismaTx).tx;
  }

  async create(request: Request): Promise<Request> {
    const { id: _id, days, ...data } = request.props;
    const m = await this.tx.request.create({
      data: {
        ...data,
        days: {
          create: days.map(({ id: _dayId, ...d }) => ({
            ...d,
            userId: data.userId,
          })),
        },
      },
      include: { days: true },
    });
    return RequestMapper.toEntity(m);
  }

  async findById(id: number): Promise<Request | null> {
    const m = await this.tx.request.findUnique({
      where: { id },
      include: { days: true },
    });
    return m && RequestMapper.toEntity(m);
  }

  async findByStatus(status: RequestStatus): Promise<Request[]> {
    const rows = await this.tx.request.findMany({
      where: { status },
      include: { days: true },
      orderBy: [{ startDate: 'asc' }, { id: 'asc' }],
    });
    return rows.map((m) => RequestMapper.toEntity(m));
  }

  async save(request: Request): Promise<void> {
    const p = request.props;
    await this.tx.request.update({
      where: { id: request.id },
      data: {
        status: p.status,
        decidedById: p.decidedById,
        decidedAt: p.decidedAt,
        rejectReason: p.rejectReason,
      },
    });
    for (const d of p.days) {
      if (d.id === null) continue;
      await this.tx.requestDay.update({
        where: { id: d.id },
        data: {
          status: d.status,
          cancelType: d.cancelType,
          canceledById: d.canceledById,
          canceledAt: d.canceledAt,
          cancelReason: d.cancelReason,
        },
      });
    }
  }

  async findByUser(
    userId: number,
    includeCanceled: boolean,
  ): Promise<Request[]> {
    const rows = await this.tx.request.findMany({
      where: {
        userId,
        ...(includeCanceled ? {} : { status: { not: 'CANCELED' } }),
      },
      include: { days: true },
      orderBy: [{ startDate: 'desc' }, { id: 'desc' }],
    });
    return rows.map((m) => RequestMapper.toEntity(m));
  }
}
