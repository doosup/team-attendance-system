import { Module } from '@nestjs/common';
import { CheckInController } from './controller/check-in.controller';
import { GetTodayController } from './controller/get-today.controller';
import { CheckInUseCase } from './use-case/check-in.use-case';
import { GetTodayUseCase } from './use-case/get-today.use-case';

@Module({
  controllers: [CheckInController, GetTodayController],
  providers: [CheckInUseCase, GetTodayUseCase],
})
export class AttendanceModule {}
