import { InMemoryAuditLogRepository } from '../../../../test/fakes/in-memory-audit-log.repository';
import { kstAt } from '../../../domain/value/work-date';
import { FixedClock } from '../../../../test/fakes/fixed-clock';
import { InMemoryAttendanceRepository } from '../../../../test/fakes/in-memory-attendance.repository';
import { InMemoryRequestDayRepository } from '../../../../test/fakes/in-memory-request-day.repository';
import { KIM } from '../../../../test/fakes/users';
import { CheckInUseCase } from './check-in.use-case';
import { GetTodayUseCase } from './get-today.use-case';

describe('GetTodayUseCase', () => {
  let clock: FixedClock;
  let attendances: InMemoryAttendanceRepository;
  let requestDays: InMemoryRequestDayRepository;
  let getToday: GetTodayUseCase;
  let checkIn: CheckInUseCase;

  beforeEach(() => {
    clock = new FixedClock('2026-11-13', '08:00:00');
    attendances = new InMemoryAttendanceRepository();
    requestDays = new InMemoryRequestDayRepository();
    getToday = new GetTodayUseCase(clock, attendances, requestDays);
    checkIn = new CheckInUseCase(
      clock,
      attendances,
      requestDays,
      new InMemoryAuditLogRepository(),
    );
  });

  it('출근 전에는 근무 유형만 있고 기록·정상 퇴근 시각은 없다', async () => {
    expect(await getToday.execute(KIM)).toEqual({
      workDate: '2026-11-13',
      dayType: 'FULL_DAY',
      attendance: null,
      expectedCheckOutAt: null,
      pendingManualCheckouts: [],
    });
  });

  it('출근 후에는 기록과 정상 퇴근 가능 시각을 준다 (09:00 출근 → 18:00)', async () => {
    clock.at('2026-11-13', '09:00:00');
    await checkIn.execute({ user: KIM, ip: '127.0.0.1' });
    const today = await getToday.execute(KIM);
    expect(today.attendance?.checkInAt).toBe(
      kstAt('2026-11-13', '09:00:00').toISOString(),
    );
    expect(today.expectedCheckOutAt).toBe(
      kstAt('2026-11-13', '18:00:00').toISOString(),
    );
  });

  it('새로고침해도 미기록 퇴근 건이 다시 나온다', async () => {
    clock.at('2026-11-12', '09:00:00');
    await checkIn.execute({ user: KIM, ip: '127.0.0.1' });
    clock.at('2026-11-13', '09:00:00');
    await checkIn.execute({ user: KIM, ip: '127.0.0.1' });

    const today = await getToday.execute(KIM);
    expect(today.pendingManualCheckouts.map((p) => p.workDate)).toEqual([
      '2026-11-12',
    ]);
  });

  it('주말에 승인된 신청이 없으면 DAY_OFF로 알려 준다', async () => {
    clock.at('2026-11-14', '09:00:00');
    expect((await getToday.execute(KIM)).dayType).toBe('DAY_OFF');
  });
});
