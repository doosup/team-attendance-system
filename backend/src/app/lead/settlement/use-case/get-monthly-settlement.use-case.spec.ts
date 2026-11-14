import { FixedClock } from '../../../../../test/fakes/fixed-clock';
import { InMemoryAttendanceRepository } from '../../../../../test/fakes/in-memory-attendance.repository';
import { InMemoryLedgerRepository } from '../../../../../test/fakes/in-memory-ledger.repository';
import { InMemoryRequestDayRepository } from '../../../../../test/fakes/in-memory-request-day.repository';
import { InMemoryUserRepository } from '../../../../../test/fakes/in-memory-user.repository';
import { KIM, LEAD } from '../../../../../test/fakes/users';
import { Attendance } from '../../../../domain/entity/attendance.entity';
import { User } from '../../../../domain/entity/user.entity';
import { kstAt } from '../../../../domain/value/work-date';
import { GetMonthlySettlementUseCase } from './get-monthly-settlement.use-case';

describe('GetMonthlySettlementUseCase', () => {
  const setup = async () => {
    const attendances = new InMemoryAttendanceRepository();
    const requestDays = new InMemoryRequestDayRepository();
    const ledger = new InMemoryLedgerRepository();
    await attendances.create(
      Attendance.checkIn({
        userId: KIM.id,
        workDate: '2026-10-05',
        dayType: 'FULL_DAY',
        checkInAt: kstAt('2026-10-05', '10:00:01'),
        isLate: true,
        checkInIp: '127.0.0.1',
        requestDayId: null,
      }),
    );
    requestDays.rows.push({
      requestDayId: 9,
      userId: KIM.id,
      date: '2026-10-07',
      type: 'REMOTE',
      requestStatus: 'APPROVED',
      dayStatus: 'ACTIVE',
      cancelType: null,
    });
    return new GetMonthlySettlementUseCase(
      new FixedClock('2026-11-13', '09:00:00'),
      new InMemoryUserRepository([LEAD, KIM]),
      attendances,
      ledger,
      requestDays,
    );
  };

  it('팀원마다 한 줄씩, 그 달 출근·지각·재택과 말일 기준 잔여를 모은다', async () => {
    const r = await (await setup()).execute({ month: '2026-10' });

    expect(r).toMatchObject({ month: '2026-10', asOf: '2026-10-31' });
    expect(r.rows.map((x) => x.name)).toEqual([LEAD.name, KIM.name]);
    expect(r.rows[1]).toMatchObject({
      workDays: 1,
      lateCount: 1,
      missingCount: 1, // 10/5 퇴근 미기록
      remote: { used: 1, exceptions: 0 },
      annualBalanceDays: 9, // 1/1 입사 → 2/1 ~ 10/1 적립 9일 (원장 동기화)
    });
  });

  it('month가 없으면 이번 달을 오늘 기준으로 정산한다', async () => {
    const r = await (await setup()).execute({});
    expect(r).toMatchObject({ month: '2026-11', asOf: '2026-11-13' });
  });

  it('그 달에 재직한 날이 있으면 퇴사자도 포함하고, 입사 전·퇴사 후 달에는 빠진다 (결정 A20)', async () => {
    const retired = new User(
      3,
      'yeon',
      'hash:x',
      '연차원',
      'MEMBER',
      '2026-01-15',
      kstAt('2026-10-20', '18:00:00'),
    );
    const joinedLater = new User(
      4,
      'im',
      'hash:x',
      '임자율',
      'MEMBER',
      '2026-11-02',
    );
    const useCase = new GetMonthlySettlementUseCase(
      new FixedClock('2026-11-13', '09:00:00'),
      new InMemoryUserRepository([LEAD, retired, joinedLater]),
      new InMemoryAttendanceRepository(),
      new InMemoryLedgerRepository(),
      new InMemoryRequestDayRepository(),
    );

    const oct = await useCase.execute({ month: '2026-10' });
    expect(oct.rows.map((x) => [x.name, x.retiredDate])).toEqual([
      [LEAD.name, null],
      ['연차원', '2026-10-20'],
    ]);
    const nov = await useCase.execute({ month: '2026-11' });
    expect(nov.rows.map((x) => x.name)).toEqual([LEAD.name, '임자율']);
  });

  it('퇴사자의 원장은 퇴사일까지만 동기화한다 (퇴사 뒤 연차 적립이 생기지 않음)', async () => {
    const retired = new User(
      3,
      'yeon',
      'hash:x',
      '연차원',
      'MEMBER',
      '2026-01-15',
      kstAt('2026-10-20', '18:00:00'),
    );
    const ledger = new InMemoryLedgerRepository();
    await new GetMonthlySettlementUseCase(
      new FixedClock('2026-11-20', '09:00:00'),
      new InMemoryUserRepository([LEAD, retired]),
      new InMemoryAttendanceRepository(),
      ledger,
      new InMemoryRequestDayRepository(),
    ).execute({ month: '2026-10' });

    const dates = (await ledger.findByUser(3)).map(
      (e) => e.props.effectiveDate,
    );
    expect(dates.at(-1)).toBe('2026-10-15'); // 11/15 적립 없음
  });
});
