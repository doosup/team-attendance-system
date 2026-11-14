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

  describe('로그인 이력 (ATT-38)', () => {
    const withLogins = new InMemoryAuditLogRepository();
    const entry = (action: 'LOGIN' | 'LOGIN_FAIL' | 'CHECK_IN') =>
      withLogins.append({
        actorId: action === 'LOGIN_FAIL' ? null : 2,
        action,
        targetType: null,
        targetId: null,
        payload: {},
        ip: '127.0.0.1',
        occurredAt: kstAt('2026-11-13', '09:00:00'),
      });
    const actionsOf = async (includeLogin?: boolean) =>
      (await new GetAuditLogsUseCase(withLogins).execute({ includeLogin })).map(
        (r) => r.action,
      );

    beforeAll(async () => {
      await entry('LOGIN');
      await entry('LOGIN_FAIL');
      await entry('CHECK_IN');
    });

    it('기본 조회는 로그인 성공을 빼고 보여 준다 (기록은 그대로, 실패는 보안상 남김)', async () => {
      expect((await actionsOf()).sort()).toEqual(['CHECK_IN', 'LOGIN_FAIL']);
    });

    it('includeLogin이면 로그인 성공까지 모두 보여 준다', async () => {
      expect((await actionsOf(true)).sort()).toEqual([
        'CHECK_IN',
        'LOGIN',
        'LOGIN_FAIL',
      ]);
    });
  });
});
