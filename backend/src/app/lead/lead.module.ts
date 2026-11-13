import { Module } from '@nestjs/common';
import { BalanceModule } from '../balance/balance.module';
import { GetAuditLogsController } from './audit-log/controller/get-audit-logs.controller';
import { GetAuditLogsUseCase } from './audit-log/use-case/get-audit-logs.use-case';
import { GetUserLedgerController } from './balance/controller/get-user-ledger.controller';
import { GetUserLedgerUseCase } from './balance/use-case/get-user-ledger.use-case';

// 리드 전용 기능 (/lead/..., 컨트롤러마다 @Roles('LEAD'))
@Module({
  imports: [BalanceModule],
  controllers: [GetUserLedgerController, GetAuditLogsController],
  providers: [GetUserLedgerUseCase, GetAuditLogsUseCase],
})
export class LeadModule {}
