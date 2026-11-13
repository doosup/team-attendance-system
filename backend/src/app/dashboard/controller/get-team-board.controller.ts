import { Controller, Get, Query } from '@nestjs/common';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { User } from '../../../domain/entity/user.entity';
import { GetTeamBoardQuery, TeamBoardRow } from '../dto/get-team-board.dto';
import { GetTeamBoardUseCase } from '../use-case/get-team-board.use-case';

@Controller('dashboard/team')
export class GetTeamBoardController {
  constructor(private readonly useCase: GetTeamBoardUseCase) {}

  @Get()
  getTeamBoard(
    @CurrentUser() viewer: User,
    @Query() { date }: GetTeamBoardQuery,
  ): Promise<TeamBoardRow[]> {
    return this.useCase.execute({ viewer, date });
  }
}
