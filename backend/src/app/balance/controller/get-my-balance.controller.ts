import { Controller, Get } from '@nestjs/common';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { User } from '../../../domain/entity/user.entity';
import { BalanceResult } from '../dto/get-my-balance.dto';
import { GetMyBalanceUseCase } from '../use-case/get-my-balance.use-case';

@Controller('balances/me')
export class GetMyBalanceController {
  constructor(private readonly useCase: GetMyBalanceUseCase) {}

  @Get()
  getMyBalance(@CurrentUser() user: User): Promise<BalanceResult> {
    return this.useCase.execute(user);
  }
}
