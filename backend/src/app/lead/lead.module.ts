import { Module } from '@nestjs/common';
import { BalanceModule } from '../balance/balance.module';
import { ApproveRequestController } from './approval/controller/approve-request.controller';
import { CancelRequestDayController } from './approval/controller/cancel-request-day.controller';
import { GetPendingRequestsController } from './approval/controller/get-pending-requests.controller';
import { RejectRequestController } from './approval/controller/reject-request.controller';
import { ApproveRequestUseCase } from './approval/use-case/approve-request.use-case';
import { CancelRequestDayUseCase } from './approval/use-case/cancel-request-day.use-case';
import { GetPendingRequestsUseCase } from './approval/use-case/get-pending-requests.use-case';
import { RejectRequestUseCase } from './approval/use-case/reject-request.use-case';
import { GetAuditLogsController } from './audit-log/controller/get-audit-logs.controller';
import { GetAuditLogsUseCase } from './audit-log/use-case/get-audit-logs.use-case';
import { GetUserLedgerController } from './balance/controller/get-user-ledger.controller';
import { GetUserLedgerUseCase } from './balance/use-case/get-user-ledger.use-case';

// 리드 전용 기능 (/lead/..., 컨트롤러마다 @Roles('LEAD'))
@Module({
  imports: [BalanceModule],
  controllers: [
    GetUserLedgerController,
    GetAuditLogsController,
    GetPendingRequestsController,
    ApproveRequestController,
    RejectRequestController,
    CancelRequestDayController,
  ],
  providers: [
    GetUserLedgerUseCase,
    GetAuditLogsUseCase,
    GetPendingRequestsUseCase,
    ApproveRequestUseCase,
    RejectRequestUseCase,
    CancelRequestDayUseCase,
  ],
})
export class LeadModule {}
