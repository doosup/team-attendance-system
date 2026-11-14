import { Module } from '@nestjs/common';
import { BalanceModule } from '../balance/balance.module';
import { AddAllowedIpController } from './allowed-ip/controller/add-allowed-ip.controller';
import { DeleteAllowedIpController } from './allowed-ip/controller/delete-allowed-ip.controller';
import { GetAllowedIpsController } from './allowed-ip/controller/get-allowed-ips.controller';
import { AddAllowedIpUseCase } from './allowed-ip/use-case/add-allowed-ip.use-case';
import { DeleteAllowedIpUseCase } from './allowed-ip/use-case/delete-allowed-ip.use-case';
import { GetAllowedIpsUseCase } from './allowed-ip/use-case/get-allowed-ips.use-case';
import { ApproveRequestController } from './approval/controller/approve-request.controller';
import { CancelRequestDayController } from './approval/controller/cancel-request-day.controller';
import { GetPendingRequestsController } from './approval/controller/get-pending-requests.controller';
import { RejectRequestController } from './approval/controller/reject-request.controller';
import { ApproveRequestUseCase } from './approval/use-case/approve-request.use-case';
import { CancelRequestDayUseCase } from './approval/use-case/cancel-request-day.use-case';
import { GetPendingRequestsUseCase } from './approval/use-case/get-pending-requests.use-case';
import { RejectRequestUseCase } from './approval/use-case/reject-request.use-case';
import { GetTeamMissingController } from './attendance/controller/get-team-missing.controller';
import { GetTeamMissingUseCase } from './attendance/use-case/get-team-missing.use-case';
import { GetAuditLogsController } from './audit-log/controller/get-audit-logs.controller';
import { GetAuditLogsUseCase } from './audit-log/use-case/get-audit-logs.use-case';
import { GetUserLedgerController } from './balance/controller/get-user-ledger.controller';
import { GetUserLedgerUseCase } from './balance/use-case/get-user-ledger.use-case';
import { GetMembersController } from './member/controller/get-members.controller';
import { RegisterMemberController } from './member/controller/register-member.controller';
import { RetireMemberController } from './member/controller/retire-member.controller';
import { GetMembersUseCase } from './member/use-case/get-members.use-case';
import { RegisterMemberUseCase } from './member/use-case/register-member.use-case';
import { RetireMemberUseCase } from './member/use-case/retire-member.use-case';
import { GetMonthlySettlementController } from './settlement/controller/get-monthly-settlement.controller';
import { GetMonthlySettlementUseCase } from './settlement/use-case/get-monthly-settlement.use-case';

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
    GetAllowedIpsController,
    AddAllowedIpController,
    DeleteAllowedIpController,
    GetTeamMissingController,
    GetMonthlySettlementController,
    GetMembersController,
    RegisterMemberController,
    RetireMemberController,
  ],
  providers: [
    GetUserLedgerUseCase,
    GetAuditLogsUseCase,
    GetPendingRequestsUseCase,
    ApproveRequestUseCase,
    RejectRequestUseCase,
    CancelRequestDayUseCase,
    GetAllowedIpsUseCase,
    AddAllowedIpUseCase,
    DeleteAllowedIpUseCase,
    GetTeamMissingUseCase,
    GetMonthlySettlementUseCase,
    GetMembersUseCase,
    RegisterMemberUseCase,
    RetireMemberUseCase,
  ],
})
export class LeadModule {}
