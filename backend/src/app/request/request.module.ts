import { Module } from '@nestjs/common';
import { CancelRequestController } from './controller/cancel-request.controller';
import { CreateRequestController } from './controller/create-request.controller';
import { GetMyRequestsController } from './controller/get-my-requests.controller';
import { CancelRequestUseCase } from './use-case/cancel-request.use-case';
import { CreateRequestUseCase } from './use-case/create-request.use-case';
import { GetMyRequestsUseCase } from './use-case/get-my-requests.use-case';

@Module({
  controllers: [
    CreateRequestController,
    GetMyRequestsController,
    CancelRequestController,
  ],
  providers: [CreateRequestUseCase, GetMyRequestsUseCase, CancelRequestUseCase],
})
export class RequestModule {}
