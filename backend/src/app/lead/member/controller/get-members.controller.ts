import { Controller, Get } from '@nestjs/common';
import { Roles } from '../../../../common/decorators/roles.decorator';
import { MemberResult } from '../dto/get-members.dto';
import { GetMembersUseCase } from '../use-case/get-members.use-case';

@Roles('LEAD')
@Controller('lead/users')
export class GetMembersController {
  constructor(private readonly useCase: GetMembersUseCase) {}

  @Get()
  list(): Promise<MemberResult[]> {
    return this.useCase.execute();
  }
}
