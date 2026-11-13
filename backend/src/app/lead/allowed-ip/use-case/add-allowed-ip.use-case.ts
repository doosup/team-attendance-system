import { Transactional } from '@nestjs-cls/transactional';
import { Injectable } from '@nestjs/common';
import { isValidIp, normalizeIp } from '../../../../common/utils/ip.util';
import { User } from '../../../../domain/entity/user.entity';
import { CustomException } from '../../../../domain/exception/custom.exception';
import { Clock } from '../../../../domain/port/clock.port';
import { AllowedIpRepository } from '../../../../domain/repository/allowed-ip.repository';
import { AuditLogRepository } from '../../../../domain/repository/audit-log.repository';
import { UseCase } from '../../../use-case.interface';
import { AddAllowedIpBody } from '../dto/add-allowed-ip.dto';
import { AllowedIpResult } from '../dto/get-allowed-ips.dto';

type Input = { lead: User; ip: string; body: AddAllowedIpBody };

// 형식은 최소 검사(net.isIP), CIDR 미지원. 살아 있는 것 중 중복만 막는다 (ip 유일 제약 없음, 결정 19)
@Injectable()
export class AddAllowedIpUseCase implements UseCase<Input, AllowedIpResult> {
  constructor(
    private readonly clock: Clock,
    private readonly ips: AllowedIpRepository,
    private readonly audit: AuditLogRepository,
  ) {}

  @Transactional()
  async execute({ lead, ip, body }: Input): Promise<AllowedIpResult> {
    const target = normalizeIp(body.ip);
    if (!isValidIp(target)) throw new CustomException('INVALID_IP_FORMAT');
    if (await this.ips.isAllowed(target)) {
      throw new CustomException('DUPLICATE_ALLOWED_IP');
    }
    const label = body.label.trim();
    const saved = await this.ips.create(target, label, lead.id);
    await this.audit.append({
      actorId: lead.id,
      action: 'ALLOWED_IP_ADD',
      targetType: 'AllowedIp',
      targetId: saved.id,
      payload: { ip: target, label },
      ip,
      occurredAt: this.clock.now(),
    });
    return AllowedIpResult.from(saved);
  }
}
