import { Injectable } from '@nestjs/common';
import { Clock, ClockControl } from '../../../domain/port/clock.port';
import { UseCase } from '../../use-case.interface';
import { ClockResult } from '../dto/get-clock.dto';
import { SetClockRequest } from '../dto/set-clock.dto';

// shortcut: CLOCK_CHANGE 이력은 아직 남기지 않음, ATT-6(AuditLog 저장소)에서 연결.
@Injectable()
export class SetClockUseCase implements UseCase<SetClockRequest, ClockResult> {
  constructor(
    private readonly clock: Clock,
    private readonly control: ClockControl,
  ) {}

  execute(request: SetClockRequest): ClockResult {
    this.control.set(new Date(request.now));
    return ClockResult.of(this.clock.now(), this.control.isOverridden());
  }
}
