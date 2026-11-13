import { Transactional } from '@nestjs-cls/transactional';
import { Injectable } from '@nestjs/common';
import { isValidIp, normalizeIp } from '../../../common/utils/ip.util';
import { LedgerDraft } from '../../../domain/entity/ledger-entry.entity';
import { Request } from '../../../domain/entity/request.entity';
import { User } from '../../../domain/entity/user.entity';
import { CustomException } from '../../../domain/exception/custom.exception';
import { balanceOf, pickOffGrant } from '../../../domain/policy/balance.policy';
import {
  assertBeforeDeadline,
  datesForRequest,
  isRemoteOverLimit,
} from '../../../domain/policy/request.policy';
import { Clock } from '../../../domain/port/clock.port';
import { AuditLogRepository } from '../../../domain/repository/audit-log.repository';
import { LedgerRepository } from '../../../domain/repository/ledger.repository';
import { RequestDayRepository } from '../../../domain/repository/request-day.repository';
import { RequestRepository } from '../../../domain/repository/request.repository';
import { workDateOf } from '../../../domain/value/work-date';
import { syncLedger } from '../../balance/sync-ledger';
import { UseCase } from '../../use-case.interface';
import { CreateRequestRequest, RequestResult } from '../dto/create-request.dto';

type Input = { user: User; input: CreateRequestRequest; ip: string };

// 신청: 날짜 계산 → 기한 → 중복 → 재택 한도 → 잔여 → 저장 → 원장 차감 (한 트랜잭션)
@Injectable()
export class CreateRequestUseCase implements UseCase<Input, RequestResult> {
  constructor(
    private readonly clock: Clock,
    private readonly requests: RequestRepository,
    private readonly requestDays: RequestDayRepository,
    private readonly ledger: LedgerRepository,
    private readonly audit: AuditLogRepository,
  ) {}

  @Transactional()
  async execute({ user, input, ip }: Input): Promise<RequestResult> {
    const now = this.clock.now();
    const today = workDateOf(now);
    const { type, startDate, endDate } = input;
    const reason = input.reason?.trim() ?? '';

    const dates = datesForRequest(type, startDate, endDate);
    assertBeforeDeadline(now, startDate);
    const window = this.ipAndTime(input);

    if ((await this.requestDays.findLiveDates(user.id, dates)).length > 0) {
      throw new CustomException('OVERLAPPING_REQUEST');
    }

    const isOverLimit =
      type === 'REMOTE' &&
      isRemoteOverLimit(dates, await this.remoteDaysByMonth(user.id, dates));
    if (isOverLimit && !reason) {
      throw new CustomException('OVER_LIMIT_REASON_REQUIRED');
    }

    const entries = await syncLedger(this.ledger, user, today);
    if (
      type === 'ANNUAL' &&
      balanceOf(entries, today).annual < dates.length * 2
    ) {
      throw new CustomException('INSUFFICIENT_BALANCE');
    }
    const grantId =
      type === 'HALF_OFF' ? pickOffGrant(entries, dates[0], today) : null;
    if (type === 'HALF_OFF' && grantId === null) {
      throw new CustomException('INSUFFICIENT_BALANCE');
    }

    const saved = await this.requests.create(
      Request.submit(
        { type, startDate, endDate, isOverLimit, reason, ...window },
        user,
        dates,
        now,
      ),
    );

    // 잔여는 신청 시 날짜 행마다 차감 (결정 14). 반려·취소 시 같은 단위로 복원
    const uses: LedgerDraft[] = saved.props.days.flatMap((d) => {
      if (type !== 'ANNUAL' && type !== 'HALF_OFF') return [];
      return [
        {
          userId: user.id,
          kind: type,
          event: 'USE' as const,
          halfDays: type === 'ANNUAL' ? -2 : -1,
          effectiveDate: d.date,
          expiresOn: null,
          grantId,
          requestDayId: d.id,
          dedupKey: null,
        },
      ];
    });
    await this.ledger.append(uses);
    await this.audit.append({
      actorId: user.id,
      action: 'REQUEST_CREATE',
      targetType: 'Request',
      targetId: saved.id,
      payload: {
        type,
        startDate,
        endDate,
        dates,
        status: saved.props.status,
        isOverLimit,
        autoApproved: saved.props.status === 'APPROVED',
      },
      ip,
      occurredAt: now,
    });
    return RequestResult.from(saved);
  }

  private ipAndTime(input: CreateRequestRequest) {
    if (input.type !== 'REMOTE' && input.type !== 'WEEKEND_WORK') {
      return { ip: null, startTime: null, endTime: null };
    }
    const ip = normalizeIp(input.ip ?? '');
    if (!isValidIp(ip)) throw new CustomException('INVALID_IP_FORMAT');
    const { startTime = '', endTime = '' } = input;
    if (startTime >= endTime) {
      throw new CustomException(
        'VALIDATION_FAILED',
        'startTime은 endTime보다 일러야 합니다',
      );
    }
    return { ip, startTime, endTime };
  }

  private async remoteDaysByMonth(userId: number, dates: string[]) {
    const months = [...new Set(dates.map((d) => d.slice(0, 7)))];
    const byMonth: Record<string, number> = {};
    for (const m of months) {
      const { normal, overLimit } = await this.requestDays.countRemoteDays(
        userId,
        m,
      );
      byMonth[m] = normal + overLimit;
    }
    return byMonth;
  }
}
