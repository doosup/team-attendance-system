import {
  Body,
  Controller,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { ClientIp } from '../../../common/decorators/client-ip.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { User } from '../../../domain/entity/user.entity';
import { AttendanceResult } from '../dto/check-in.dto';
import { ManualCheckOutRequest } from '../dto/manual-check-out.dto';
import { ManualCheckOutUseCase } from '../use-case/manual-check-out.use-case';

@Controller('attendance/:id/manual-check-out')
export class ManualCheckOutController {
  constructor(private readonly useCase: ManualCheckOutUseCase) {}

  @Post()
  @HttpCode(200)
  manualCheckOut(
    @CurrentUser() user: User,
    @ClientIp() ip: string,
    @Param('id', ParseIntPipe) attendanceId: number,
    @Body() { checkOutAt }: ManualCheckOutRequest,
  ): Promise<AttendanceResult> {
    return this.useCase.execute({
      user,
      attendanceId,
      checkOutAt: new Date(checkOutAt),
      ip,
    });
  }
}
