import { Module } from '@nestjs/common';
import { CheckInController } from './controller/check-in.controller';
import { CheckOutController } from './controller/check-out.controller';
import { GetMyMonthController } from './controller/get-my-month.controller';
import { GetTodayController } from './controller/get-today.controller';
import { ManualCheckOutController } from './controller/manual-check-out.controller';
import { CheckInUseCase } from './use-case/check-in.use-case';
import { CheckOutUseCase } from './use-case/check-out.use-case';
import { GetMyMonthUseCase } from './use-case/get-my-month.use-case';
import { GetTodayUseCase } from './use-case/get-today.use-case';
import { ManualCheckOutUseCase } from './use-case/manual-check-out.use-case';

@Module({
  controllers: [
    CheckInController,
    CheckOutController,
    GetTodayController,
    GetMyMonthController,
    ManualCheckOutController,
  ],
  providers: [
    CheckInUseCase,
    CheckOutUseCase,
    GetTodayUseCase,
    GetMyMonthUseCase,
    ManualCheckOutUseCase,
  ],
})
export class AttendanceModule {}
