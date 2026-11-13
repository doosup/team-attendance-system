import { Injectable } from '@nestjs/common';
import { Clock, ClockControl } from '../../../domain/port/clock.port';
import { UseCase } from '../../use-case.interface';
import { ClockResult } from '../dto/get-clock.dto';

@Injectable()
export class GetClockUseCase implements UseCase<void, ClockResult> {
  constructor(
    private readonly clock: Clock,
    private readonly control: ClockControl,
  ) {}

  execute(): ClockResult {
    return ClockResult.of(this.clock.now(), this.control.isOverridden());
  }
}
