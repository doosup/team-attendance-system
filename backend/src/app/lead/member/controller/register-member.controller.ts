import { Body, Controller, Post } from '@nestjs/common';
import { ClientIp } from '../../../../common/decorators/client-ip.decorator';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { Roles } from '../../../../common/decorators/roles.decorator';
import { User } from '../../../../domain/entity/user.entity';
import { MemberResult } from '../dto/get-members.dto';
import { RegisterMemberBody } from '../dto/register-member.dto';
import { RegisterMemberUseCase } from '../use-case/register-member.use-case';

@Roles('LEAD')
@Controller('lead/users')
export class RegisterMemberController {
  constructor(private readonly useCase: RegisterMemberUseCase) {}

  @Post()
  register(
    @CurrentUser() lead: User,
    @ClientIp() ip: string,
    @Body() body: RegisterMemberBody,
  ): Promise<MemberResult> {
    return this.useCase.execute({ lead, ip, body });
  }
}
