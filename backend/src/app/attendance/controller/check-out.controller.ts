import { Controller, HttpCode, Post } from '@nestjs/common';
import { ClientIp } from '../../../common/decorators/client-ip.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { User } from '../../../domain/entity/user.entity';
import { AttendanceResult } from '../dto/check-in.dto';
import { CheckOutUseCase } from '../use-case/check-out.use-case';

@Controller('attendance/check-out')
export class CheckOutController {
  constructor(private readonly useCase: CheckOutUseCase) {}

  @Post()
  @HttpCode(200)
  checkOut(
    @CurrentUser() user: User,
    @ClientIp() ip: string,
  ): Promise<AttendanceResult> {
    return this.useCase.execute({ user, ip });
  }
}
