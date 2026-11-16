import { Module } from '@nestjs/common';
import { GetMyMissingController } from './controller/get-my-missing.controller';
import { GetTeamBoardController } from './controller/get-team-board.controller';
import { GetTeamCalendarController } from './controller/get-team-calendar.controller';
import { GetMyMissingUseCase } from './use-case/get-my-missing.use-case';
import { GetTeamBoardUseCase } from './use-case/get-team-board.use-case';
import { GetTeamCalendarUseCase } from './use-case/get-team-calendar.use-case';

@Module({
  controllers: [
    GetTeamBoardController,
    GetTeamCalendarController,
    GetMyMissingController,
  ],
  providers: [GetTeamBoardUseCase, GetTeamCalendarUseCase, GetMyMissingUseCase],
})
export class DashboardModule {}
