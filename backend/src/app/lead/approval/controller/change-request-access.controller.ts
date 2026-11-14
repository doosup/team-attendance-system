import {
  Body,
  Controller,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { ClientIp } from '../../../../common/decorators/client-ip.decorator';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { Roles } from '../../../../common/decorators/roles.decorator';
import { User } from '../../../../domain/entity/user.entity';
import { RequestResult } from '../../../request/dto/create-request.dto';
import { ChangeRequestAccessBody } from '../dto/change-request-access.dto';
import { ChangeRequestAccessUseCase } from '../use-case/change-request-access.use-case';

@Roles('LEAD')
@Controller('lead/requests/:id/access')
export class ChangeRequestAccessController {
  constructor(private readonly useCase: ChangeRequestAccessUseCase) {}

  @Post()
  @HttpCode(200)
  change(
    @CurrentUser() lead: User,
    @ClientIp() clientIp: string,
    @Param('id', ParseIntPipe) requestId: number,
    @Body() { ip, startTime, endTime, reason }: ChangeRequestAccessBody,
  ): Promise<RequestResult> {
    return this.useCase.execute({
      lead,
      requestId,
      access: { ip, startTime, endTime },
      reason,
      clientIp,
    });
  }
}
