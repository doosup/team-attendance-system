import { Controller, Delete } from '@nestjs/common';
import { ClientIp } from '../../../common/decorators/client-ip.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { User } from '../../../domain/entity/user.entity';
import { ClockResult } from '../dto/get-clock.dto';
import { ResetClockUseCase } from '../use-case/reset-clock.use-case';

@Controller('dev/clock')
export class ResetClockController {
  constructor(private readonly useCase: ResetClockUseCase) {}

  @Delete()
  resetClock(
    @CurrentUser() user: User,
    @ClientIp() ip: string,
  ): Promise<ClockResult> {
    return this.useCase.execute({ user, ip });
  }
}
