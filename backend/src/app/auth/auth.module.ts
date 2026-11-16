import { Module } from '@nestjs/common';
import { ChangePasswordController } from './controller/change-password.controller';
import { GetMeController } from './controller/get-me.controller';
import { LoginController } from './controller/login.controller';
import { ChangePasswordUseCase } from './use-case/change-password.use-case';
import { GetMeUseCase } from './use-case/get-me.use-case';
import { LoginUseCase } from './use-case/login.use-case';

@Module({
  controllers: [LoginController, GetMeController, ChangePasswordController],
  providers: [LoginUseCase, GetMeUseCase, ChangePasswordUseCase],
})
export class AuthModule {}
