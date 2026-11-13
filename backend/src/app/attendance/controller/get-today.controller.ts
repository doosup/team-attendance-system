import { Controller, Get } from '@nestjs/common';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { User } from '../../../domain/entity/user.entity';
import { TodayResult } from '../dto/get-today.dto';
import { GetTodayUseCase } from '../use-case/get-today.use-case';

@Controller('attendance/today')
export class GetTodayController {
  constructor(private readonly useCase: GetTodayUseCase) {}

  @Get()
  getToday(@CurrentUser() user: User): Promise<TodayResult> {
    return this.useCase.execute(user);
  }
}
