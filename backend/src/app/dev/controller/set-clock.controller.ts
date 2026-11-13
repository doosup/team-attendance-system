import { Body, Controller, Put } from '@nestjs/common';
import { ClientIp } from '../../../common/decorators/client-ip.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { User } from '../../../domain/entity/user.entity';
import { ClockResult } from '../dto/get-clock.dto';
import { SetClockRequest } from '../dto/set-clock.dto';
import { SetClockUseCase } from '../use-case/set-clock.use-case';

@Controller('dev/clock')
export class SetClockController {
  constructor(private readonly useCase: SetClockUseCase) {}

  @Put()
  setClock(
    @CurrentUser() user: User,
    @ClientIp() ip: string,
    @Body() { now }: SetClockRequest,
  ): Promise<ClockResult> {
    return this.useCase.execute({ user, ip, now });
  }
}
