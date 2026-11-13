import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { Roles } from '../../../../common/decorators/roles.decorator';
import { LedgerEntryResult } from '../../../balance/dto/get-my-ledger.dto';
import { GetUserLedgerUseCase } from '../use-case/get-user-ledger.use-case';

@Roles('LEAD')
@Controller('lead/users/:userId/ledger')
export class GetUserLedgerController {
  constructor(private readonly useCase: GetUserLedgerUseCase) {}

  @Get()
  getUserLedger(
    @Param('userId', ParseIntPipe) userId: number,
  ): Promise<LedgerEntryResult[]> {
    return this.useCase.execute(userId);
  }
}
