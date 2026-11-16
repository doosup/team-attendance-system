import { Controller, Get, Query } from '@nestjs/common';
import {
  GetTeamCalendarQuery,
  TeamCalendarEntry,
} from '../dto/get-team-calendar.dto';
import { GetTeamCalendarUseCase } from '../use-case/get-team-calendar.use-case';

@Controller('dashboard/calendar')
export class GetTeamCalendarController {
  constructor(private readonly useCase: GetTeamCalendarUseCase) {}

  @Get()
  getTeamCalendar(
    @Query() { month }: GetTeamCalendarQuery,
  ): Promise<TeamCalendarEntry[]> {
    return this.useCase.execute({ month });
  }
}
