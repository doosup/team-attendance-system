import { TransactionHost } from '@nestjs-cls/transactional';
import { Injectable } from '@nestjs/common';
import { Request } from '../../../domain/entity/request.entity';
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
