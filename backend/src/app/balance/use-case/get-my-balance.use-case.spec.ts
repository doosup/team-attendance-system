import { FixedClock } from '../../../../test/fakes/fixed-clock';
import { InMemoryLedgerRepository } from '../../../../test/fakes/in-memory-ledger.repository';
import { InMemoryRequestDayRepository } from '../../../../test/fakes/in-memory-request-day.repository';
import { KIM } from '../../../../test/fakes/users';
import { GetMyBalanceUseCase } from './get-my-balance.use-case';

describe('GetMyBalanceUseCase', () => {
  let clock: FixedClock;
  let ledger: InMemoryLedgerRepository;
  let requestDays: InMemoryRequestDayRepository;
  let useCase: GetMyBalanceUseCase;

  beforeEach(() => {
    clock = new FixedClock('2026-04-15', '09:00:00');
    ledger = new InMemoryLedgerRepository();
    requestDays = new InMemoryRequestDayRepository();
    useCase = new GetMyBalanceUseCase(clock, ledger, requestDays);
  });

  it('조회할 때 빠진 연차 적립을 채운다 (김근태 1/1 입사, 4/15 → 3일)', async () => {
    const result = await useCase.execute(KIM);
    expect(result.annual.days).toBe(3);
    expect(ledger.rows.map((e) => e.props.effectiveDate)).toEqual([
      '2026-02-01',
      '2026-03-01',
      '2026-04-01',
    ]);
  });

  it('여러 번 조회해도 적립이 중복되지 않는다', async () => {
    await useCase.execute(KIM);
    await useCase.execute(KIM);
    expect(ledger.rows).toHaveLength(3);
  });

  it('시계를 되돌려도 결과가 같다 (앞으로 갔다 돌아와도 2/15엔 1일)', async () => {
    await useCase.execute(KIM); // 4/15 기준 적립 3건 생성
    clock.at('2026-02-15', '09:00:00');
    expect((await useCase.execute(KIM)).annual.days).toBe(1);
  });

  it('이번 달 재택 사용 횟수와 예외 횟수를 따로 센다', async () => {
    const remote = (date: string, overLimit = false, status = 'APPROVED') => ({
      userId: KIM.id,
      date,
      requestDayId: 1,
      type: 'REMOTE' as const,
      requestStatus: status as 'APPROVED' | 'PENDING' | 'REJECTED',
      dayStatus: 'ACTIVE' as const,
      cancelType: null,
      isOverLimit: overLimit,
    });
    requestDays.rows.push(
      remote('2026-04-02'),
      remote('2026-04-09', false, 'PENDING'),
      remote('2026-04-16', true),
      remote('2026-04-23', false, 'REJECTED'),
      remote('2026-05-07'),
    );
    expect((await useCase.execute(KIM)).remote).toEqual({
      month: '2026-04',
      used: 2,
      limit: 2,
      exceptions: 1,
    });
  });
});
