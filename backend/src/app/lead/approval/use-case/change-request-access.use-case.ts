import { Transactional } from '@nestjs-cls/transactional';
import { Injectable } from '@nestjs/common';
import { isValidIp, normalizeIp } from '../../../../common/utils/ip.util';
import { Access } from '../../../../domain/entity/request.entity';
import { User } from '../../../../domain/entity/user.entity';
import { CustomException } from '../../../../domain/exception/custom.exception';
import { Clock } from '../../../../domain/port/clock.port';
import { AuditLogRepository } from '../../../../domain/repository/audit-log.repository';
import { RequestRepository } from '../../../../domain/repository/request.repository';
import { workDateOf } from '../../../../domain/value/work-date';
import { RequestResult } from '../../../request/dto/create-request.dto';
import { UseCase } from '../../../use-case.interface';

type Input = {
  lead: User;
  requestId: number;
  access: Access; // 바꿀 접속 IP·시간대
  reason: string;
  clientIp: string; // 리드가 접속한 IP (이력용)
};

/**
 * 재택·주말 근무 신청의 접속 IP·시간대를 리드가 바꾼다 (A23).
 * IpGuard가 신청서의 IP를 매 요청 읽으므로 바꾼 IP는 바로 허용, 예전 IP는 차단. 전·후 값은 이력에
 */
@Injectable()
export class ChangeRequestAccessUseCase implements UseCase<
  Input,
  RequestResult
> {
  constructor(
    private readonly clock: Clock,
    private readonly requests: RequestRepository,
    private readonly audit: AuditLogRepository,
  ) {}

  @Transactional()
  async execute({ lead, requestId, access, reason, clientIp }: Input) {
    const now = this.clock.now();
    const why = reason.trim();
    if (!why)
      throw new CustomException('VALIDATION_FAILED', '사유가 필요합니다');
    const after = { ...access, ip: normalizeIp(access.ip) };
    if (!isValidIp(after.ip)) throw new CustomException('INVALID_IP_FORMAT');

    const request = await this.requests.findById(requestId);
    if (!request) throw new CustomException('REQUEST_NOT_FOUND');
    const before = request.changeAccess(
      lead.id,
      after,
      why,
      workDateOf(now),
      now,
    );
    await this.requests.saveAccess(request);
    await this.audit.append({
      actorId: lead.id,
      action: 'REQUEST_ACCESS_CHANGE',
      targetType: 'Request',
      targetId: request.id,
      payload: {
        applicantId: request.props.userId,
        type: request.props.type,
        startDate: request.props.startDate,
        endDate: request.props.endDate,
        before,
        after,
        reason: why,
      },
      ip: clientIp,
      occurredAt: now,
    });
    return RequestResult.from(request);
  }
}
