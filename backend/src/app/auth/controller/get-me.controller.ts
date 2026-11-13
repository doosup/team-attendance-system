import { Controller, Get } from '@nestjs/common';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { User } from '../../../domain/entity/user.entity';
import { UserResult } from '../dto/get-me.dto';
import { GetMeUseCase } from '../use-case/get-me.use-case';

@Controller('auth/me')
export class GetMeController {
  constructor(private readonly useCase: GetMeUseCase) {}

  @Get()
  getMe(@CurrentUser() user: User): UserResult {
    return this.useCase.execute(user);
  }
}
