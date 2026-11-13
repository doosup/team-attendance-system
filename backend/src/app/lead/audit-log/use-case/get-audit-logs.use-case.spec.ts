import { kstAt } from '../../../../domain/value/work-date';
import { InMemoryAuditLogRepository } from '../../../../../test/fakes/in-memory-audit-log.repository';
import { GetAuditLogsUseCase } from './get-audit-logs.use-case';

describe('GetAuditLogsUseCase', () => {
  const audit = new InMemoryAuditLogRepository();
  const log = (actorId: number, date: string, time: string) =>
    audit.append({
      actorId,
      action: 'CHECK_IN',
      targetType: 'Attendance',
      targetId: 1,
      payload: {},
      ip: '127.0.0.1',
      occurredAt: kstAt(date, time),
    });

  beforeAll(async () => {
    await log(2, '2026-11-12', '09:00:00');
    await log(2, '2026-11-13', '23:59:59');
    await log(3, '2026-11-13', '09:00:00');
    await log(2, '2026-11-14', '00:00:00');
  });

  const useCase = new GetAuditLogsUseCase(audit);

  it('사람·기간(KST 날짜, 끝 날짜 포함)으로 걸러 최신순으로 준다', async () => {
    const r = await useCase.execute({
      userId: 2,
      from: '2026-11-13',
      to: '2026-11-13',
    });
    expect(r.map((x) => x.occurredAt)).toEqual([
      kstAt('2026-11-13', '23:59:59').toISOString(),
    ]);
  });

  it('조건이 없으면 전체를 최신순으로 준다', async () => {
    const r = await useCase.execute({});
    expect(r).toHaveLength(4);
    expect(r[0].occurredAt).toBe(kstAt('2026-11-14', '00:00:00').toISOString());
  });
});
