import { Controller, Delete } from '@nestjs/common';
import { ClockResult } from '../dto/get-clock.dto';
import { ResetClockUseCase } from '../use-case/reset-clock.use-case';

@Controller('dev/clock')
export class ResetClockController {
  constructor(private readonly useCase: ResetClockUseCase) {}

  @Delete()
  resetClock(): ClockResult {
    return this.useCase.execute();
  }
}
