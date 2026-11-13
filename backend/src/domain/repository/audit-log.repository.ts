import { AuditDraft, AuditLogView } from '../entity/audit-log.entity';

export interface AuditLogFilter {
  actorId?: number;
  from?: Date; // occurredAt ≥ from
  to?: Date; // occurredAt < to
  limit: number;
}

// 이력은 추가만 한다 (수정·삭제 없음).
export abstract class AuditLogRepository {
  abstract append(entry: AuditDraft): Promise<void>;
  // occurredAt 최신순
  abstract find(filter: AuditLogFilter): Promise<AuditLogView[]>;
}
