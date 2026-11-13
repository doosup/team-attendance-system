import { Module } from '@nestjs/common';
import { BalanceModule } from '../balance/balance.module';
import { GetUserLedgerController } from './balance/controller/get-user-ledger.controller';
import { GetUserLedgerUseCase } from './balance/use-case/get-user-ledger.use-case';

// 리드 전용 기능 (/lead/..., 컨트롤러마다 @Roles('LEAD'))
@Module({
  imports: [BalanceModule],
  controllers: [GetUserLedgerController],
  providers: [GetUserLedgerUseCase],
})
export class LeadModule {}
