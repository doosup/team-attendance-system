import { Module } from '@nestjs/common';
import { GetClockController } from './controller/get-clock.controller';
import { ResetClockController } from './controller/reset-clock.controller';
import { SetClockController } from './controller/set-clock.controller';
import { GetClockUseCase } from './use-case/get-clock.use-case';
import { ResetClockUseCase } from './use-case/reset-clock.use-case';
import { SetClockUseCase } from './use-case/set-clock.use-case';

// 개발 모드에서만 등록 (app.module.ts).
@Module({
  controllers: [GetClockController, SetClockController, ResetClockController],
  providers: [GetClockUseCase, SetClockUseCase, ResetClockUseCase],
})
export class DevModule {}
