import { Controller, Get } from '@nestjs/common';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { User } from '../../../domain/entity/user.entity';
import { LedgerEntryResult } from '../dto/get-my-ledger.dto';
import { GetMyLedgerUseCase } from '../use-case/get-my-ledger.use-case';

@Controller('balances/me/ledger')
export class GetMyLedgerController {
  constructor(private readonly useCase: GetMyLedgerUseCase) {}

  @Get()
  getMyLedger(@CurrentUser() user: User): Promise<LedgerEntryResult[]> {
    return this.useCase.execute(user);
  }
}
