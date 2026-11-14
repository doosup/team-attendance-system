import {
  Request as RequestModel,
  RequestDay as RequestDayModel,
} from '@prisma/client';
import { Request } from '../../../domain/entity/request.entity';

export const RequestMapper = {
  toEntity(m: RequestModel & { days: RequestDayModel[] }): Request {
    return new Request({
      id: m.id,
      userId: m.userId,
      type: m.type,
      startDate: m.startDate,
      endDate: m.endDate,
      status: m.status,
      isOverLimit: m.isOverLimit,
      reason: m.reason,
      ip: m.ip,
      halfOffPart: m.halfOffPart,
      startTime: m.startTime,
      endTime: m.endTime,
      decidedById: m.decidedById,
      decidedAt: m.decidedAt,
      rejectReason: m.rejectReason,
      days: [...m.days]
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((d) => ({
          id: d.id,
          date: d.date,
          status: d.status,
          cancelType: d.cancelType,
          canceledById: d.canceledById,
          canceledAt: d.canceledAt,
          cancelReason: d.cancelReason,
        })),
    });
  },
};
