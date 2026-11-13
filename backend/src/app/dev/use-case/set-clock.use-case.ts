import { Injectable } from '@nestjs/common';
import { User } from '../../../domain/entity/user.entity';
import { Clock, ClockControl } from '../../../domain/port/clock.port';
import { AuditLogRepository } from '../../../domain/repository/audit-log.repository';
import { UseCase } from '../../use-case.interface';
import { ClockResult } from '../dto/get-clock.dto';

type Input = { user: User; ip: string; now: string };

@Injectable()
export class SetClockUseCase implements UseCase<Input, ClockResult> {
  constructor(
    private readonly clock: Clock,
    private readonly control: ClockControl,
    private readonly audit: AuditLogRepository,
  ) {}

  async execute({ user, ip, now }: Input): Promise<ClockResult> {
    const from = this.clock.now();
    this.control.set(new Date(now));
    const to = this.clock.now();
    // occurredAt은 바뀐 시각 기준, createdAt(실제 시각)과 비교하면 시각을 바꾼 기록인지 보인다
    await this.audit.append({
      actorId: user.id,
      action: 'CLOCK_CHANGE',
      targetType: null,
      targetId: null,
      payload: { from: from.toISOString(), to: to.toISOString(), reset: false },
      ip,
      occurredAt: to,
    });
    return ClockResult.of(to, this.control.isOverridden());
  }
}
