import { Controller, Get, Query } from '@nestjs/common';
import { Roles } from '../../../../common/decorators/roles.decorator';
import { GetMembersQuery, MemberResult } from '../dto/get-members.dto';
import { GetMembersUseCase } from '../use-case/get-members.use-case';

@Roles('LEAD')
@Controller('lead/users')
export class GetMembersController {
  constructor(private readonly useCase: GetMembersUseCase) {}

  @Get()
  list(@Query() query: GetMembersQuery): Promise<MemberResult[]> {
    return this.useCase.execute(query);
  }
}
