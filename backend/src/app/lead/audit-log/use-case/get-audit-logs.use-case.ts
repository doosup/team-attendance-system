import { Injectable } from '@nestjs/common';
import { AuditLogRepository } from '../../../../domain/repository/audit-log.repository';
import { addDays, kstAt } from '../../../../domain/value/work-date';
import { UseCase } from '../../../use-case.interface';
import { AuditLogResult, GetAuditLogsQuery } from '../dto/get-audit-logs.dto';

// shortcut: 최신 200건까지만 돌려준다, 이력이 많아지면 커서 페이징 추가.
const LIMIT = 200;

@Injectable()
export class GetAuditLogsUseCase implements UseCase<
  GetAuditLogsQuery,
  AuditLogResult[]
> {
  constructor(private readonly audit: AuditLogRepository) {}

  async execute({ userId, from, to, includeLogin }: GetAuditLogsQuery) {
    const rows = await this.audit.find({
      actorId: userId,
      from: from ? kstAt(from, '00:00:00') : undefined,
      to: to ? kstAt(addDays(to, 1), '00:00:00') : undefined,
      excludeActions: includeLogin ? undefined : ['LOGIN'],
      limit: LIMIT,
    });
    return rows.map((r) => AuditLogResult.from(r));
  }
}
