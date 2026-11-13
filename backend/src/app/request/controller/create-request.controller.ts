import { Body, Controller, Post } from '@nestjs/common';
import { ClientIp } from '../../../common/decorators/client-ip.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { User } from '../../../domain/entity/user.entity';
import { CreateRequestRequest, RequestResult } from '../dto/create-request.dto';
import { CreateRequestUseCase } from '../use-case/create-request.use-case';

@Controller('requests')
export class CreateRequestController {
  constructor(private readonly useCase: CreateRequestUseCase) {}

  @Post()
  create(
    @CurrentUser() user: User,
    @ClientIp() ip: string,
    @Body() input: CreateRequestRequest,
  ): Promise<RequestResult> {
    return this.useCase.execute({ user, input, ip });
  }
}
