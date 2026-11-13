import {
  AuditDraft,
  AuditLogView,
} from '../../src/domain/entity/audit-log.entity';
import {
  AuditLogFilter,
  AuditLogRepository,
} from '../../src/domain/repository/audit-log.repository';

export class InMemoryAuditLogRepository extends AuditLogRepository {
  readonly rows: AuditDraft[] = [];

  append(entry: AuditDraft) {
    this.rows.push(entry);
    return Promise.resolve();
  }

  find(f: AuditLogFilter): Promise<AuditLogView[]> {
    return Promise.resolve(
      this.rows
        .map((r, i) => ({
          ...r,
          id: i + 1,
          actorName: null,
          createdAt: r.occurredAt,
        }))
        .filter(
          (r) =>
            (f.actorId === undefined || r.actorId === f.actorId) &&
            (!f.from || r.occurredAt >= f.from) &&
            (!f.to || r.occurredAt < f.to),
        )
        .sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime())
        .slice(0, f.limit),
    );
  }

  actions() {
    return this.rows.map((r) => r.action);
  }
}
