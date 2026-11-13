import { FixedClock } from '../../../../../test/fakes/fixed-clock';
import { InMemoryAttendanceRepository } from '../../../../../test/fakes/in-memory-attendance.repository';
import { InMemoryLedgerRepository } from '../../../../../test/fakes/in-memory-ledger.repository';
import { InMemoryRequestDayRepository } from '../../../../../test/fakes/in-memory-request-day.repository';
import { InMemoryUserRepository } from '../../../../../test/fakes/in-memory-user.repository';
import { KIM, LEAD } from '../../../../../test/fakes/users';
import { Attendance } from '../../../../domain/entity/attendance.entity';
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
});
