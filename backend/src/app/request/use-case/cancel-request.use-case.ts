import { Transactional } from '@nestjs-cls/transactional';
import { Injectable } from '@nestjs/common';
import { User } from '../../../domain/entity/user.entity';
import { CustomException } from '../../../domain/exception/custom.exception';
import { restoreDrafts } from '../../../domain/policy/balance.policy';
import { deadlineOf } from '../../../domain/policy/request.policy';
import { Clock } from '../../../domain/port/clock.port';
import { AuditLogRepository } from '../../../domain/repository/audit-log.repository';
import { LedgerRepository } from '../../../domain/repository/ledger.repository';
import { RequestRepository } from '../../../domain/repository/request.repository';
import { workDateOf } from '../../../domain/value/work-date';
import { UseCase } from '../../use-case.interface';
import { RequestResult } from '../dto/create-request.dto';

type Input = { user: User; requestId: number; ip: string };

// 본인 취소: 기간 전체만, 시작일의 직전 영업일 17:00:00까지 (결정 12·15). 기간 변경은 취소 후 재신청
@Injectable()
export class CancelRequestUseCase implements UseCase<Input, RequestResult> {
  constructor(
    private readonly clock: Clock,
    private readonly requests: RequestRepository,
    private readonly ledger: LedgerRepository,
    private readonly audit: AuditLogRepository,
  ) {}

  @Transactional()
  async execute({ user, requestId, ip }: Input): Promise<RequestResult> {
    const now = this.clock.now();
    const request = await this.requests.findById(requestId);
    // 남의 신청은 없는 것처럼 응답 (존재 여부를 드러내지 않음)
    if (!request || request.props.userId !== user.id) {
      throw new CustomException('REQUEST_NOT_FOUND');
    }
    const { startDate, endDate, isAfterDeadline, status } = request.props;
    const today = workDateOf(now);
    // 기한 후 예외 신청은 리드 결정 전·시작 전이면 철회 가능: 기한 안 취소와 마찬가지로 팀에 손해 없음 (A22)
    const withdrawable =
      isAfterDeadline && status === 'PENDING' && startDate > today;
    if (now > deadlineOf(startDate) && !withdrawable) {
      const inProgress = startDate <= today && today <= endDate;
      throw new CustomException(
        inProgress ? 'SAME_DAY_CANCEL_LEAD_ONLY' : 'REQUEST_DEADLINE_PASSED',
      );
    }

    const canceledDayIds = request.cancelBySelf(user.id, now);
    await this.requests.save(request);
    const restores = restoreDrafts(
      await this.ledger.findByUser(user.id),
      canceledDayIds,
    );
    await this.ledger.append(restores);
    await this.audit.append({
      actorId: user.id,
      action: 'REQUEST_CANCEL',
      targetType: 'Request',
      targetId: request.id,
      payload: {
        type: request.props.type,
        startDate,
        endDate,
        canceledDayIds,
        restoredHalfDays: restores.reduce((a, r) => a + r.halfDays, 0),
      },
      ip,
      occurredAt: now,
    });
    return RequestResult.from(request);
  }
}
