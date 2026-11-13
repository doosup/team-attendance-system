import {
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
import { ApproveRequestUseCase } from '../use-case/approve-request.use-case';

@Roles('LEAD')
@Controller('lead/requests/:id/approve')
export class ApproveRequestController {
  constructor(private readonly useCase: ApproveRequestUseCase) {}

  @Post()
  @HttpCode(200)
  approve(
    @CurrentUser() lead: User,
    @ClientIp() ip: string,
    @Param('id', ParseIntPipe) requestId: number,
  ): Promise<RequestResult> {
    return this.useCase.execute({ lead, requestId, ip });
  }
}
