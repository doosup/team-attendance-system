import { Transactional } from '@nestjs-cls/transactional';
import { Injectable } from '@nestjs/common';
import { User } from '../../../../domain/entity/user.entity';
import { CustomException } from '../../../../domain/exception/custom.exception';
import { restoreDrafts } from '../../../../domain/policy/balance.policy';
import { Clock } from '../../../../domain/port/clock.port';
import { AuditLogRepository } from '../../../../domain/repository/audit-log.repository';
import { LedgerRepository } from '../../../../domain/repository/ledger.repository';
import { RequestRepository } from '../../../../domain/repository/request.repository';
import { UserRepository } from '../../../../domain/repository/user.repository';
import { workDateOf } from '../../../../domain/value/work-date';
import { UseCase } from '../../../use-case.interface';

type Input = { lead: User; id: number; ip: string };

// 퇴사 처리 = 소프트 삭제 + 내일 이후 신청 날짜 자동 취소·원장 복원 (결정 A20). 기록은 지우지 않는다
@Injectable()
export class RetireMemberUseCase implements UseCase<Input, void> {
  constructor(
    private readonly clock: Clock,
    private readonly users: UserRepository,
    private readonly requests: RequestRepository,
    private readonly ledger: LedgerRepository,
    private readonly audit: AuditLogRepository,
  ) {}

  @Transactional()
  async execute({ lead, id, ip }: Input): Promise<void> {
    const now = this.clock.now();
    const target = await this.users.findById(id);
    if (!target) throw new CustomException('USER_NOT_FOUND');
    if (target.role === 'LEAD') throw new CustomException('CANNOT_RETIRE_LEAD');

    const today = workDateOf(now);
    const canceledDayIds: number[] = [];
    for (const r of await this.requests.findByUser(id, false)) {
      if (r.props.status !== 'PENDING' && r.props.status !== 'APPROVED') {
        continue;
      }
      const ids = r.cancelForRetirement(lead.id, today, now);
      if (ids.length === 0) continue;
      await this.requests.save(r);
      canceledDayIds.push(...ids);
    }
    const restores = restoreDrafts(
      await this.ledger.findByUser(id),
      canceledDayIds,
    );
    await this.ledger.append(restores);
    await this.users.retire(id, now);

    await this.audit.append({
      actorId: lead.id,
      action: 'USER_RETIRE',
      targetType: 'User',
      targetId: id,
      payload: {
        loginId: target.loginId,
        name: target.name,
        canceledDays: canceledDayIds.length,
        restoredHalfDays: restores.reduce((a, r) => a + r.halfDays, 0),
      },
      ip,
      occurredAt: now,
    });
  }
}
