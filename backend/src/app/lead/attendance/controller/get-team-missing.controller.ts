import { Controller, Get } from '@nestjs/common';
import { Roles } from '../../../../common/decorators/roles.decorator';
import { MissingCheckoutResult } from '../../../dashboard/dto/get-my-missing.dto';
import { GetTeamMissingUseCase } from '../use-case/get-team-missing.use-case';

@Roles('LEAD')
@Controller('lead/missing-checkouts')
export class GetTeamMissingController {
  constructor(private readonly useCase: GetTeamMissingUseCase) {}

  @Get()
  list(): Promise<MissingCheckoutResult[]> {
    return this.useCase.execute();
  }
}
