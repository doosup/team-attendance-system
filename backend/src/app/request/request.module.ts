import { Module } from '@nestjs/common';
import { CreateRequestController } from './controller/create-request.controller';
import { GetMyRequestsController } from './controller/get-my-requests.controller';
import { CreateRequestUseCase } from './use-case/create-request.use-case';
import { GetMyRequestsUseCase } from './use-case/get-my-requests.use-case';

@Module({
  controllers: [CreateRequestController, GetMyRequestsController],
  providers: [CreateRequestUseCase, GetMyRequestsUseCase],
})
export class RequestModule {}
