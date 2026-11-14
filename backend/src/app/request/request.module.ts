import { Module } from '@nestjs/common';
import { CancelRequestController } from './controller/cancel-request.controller';
import { CreateRequestController } from './controller/create-request.controller';
import { GetHolidaysController } from './controller/get-holidays.controller';
import { GetMyRequestsController } from './controller/get-my-requests.controller';
import { GetRequestPdfController } from './controller/get-request-pdf.controller';
import { CancelRequestUseCase } from './use-case/cancel-request.use-case';
import { CreateRequestUseCase } from './use-case/create-request.use-case';
import { GetHolidaysUseCase } from './use-case/get-holidays.use-case';
import { GetMyRequestsUseCase } from './use-case/get-my-requests.use-case';
import { GetRequestPdfUseCase } from './use-case/get-request-pdf.use-case';

@Module({
  controllers: [
    CreateRequestController,
    GetMyRequestsController,
    CancelRequestController,
    GetRequestPdfController,
    GetHolidaysController,
  ],
  providers: [
    CreateRequestUseCase,
    GetMyRequestsUseCase,
    CancelRequestUseCase,
    GetRequestPdfUseCase,
    GetHolidaysUseCase,
  ],
})
export class RequestModule {}
