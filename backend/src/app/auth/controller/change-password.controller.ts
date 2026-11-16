import { Body, Controller, HttpCode, Put } from '@nestjs/common';
import { ClientIp } from '../../../common/decorators/client-ip.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { User } from '../../../domain/entity/user.entity';
import { ChangePasswordRequest } from '../dto/change-password.dto';
import { ChangePasswordUseCase } from '../use-case/change-password.use-case';

@Controller('auth/me/password')
export class ChangePasswordController {
  constructor(private readonly useCase: ChangePasswordUseCase) {}

  @Put()
  @HttpCode(200)
  async change(
    @CurrentUser() user: User,
    @ClientIp() ip: string,
    @Body() body: ChangePasswordRequest,
  ): Promise<{ changed: true }> {
    await this.useCase.execute({ ...body, user, ip });
    return { changed: true };
  }
}
