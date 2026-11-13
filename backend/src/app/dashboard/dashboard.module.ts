import { Module } from '@nestjs/common';
import { GetMyMissingController } from './controller/get-my-missing.controller';
import { GetTeamBoardController } from './controller/get-team-board.controller';
import { GetMyMissingUseCase } from './use-case/get-my-missing.use-case';
import { GetTeamBoardUseCase } from './use-case/get-team-board.use-case';

@Module({
  controllers: [GetTeamBoardController, GetMyMissingController],
  providers: [GetTeamBoardUseCase, GetMyMissingUseCase],
})
export class DashboardModule {}
