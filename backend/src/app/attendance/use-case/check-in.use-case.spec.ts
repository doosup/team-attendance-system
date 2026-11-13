import { InMemoryAuditLogRepository } from '../../../../test/fakes/in-memory-audit-log.repository';
import { CustomException } from '../../../domain/exception/custom.exception';
import { kstAt } from '../../../domain/value/work-date';
import { FixedClock } from '../../../../test/fakes/fixed-clock';
import { InMemoryAttendanceRepository } from '../../../../test/fakes/in-memory-attendance.repository';
import { InMemoryRequestDayRepository } from '../../../../test/fakes/in-memory-request-day.repository';
import { KIM } from '../../../../test/fakes/users';
import { CheckInUseCase } from './check-in.use-case';

describe('CheckInUseCase', () => {
  let clock: FixedClock;
  let attendances: InMemoryAttendanceRepository;
  let requestDays: InMemoryRequestDayRepository;
  let useCase: CheckInUseCase;
  let audit: InMemoryAuditLogRepository;

  beforeEach(() => {
    clock = new FixedClock('2026-11-13', '09:30:00'); // 금
    attendances = new InMemoryAttendanceRepository();
    requestDays = new InMemoryRequestDayRepository();
    audit = new InMemoryAuditLogRepository();
    useCase = new CheckInUseCase(clock, attendances, requestDays, audit);
  });

  const checkIn = () => useCase.execute({ user: KIM, ip: '127.0.0.1' });
  const codeOf = (p: Promise<unknown>) =>
    p.then(
      () => 'OK',
      (e: CustomException) => e.code,
    );

  it('서버 시각으로 출근을 기록하고 판정 결과를 저장한다', async () => {
    const result = await checkIn();
    expect(result.attendance).toMatchObject({
      workDate: '2026-11-13',
      dayType: 'FULL_DAY',
      checkInAt: kstAt('2026-11-13', '09:30:00').toISOString(),
      isLate: false,
      checkOutAt: null,
    });
    expect(attendances.rows[0].props.checkInIp).toBe('127.0.0.1');
  });

  it('10:00:01 출근은 지각으로 저장된다', async () => {
    clock.at('2026-11-13', '10:00:01');
    expect((await checkIn()).attendance.isLate).toBe(true);
  });

  it('같은 날 두 번 출근하면 ALREADY_CHECKED_IN', async () => {
    await checkIn();
    expect(await codeOf(checkIn())).toBe('ALREADY_CHECKED_IN');
  });

  it('직전 근무일 퇴근이 비어 있으면 출근은 기록하고 미기록 건을 함께 알려 준다', async () => {
    clock.at('2026-11-12', '09:00:00');
    await checkIn(); // 목요일 퇴근 안 찍음
    clock.at('2026-11-13', '09:00:00');

    const result = await checkIn();
    expect(attendances.rows).toHaveLength(2);
    expect(result.pendingManualCheckouts).toEqual([
      {
        id: 1,
        workDate: '2026-11-12',
        checkInAt: kstAt('2026-11-12', '09:00:00').toISOString(),
      },
    ]);
  });

  it('직전 근무일에 퇴근을 찍었으면 미기록 건이 없다', async () => {
    clock.at('2026-11-12', '09:00:00');
    await checkIn();
    const thursday = attendances.rows[0];
    thursday.props.checkOutAt = kstAt('2026-11-12', '18:00:00');
    clock.at('2026-11-13', '09:00:00');
    expect((await checkIn()).pendingManualCheckouts).toEqual([]);
  });

  it('미기록 건이 없으면 빈 목록이다', async () => {
    expect((await checkIn()).pendingManualCheckouts).toEqual([]);
  });

  it('승인된 연차일에는 출근할 수 없다 (ON_ANNUAL_LEAVE)', async () => {
    requestDays.rows.push({
      userId: KIM.id,
      date: '2026-11-13',
      requestDayId: 5,
      type: 'ANNUAL',
      requestStatus: 'APPROVED',
      dayStatus: 'ACTIVE',
      cancelType: null,
    });
    expect(await codeOf(checkIn())).toBe('ON_ANNUAL_LEAVE');
  });

  it('승인된 주말 근무 없이 토요일에 출근하면 WEEKEND_WORK_NOT_APPROVED', async () => {
    clock.at('2026-11-14', '09:00:00');
    expect(await codeOf(checkIn())).toBe('WEEKEND_WORK_NOT_APPROVED');
  });

  it('승인된 반일 OFF 날은 늦게 와도 지각이 아니고 신청 날짜와 연결된다', async () => {
    requestDays.rows.push({
      userId: KIM.id,
      date: '2026-11-13',
      requestDayId: 7,
      type: 'HALF_OFF',
      requestStatus: 'APPROVED',
      dayStatus: 'ACTIVE',
      cancelType: null,
    });
    clock.at('2026-11-13', '13:00:00');
    const result = await checkIn();
    expect(result.attendance).toMatchObject({
      dayType: 'HALF_DAY_OFF',
      isLate: false,
    });
    expect(attendances.rows[0].props.requestDayId).toBe(7);
  });

  it('출근하면 CHECK_IN 이력을 Clock 시각으로 남긴다', async () => {
    await checkIn();
    expect(audit.rows).toEqual([
      expect.objectContaining({
        actorId: KIM.id,
        action: 'CHECK_IN',
        targetType: 'Attendance',
        targetId: 1,
        ip: '127.0.0.1',
        occurredAt: kstAt('2026-11-13', '09:30:00'),
        payload: expect.objectContaining({
          workDate: '2026-11-13',
          isLate: false,
        }) as unknown,
      }),
    ]);
  });

  it('거부된 출근은 이력을 남기지 않는다 (트랜잭션과 함께 롤백되는 쪽)', async () => {
    clock.at('2026-11-13', '06:00:00');
    await checkIn().catch(() => undefined);
    expect(audit.rows).toEqual([]);
  });
});
