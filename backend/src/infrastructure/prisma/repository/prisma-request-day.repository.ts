import { Injectable } from '@nestjs/common';
import {
  DayRequest,
  RequestDayRepository,
} from '../../../domain/repository/request-day.repository';
import type { PrismaTx } from '../transaction';
import { TransactionHost } from '@nestjs-cls/transactional';

@Injectable()
export class PrismaRequestDayRepository extends RequestDayRepository {
  constructor(private readonly txHost: TransactionHost) {
    super();
  }

  private get tx() {
    return (this.txHost as PrismaTx).tx;
  }

  async findForUserOnDate(userId: number, date: string): Promise<DayRequest[]> {
    const rows = await this.tx.requestDay.findMany({
      where: { userId, date },
      include: { request: { select: { type: true, status: true } } },
    });
    return rows.map((r) => ({
      requestDayId: r.id,
      type: r.request.type,
      requestStatus: r.request.status,
      dayStatus: r.status,
      cancelType: r.cancelType,
    }));
  }

  async countRemoteDays(userId: number, month: string) {
    const rows = await this.tx.requestDay.findMany({
      where: {
        userId,
        date: { startsWith: `${month}-` },
        status: 'ACTIVE',
        request: { type: 'REMOTE', status: { in: ['PENDING', 'APPROVED'] } },
      },
      select: { request: { select: { isOverLimit: true } } },
    });
    const overLimit = rows.filter((r) => r.request.isOverLimit).length;
    return { normal: rows.length - overLimit, overLimit };
  }

  async findLiveDates(userId: number, dates: string[]) {
    const rows = await this.tx.requestDay.findMany({
      where: {
        userId,
        date: { in: dates },
        status: 'ACTIVE',
        request: { status: { in: ['PENDING', 'APPROVED'] } },
      },
      select: { date: true },
    });
    return rows.map((r) => r.date);
  }
}
