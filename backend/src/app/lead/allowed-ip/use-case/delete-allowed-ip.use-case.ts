import { Transactional } from '@nestjs-cls/transactional';
import { Injectable } from '@nestjs/common';
import { User } from '../../../../domain/entity/user.entity';
import { CustomException } from '../../../../domain/exception/custom.exception';
import { Clock } from '../../../../domain/port/clock.port';
import { AllowedIpRepository } from '../../../../domain/repository/allowed-ip.repository';
import { AuditLogRepository } from '../../../../domain/repository/audit-log.repository';
import { UseCase } from '../../../use-case.interface';

type Input = { lead: User; id: number; ip: string };

// 소프트 삭제. 스스로 잠기지 않도록 지금 접속 중인 IP와 마지막 남은 IP는 막는다 (결정 19)
@Injectable()
export class DeleteAllowedIpUseCase implements UseCase<Input, void> {
  constructor(
    private readonly clock: Clock,
    private readonly ips: AllowedIpRepository,
    private readonly audit: AuditLogRepository,
  ) {}

  @Transactional()
  async execute({ lead, id, ip }: Input): Promise<void> {
    const active = await this.ips.findActive();
    const target = active.find((a) => a.id === id);
    if (!target) throw new CustomException('ALLOWED_IP_NOT_FOUND');
    if (target.ip === ip) throw new CustomException('CANNOT_DELETE_CURRENT_IP');
    if (active.length === 1) throw new CustomException('CANNOT_DELETE_LAST_IP');

    await this.ips.softDelete(id);
    await this.audit.append({
      actorId: lead.id,
      action: 'ALLOWED_IP_DELETE',
      targetType: 'AllowedIp',
      targetId: id,
      payload: { ip: target.ip, label: target.label },
      ip,
      occurredAt: this.clock.now(),
    });
  }
}
