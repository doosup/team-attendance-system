import { InMemoryAuditLogRepository } from '../../../../test/fakes/in-memory-audit-log.repository';
import { FixedClock } from '../../../../test/fakes/fixed-clock';
import { InMemoryAttendanceRepository } from '../../../../test/fakes/in-memory-attendance.repository';
import { InMemoryRequestDayRepository } from '../../../../test/fakes/in-memory-request-day.repository';
import { KIM, LEAD } from '../../../../test/fakes/users';
import { CheckInUseCase } from './check-in.use-case';
import { GetMyMonthUseCase } from './get-my-month.use-case';

describe('GetMyMonthUseCase', () => {
  it('그 달의 내 기록만 날짜순으로 준다', async () => {
    const clock = new FixedClock('2026-10-30', '09:00:00');
    const attendances = new InMemoryAttendanceRepository();
    const checkIn = new CheckInUseCase(
      clock,
      attendances,
      new InMemoryRequestDayRepository(),
      new InMemoryAuditLogRepository(),
    );
    await checkIn.execute({ user: KIM, ip: '127.0.0.1' }); // 10월
    clock.at('2026-11-03', '09:00:00');
    await checkIn.execute({ user: KIM, ip: '127.0.0.1' });
    await checkIn.execute({ user: LEAD, ip: '127.0.0.1' }); // 다른 사람
    clock.at('2026-11-02', '09:00:00');
    await checkIn.execute({ user: KIM, ip: '127.0.0.1' });

    const result = await new GetMyMonthUseCase(attendances).execute({
      user: KIM,
      month: '2026-11',
    });
    expect(result.map((a) => a.workDate)).toEqual(['2026-11-02', '2026-11-03']);
  });
});
