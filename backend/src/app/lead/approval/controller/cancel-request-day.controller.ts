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
import { DateParamPipe } from '../../../../common/pipes/date-param.pipe';
import { User } from '../../../../domain/entity/user.entity';
import { RequestResult } from '../../../request/dto/create-request.dto';
import { CancelRequestDayBody } from '../dto/cancel-request-day.dto';
import { CancelRequestDayUseCase } from '../use-case/cancel-request-day.use-case';

@Roles('LEAD')
@Controller('lead/requests/:id/days/:date/cancel')
export class CancelRequestDayController {
  constructor(private readonly useCase: CancelRequestDayUseCase) {}

  @Post()
  @HttpCode(200)
  cancelDay(
    @CurrentUser() lead: User,
    @ClientIp() ip: string,
    @Param('id', ParseIntPipe) requestId: number,
    @Param('date', DateParamPipe) date: string,
    @Body() { cancelReason }: CancelRequestDayBody,
  ): Promise<RequestResult> {
    return this.useCase.execute({ lead, requestId, date, cancelReason, ip });
  }
}
