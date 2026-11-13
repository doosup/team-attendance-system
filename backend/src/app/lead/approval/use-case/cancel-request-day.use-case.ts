import { Transactional } from '@nestjs-cls/transactional';
import { Injectable } from '@nestjs/common';
import { User } from '../../../../domain/entity/user.entity';
import { CustomException } from '../../../../domain/exception/custom.exception';
import { restoreDrafts } from '../../../../domain/policy/balance.policy';
import { Clock } from '../../../../domain/port/clock.port';
import { AttendanceRepository } from '../../../../domain/repository/attendance.repository';
import { AuditLogRepository } from '../../../../domain/repository/audit-log.repository';
import { LedgerRepository } from '../../../../domain/repository/ledger.repository';
import { RequestRepository } from '../../../../domain/repository/request.repository';
import { isBusinessDay } from '../../../../domain/value/business-day';
import { workDateOf } from '../../../../domain/value/work-date';
import { RequestResult } from '../../../request/dto/create-request.dto';
import { UseCase } from '../../../use-case.interface';

type Input = {
  lead: User;
  requestId: number;
  date: string;
  cancelReason: string;
  ip: string;
};

/**
 * 리드 당일 취소: 승인된 신청의 오늘 하루만 (결정 12, A15). 그날은 긴급 출근이 되고
 * 그날 연차·OFF만 복원(원래 만료일 유지). 이미 출근한 기록이 있으면 긴급 출근으로 바꾼다 (A16).
 */
@Injectable()
export class CancelRequestDayUseCase implements UseCase<Input, RequestResult> {
  constructor(
    private readonly clock: Clock,
    private readonly requests: RequestRepository,
    private readonly ledger: LedgerRepository,
    private readonly attendances: AttendanceRepository,
    private readonly audit: AuditLogRepository,
  ) {}

  @Transactional()
  async execute({ lead, requestId, date, cancelReason, ip }: Input) {
    const now = this.clock.now();
    if (date !== workDateOf(now)) throw new CustomException('NOT_SAME_DAY');
    const request = await this.requests.findById(requestId);
    if (!request) throw new CustomException('REQUEST_NOT_FOUND');

    const dayId = request.cancelDay(date, lead.id, cancelReason.trim(), now);
    await this.requests.save(request);
    const restores = restoreDrafts(
      await this.ledger.findByUser(request.props.userId),
      [dayId],
    );
    await this.ledger.append(restores);

    const attendance = await this.attendances.findByUserAndDate(
      request.props.userId,
      date,
    );
    // 주말 근무 취소는 근무 자체가 없어지는 것이라 긴급 출근으로 바꾸지 않는다
    if (attendance && isBusinessDay(date)) {
      attendance.toEmergency();
      await this.attendances.save(attendance);
    }

    await this.audit.append({
      actorId: lead.id,
      action: 'REQUEST_DAY_CANCEL',
      targetType: 'Request',
      targetId: request.id,
      payload: {
        applicantId: request.props.userId,
        type: request.props.type,
        date,
        requestDayId: dayId,
        cancelReason: cancelReason.trim(),
        restoredHalfDays: restores.reduce((a, r) => a + r.halfDays, 0),
        convertedAttendanceId: attendance?.id ?? null,
      },
      ip,
      occurredAt: now,
    });
    return RequestResult.from(request);
  }
}
