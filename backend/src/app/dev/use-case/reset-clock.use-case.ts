import { Injectable } from '@nestjs/common';
import { User } from '../../../domain/entity/user.entity';
import { Clock, ClockControl } from '../../../domain/port/clock.port';
import { AuditLogRepository } from '../../../domain/repository/audit-log.repository';
import { UseCase } from '../../use-case.interface';
import { ClockResult } from '../dto/get-clock.dto';

type Input = { user: User; ip: string };

@Injectable()
export class ResetClockUseCase implements UseCase<Input, ClockResult> {
  constructor(
    private readonly clock: Clock,
    private readonly control: ClockControl,
    private readonly audit: AuditLogRepository,
  ) {}

  async execute({ user, ip }: Input): Promise<ClockResult> {
    const from = this.clock.now();
    this.control.reset();
    const to = this.clock.now();
    await this.audit.append({
      actorId: user.id,
      action: 'CLOCK_CHANGE',
      targetType: null,
      targetId: null,
      payload: { from: from.toISOString(), to: to.toISOString(), reset: true },
      ip,
      occurredAt: to,
    });
    return ClockResult.of(to, this.control.isOverridden());
  }
}
