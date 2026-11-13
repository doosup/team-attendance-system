import { CustomException } from '../../../domain/exception/custom.exception';
import { kstAt } from '../../../domain/value/work-date';
import { FixedClock } from '../../../../test/fakes/fixed-clock';
import { InMemoryAttendanceRepository } from '../../../../test/fakes/in-memory-attendance.repository';
import { InMemoryRequestDayRepository } from '../../../../test/fakes/in-memory-request-day.repository';
import { KIM } from '../../../../test/fakes/users';
import { CheckInUseCase } from './check-in.use-case';
import { CheckOutUseCase } from './check-out.use-case';

describe('CheckOutUseCase', () => {
  let clock: FixedClock;
  let attendances: InMemoryAttendanceRepository;
  let checkIn: CheckInUseCase;
  let checkOut: CheckOutUseCase;

  beforeEach(() => {
    clock = new FixedClock('2026-11-13', '09:00:00');
    attendances = new InMemoryAttendanceRepository();
    const requestDays = new InMemoryRequestDayRepository();
    checkIn = new CheckInUseCase(clock, attendances, requestDays);
    checkOut = new CheckOutUseCase(clock, attendances);
  });

  const out = () => checkOut.execute({ user: KIM, ip: '127.0.0.1' });
  const codeOf = (p: Promise<unknown>) =>
    p.then(
      () => 'OK',
      (e: CustomException) => e.code,
    );

  it('퇴근 시각·근무시간·조퇴 여부를 기록한다 (09:00→18:00 정상)', async () => {
    await checkIn.execute({ user: KIM, ip: '127.0.0.1' });
    clock.at('2026-11-13', '18:00:00');
    const result = await out();
    expect(result).toMatchObject({
      checkOutAt: kstAt('2026-11-13', '18:00:00').toISOString(),
      checkOutSource: 'BUTTON',
      workedMinutes: 480,
      isEarlyLeave: false,
    });
  });

  it('16:00:00에 퇴근하면 근무 7시간이라 조퇴로 기록된다', async () => {
    await checkIn.execute({ user: KIM, ip: '127.0.0.1' });
    clock.at('2026-11-13', '16:00:00');
    expect((await out()).isEarlyLeave).toBe(true);
  });

  it('출근 기록이 없으면 NOT_CHECKED_IN', async () => {
    clock.at('2026-11-13', '18:00:00');
    expect(await codeOf(out())).toBe('NOT_CHECKED_IN');
  });

  it('이미 퇴근했으면 ALREADY_CHECKED_OUT (처음 기록을 덮어쓰지 않음)', async () => {
    await checkIn.execute({ user: KIM, ip: '127.0.0.1' });
    clock.at('2026-11-13', '18:00:00');
    await out();
    clock.at('2026-11-13', '19:00:00');
    expect(await codeOf(out())).toBe('ALREADY_CHECKED_OUT');
  });

  it('일반일 15:59:59 퇴근은 CHECK_OUT_TOO_EARLY', async () => {
    await checkIn.execute({ user: KIM, ip: '127.0.0.1' });
    clock.at('2026-11-13', '15:59:59');
    expect(await codeOf(out())).toBe('CHECK_OUT_TOO_EARLY');
  });

  it('직전 근무일 퇴근을 입력하기 전에는 PENDING_MANUAL_CHECKOUT로 거부한다', async () => {
    clock.at('2026-11-12', '09:00:00');
    await checkIn.execute({ user: KIM, ip: '127.0.0.1' }); // 목요일 퇴근 안 찍음
    clock.at('2026-11-13', '09:00:00');
    await checkIn.execute({ user: KIM, ip: '127.0.0.1' });
    clock.at('2026-11-13', '18:00:00');
    expect(await codeOf(out())).toBe('PENDING_MANUAL_CHECKOUT');
  });

  it('자정을 넘기면 그날은 미기록이 되어 버튼 대신 직접 입력해야 한다 (결정 10)', async () => {
    await checkIn.execute({ user: KIM, ip: '127.0.0.1' });
    clock.at('2026-11-14', '00:00:01');
    expect(await codeOf(out())).toBe('PENDING_MANUAL_CHECKOUT');
  });
});
