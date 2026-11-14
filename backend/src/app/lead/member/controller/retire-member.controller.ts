import {
  Controller,
  Delete,
  HttpCode,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { ClientIp } from '../../../../common/decorators/client-ip.decorator';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { Roles } from '../../../../common/decorators/roles.decorator';
import { User } from '../../../../domain/entity/user.entity';
import { RetireMemberUseCase } from '../use-case/retire-member.use-case';

@Roles('LEAD')
@Controller('lead/users/:id')
export class RetireMemberController {
  constructor(private readonly useCase: RetireMemberUseCase) {}

  @Delete()
  @HttpCode(200)
  async retire(
    @CurrentUser() lead: User,
    @ClientIp() ip: string,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<{ id: number }> {
    await this.useCase.execute({ lead, id, ip });
    return { id };
  }
}
