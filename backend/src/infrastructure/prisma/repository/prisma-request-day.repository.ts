import { Injectable } from '@nestjs/common';
import {
  DayRequest,
  RequestDayRepository,
} from '../../../domain/repository/request-day.repository';
import { PrismaService } from '../prisma.service';

@Injectable()
export class PrismaRequestDayRepository extends RequestDayRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findForUserOnDate(userId: number, date: string): Promise<DayRequest[]> {
    const rows = await this.prisma.requestDay.findMany({
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
}
