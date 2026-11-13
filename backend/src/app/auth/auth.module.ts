import { Module } from '@nestjs/common';
import { GetMeController } from './controller/get-me.controller';
import { LoginController } from './controller/login.controller';
import { GetMeUseCase } from './use-case/get-me.use-case';
import { LoginUseCase } from './use-case/login.use-case';

@Module({
  controllers: [LoginController, GetMeController],
  providers: [LoginUseCase, GetMeUseCase],
})
export class AuthModule {}
