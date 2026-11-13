import { Controller, Get, Query } from '@nestjs/common';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { User } from '../../../domain/entity/user.entity';
import { AttendanceResult } from '../dto/check-in.dto';
import { GetMyMonthRequest } from '../dto/get-my-month.dto';
import { GetMyMonthUseCase } from '../use-case/get-my-month.use-case';

@Controller('attendance/me')
export class GetMyMonthController {
  constructor(private readonly useCase: GetMyMonthUseCase) {}

  @Get()
  getMyMonth(
    @CurrentUser() user: User,
    @Query() { month }: GetMyMonthRequest,
  ): Promise<AttendanceResult[]> {
    return this.useCase.execute({ user, month });
  }
}
