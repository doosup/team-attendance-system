import { Controller, Get, Query } from '@nestjs/common';
import { Roles } from '../../../../common/decorators/roles.decorator';
import { AuditLogResult, GetAuditLogsQuery } from '../dto/get-audit-logs.dto';
import { GetAuditLogsUseCase } from '../use-case/get-audit-logs.use-case';

@Roles('LEAD')
@Controller('lead/audit-logs')
export class GetAuditLogsController {
  constructor(private readonly useCase: GetAuditLogsUseCase) {}

  @Get()
  getAuditLogs(@Query() query: GetAuditLogsQuery): Promise<AuditLogResult[]> {
    return this.useCase.execute(query);
  }
}
