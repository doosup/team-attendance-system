import { OverridableClock } from '../../../infrastructure/clock/overridable.clock';
import { InMemoryAuditLogRepository } from '../../../../test/fakes/in-memory-audit-log.repository';
import { FixedClock } from '../../../../test/fakes/fixed-clock';
import { KIM } from '../../../../test/fakes/users';
import { ResetClockUseCase } from './reset-clock.use-case';
import { SetClockUseCase } from './set-clock.use-case';

describe('시각 변경 이력', () => {
  it('변경·초기화 모두 CLOCK_CHANGE 이력을 남긴다 (occurredAt은 바뀐 시각, from·to 기록)', async () => {
    const clock = new OverridableClock(
      new FixedClock('2026-11-13', '09:00:00'),
    );
    const audit = new InMemoryAuditLogRepository();
    await new SetClockUseCase(clock, clock, audit).execute({
      user: KIM,
      ip: '127.0.0.1',
      now: '2026-11-16T09:59:59+09:00',
    });
    await new ResetClockUseCase(clock, clock, audit).execute({
      user: KIM,
      ip: '127.0.0.1',
    });

    expect(audit.rows).toEqual([
      expect.objectContaining({
        actorId: KIM.id,
        action: 'CLOCK_CHANGE',
        targetType: null,
        payload: {
          from: '2026-11-13T00:00:00.000Z',
          to: '2026-11-16T00:59:59.000Z',
          reset: false,
        },
      }),
      expect.objectContaining({
        payload: {
          from: '2026-11-16T00:59:59.000Z',
          to: '2026-11-13T00:00:00.000Z',
          reset: true,
        },
      }),
    ]);
  });
});
