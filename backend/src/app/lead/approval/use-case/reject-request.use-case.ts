import { Transactional } from '@nestjs-cls/transactional';
import { Injectable } from '@nestjs/common';
import { User } from '../../../../domain/entity/user.entity';
import { CustomException } from '../../../../domain/exception/custom.exception';
import { restoreDrafts } from '../../../../domain/policy/balance.policy';
import { Clock } from '../../../../domain/port/clock.port';
import { AuditLogRepository } from '../../../../domain/repository/audit-log.repository';
import { LedgerRepository } from '../../../../domain/repository/ledger.repository';
import { RequestRepository } from '../../../../domain/repository/request.repository';
import { RequestResult } from '../../../request/dto/create-request.dto';
import { UseCase } from '../../../use-case.interface';

type Input = {
  lead: User;
  requestId: number;
  rejectReason: string;
  ip: string;
};

// 반려: 상태 변경 + 신청 때 차감한 잔여를 날짜 행마다 복원 (한 트랜잭션)
@Injectable()
export class RejectRequestUseCase implements UseCase<Input, RequestResult> {
  constructor(
    private readonly clock: Clock,
    private readonly requests: RequestRepository,
    private readonly ledger: LedgerRepository,
    private readonly audit: AuditLogRepository,
  ) {}

  @Transactional()
  async execute({ lead, requestId, rejectReason, ip }: Input) {
    const now = this.clock.now();
    const request = await this.requests.findById(requestId);
    if (!request) throw new CustomException('REQUEST_NOT_FOUND');

    request.reject(lead.id, rejectReason.trim(), now);
    await this.requests.save(request);
    const restores = restoreDrafts(
      await this.ledger.findByUser(request.props.userId),
      request.dayIds,
    );
    await this.ledger.append(restores);
    await this.audit.append({
      actorId: lead.id,
      action: 'REQUEST_REJECT',
      targetType: 'Request',
      targetId: request.id,
      payload: {
        applicantId: request.props.userId,
        type: request.props.type,
        startDate: request.props.startDate,
        endDate: request.props.endDate,
        rejectReason: request.props.rejectReason,
        restoredHalfDays: restores.reduce((a, r) => a + r.halfDays, 0),
      },
      ip,
      occurredAt: now,
    });
    return RequestResult.from(request);
  }
}
