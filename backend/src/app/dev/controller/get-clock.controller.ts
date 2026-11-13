import { Controller, Get } from '@nestjs/common';
import { ClockResult } from '../dto/get-clock.dto';
import { GetClockUseCase } from '../use-case/get-clock.use-case';

@Controller('dev/clock')
export class GetClockController {
  constructor(private readonly useCase: GetClockUseCase) {}

  @Get()
  getClock(): ClockResult {
    return this.useCase.execute();
  }
}
