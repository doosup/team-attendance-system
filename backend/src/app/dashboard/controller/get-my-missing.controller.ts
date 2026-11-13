import { Controller, Get } from '@nestjs/common';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { User } from '../../../domain/entity/user.entity';
import { MissingCheckoutResult } from '../dto/get-my-missing.dto';
import { GetMyMissingUseCase } from '../use-case/get-my-missing.use-case';

@Controller('dashboard/me/missing')
export class GetMyMissingController {
  constructor(private readonly useCase: GetMyMissingUseCase) {}

  @Get()
  getMyMissing(@CurrentUser() user: User): Promise<MissingCheckoutResult[]> {
    return this.useCase.execute(user);
  }
}
