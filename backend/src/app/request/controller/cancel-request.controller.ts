import {
  Controller,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { ClientIp } from '../../../common/decorators/client-ip.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { User } from '../../../domain/entity/user.entity';
import { RequestResult } from '../dto/create-request.dto';
import { CancelRequestUseCase } from '../use-case/cancel-request.use-case';

@Controller('requests/:id/cancel')
export class CancelRequestController {
  constructor(private readonly useCase: CancelRequestUseCase) {}

  @Post()
  @HttpCode(200)
  cancel(
    @CurrentUser() user: User,
    @ClientIp() ip: string,
    @Param('id', ParseIntPipe) requestId: number,
  ): Promise<RequestResult> {
    return this.useCase.execute({ user, requestId, ip });
  }
}
