import { Controller, Get, Query } from '@nestjs/common';
import { Roles } from '../../../../common/decorators/roles.decorator';
import {
  GetPendingRequestsQuery,
  LeadRequestResult,
} from '../dto/get-pending-requests.dto';
import { GetPendingRequestsUseCase } from '../use-case/get-pending-requests.use-case';

@Roles('LEAD')
@Controller('lead/requests')
export class GetPendingRequestsController {
  constructor(private readonly useCase: GetPendingRequestsUseCase) {}

  @Get()
  list(
    @Query() { status }: GetPendingRequestsQuery,
  ): Promise<LeadRequestResult[]> {
    return this.useCase.execute(status ?? 'PENDING');
  }
}
