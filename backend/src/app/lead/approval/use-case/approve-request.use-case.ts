import { Transactional } from '@nestjs-cls/transactional';
import { Injectable } from '@nestjs/common';
import { User } from '../../../../domain/entity/user.entity';
import { CustomException } from '../../../../domain/exception/custom.exception';
import { Clock } from '../../../../domain/port/clock.port';
import { AuditLogRepository } from '../../../../domain/repository/audit-log.repository';
import { RequestRepository } from '../../../../domain/repository/request.repository';
import { RequestResult } from '../../../request/dto/create-request.dto';
import { UseCase } from '../../../use-case.interface';

type Input = { lead: User; requestId: number; ip: string };

// 승인: 잔여는 신청 때 이미 차감했으므로 상태만 바꾼다. 승인 기한은 없다 (결정 14)
@Injectable()
export class ApproveRequestUseCase implements UseCase<Input, RequestResult> {
  constructor(
    private readonly clock: Clock,
    private readonly requests: RequestRepository,
    private readonly audit: AuditLogRepository,
  ) {}

  @Transactional()
  async execute({ lead, requestId, ip }: Input): Promise<RequestResult> {
    const now = this.clock.now();
    const request = await this.requests.findById(requestId);
    if (!request) throw new CustomException('REQUEST_NOT_FOUND');

    request.approve(lead.id, now);
    await this.requests.save(request);
    await this.audit.append({
      actorId: lead.id,
      action: 'REQUEST_APPROVE',
      targetType: 'Request',
      targetId: request.id,
      payload: {
        applicantId: request.props.userId,
        type: request.props.type,
        startDate: request.props.startDate,
        endDate: request.props.endDate,
        isOverLimit: request.props.isOverLimit,
      },
      ip,
      occurredAt: now,
    });
    return RequestResult.from(request);
  }
}
