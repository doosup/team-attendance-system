import { Controller, Post } from '@nestjs/common';
import { ClientIp } from '../../../common/decorators/client-ip.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { User } from '../../../domain/entity/user.entity';
import { CheckInResult } from '../dto/check-in.dto';
import { CheckInUseCase } from '../use-case/check-in.use-case';

@Controller('attendance/check-in')
export class CheckInController {
  constructor(private readonly useCase: CheckInUseCase) {}

  @Post()
  checkIn(
    @CurrentUser() user: User,
    @ClientIp() ip: string,
  ): Promise<CheckInResult> {
    return this.useCase.execute({ user, ip });
  }
}
