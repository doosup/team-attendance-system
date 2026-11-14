import { Controller, Get } from '@nestjs/common';
import { HolidayResult } from '../dto/get-holidays.dto';
import { GetHolidaysUseCase } from '../use-case/get-holidays.use-case';

@Controller('holidays')
export class GetHolidaysController {
  constructor(private readonly useCase: GetHolidaysUseCase) {}

  @Get()
  getHolidays(): HolidayResult[] {
    return this.useCase.execute();
  }
}
