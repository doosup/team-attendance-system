import { Controller, Get, Query } from '@nestjs/common';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { User } from '../../../domain/entity/user.entity';
import { RequestResult } from '../dto/create-request.dto';
import { GetMyRequestsQuery } from '../dto/get-my-requests.dto';
import { GetMyRequestsUseCase } from '../use-case/get-my-requests.use-case';

@Controller('requests/me')
export class GetMyRequestsController {
  constructor(private readonly useCase: GetMyRequestsUseCase) {}

  @Get()
  getMyRequests(
    @CurrentUser() user: User,
    @Query() { includeCanceled }: GetMyRequestsQuery,
  ): Promise<RequestResult[]> {
    return this.useCase.execute({ user, includeCanceled: !!includeCanceled });
  }
}
