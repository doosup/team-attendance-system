import { Controller, Get, Query } from '@nestjs/common';
import { Roles } from '../../../../common/decorators/roles.decorator';
import {
  GetMonthlySettlementQuery,
  MonthlySettlementResult,
} from '../dto/get-monthly-settlement.dto';
import { GetMonthlySettlementUseCase } from '../use-case/get-monthly-settlement.use-case';

@Roles('LEAD')
@Controller('lead/settlements')
export class GetMonthlySettlementController {
  constructor(private readonly useCase: GetMonthlySettlementUseCase) {}

  @Get()
  get(
    @Query() { month }: GetMonthlySettlementQuery,
  ): Promise<MonthlySettlementResult> {
    return this.useCase.execute({ month });
  }
}
