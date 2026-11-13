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
import { RejectRequestBody } from '../dto/reject-request.dto';
import { RejectRequestUseCase } from '../use-case/reject-request.use-case';

@Roles('LEAD')
@Controller('lead/requests/:id/reject')
export class RejectRequestController {
  constructor(private readonly useCase: RejectRequestUseCase) {}

  @Post()
  @HttpCode(200)
  reject(
    @CurrentUser() lead: User,
    @ClientIp() ip: string,
    @Param('id', ParseIntPipe) requestId: number,
    @Body() { rejectReason }: RejectRequestBody,
  ): Promise<RequestResult> {
    return this.useCase.execute({ lead, requestId, rejectReason, ip });
  }
}
