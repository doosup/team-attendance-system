import { Body, Controller, Put } from '@nestjs/common';
import { ClockResult } from '../dto/get-clock.dto';
import { SetClockRequest } from '../dto/set-clock.dto';
import { SetClockUseCase } from '../use-case/set-clock.use-case';

@Controller('dev/clock')
export class SetClockController {
  constructor(private readonly useCase: SetClockUseCase) {}

  @Put()
  setClock(@Body() request: SetClockRequest): ClockResult {
    return this.useCase.execute(request);
  }
}
