import { Attendance } from '../entity/attendance.entity';
import { LedgerEntry, LedgerEntryProps } from '../entity/ledger-entry.entity';
import { kstAt } from '../value/work-date';
import { settleMonth, settlementDateOf } from './settlement.policy';

const attendance = (
  workDate: string,
  p: Partial<Attendance['props']> = {},
): Attendance =>
  new Attendance({
    id: 1,
    userId: 2,
    workDate,
    dayType: 'FULL_DAY',
    checkInAt: kstAt(workDate, '09:00:00'),
    isLate: false,
    checkInIp: '127.0.0.1',
    requestDayId: null,
    checkOutAt: kstAt(workDate, '18:00:00'),
    checkOutSource: 'BUTTON',
    checkOutIp: '127.0.0.1',
    isEarlyLeave: false,
    workedMinutes: 480,
    ...p,
  });
const notCheckedOut = {
  checkOutAt: null,
  checkOutSource: null,
  isEarlyLeave: null,
  workedMinutes: null,
};

const entry = (p: Partial<LedgerEntryProps>): LedgerEntry =>
  new LedgerEntry({
    id: 1,
    userId: 2,
    kind: 'ANNUAL',
    event: 'ACCRUE',
    halfDays: 2,
    effectiveDate: '2026-10-01',
    expiresOn: null,
    grantId: null,
    requestDayId: null,
    dedupKey: null,
    ...p,
  });

describe('정산 기준일 settlementDateOf', () => {
  it('지난달은 그 달 말일이다', () => {
    expect(settlementDateOf('2026-10', '2026-11-13')).toBe('2026-10-31');
  });

  it('이번 달과 미래 달은 오늘이다', () => {
    expect(settlementDateOf('2026-11', '2026-11-13')).toBe('2026-11-13');
    expect(settlementDateOf('2026-12', '2026-11-13')).toBe('2026-11-13');
  });

  it('2월 말일도 맞게 계산한다', () => {
    expect(settlementDateOf('2026-02', '2026-11-13')).toBe('2026-02-28');
  });
});

describe('월별 정산 settleMonth', () => {
  const month = '2026-10';
  const today = '2026-11-13';

  it('출근한 날 수와 근무시간 합계를 센다', () => {
    const r = settleMonth(
      month,
      today,
      [
        attendance('2026-10-05'),
        attendance('2026-10-06', { workedMinutes: 300, isEarlyLeave: true }),
      ],
      [],
    );
    expect(r).toMatchObject({ workDays: 2, workedMinutes: 780 });
  });

  it('지각·조퇴·직접 입력 횟수를 센다', () => {
    const r = settleMonth(
      month,
      today,
      [
        attendance('2026-10-05', { isLate: true }),
        attendance('2026-10-06', { isLate: true, isEarlyLeave: true }),
        attendance('2026-10-07', { checkOutSource: 'MANUAL' }),
      ],
      [],
    );
    expect(r).toMatchObject({
      lateCount: 2,
      earlyLeaveCount: 1,
      manualCount: 1,
    });
  });

  it('지난 날의 퇴근 미기록은 미기록으로 세고 근무시간에는 넣지 않는다', () => {
    const r = settleMonth(
      month,
      today,
      [attendance('2026-10-05', notCheckedOut)],
      [],
    );
    expect(r).toMatchObject({ workDays: 1, workedMinutes: 0, missingCount: 1 });
  });

  it('오늘 아직 퇴근 전인 건 미기록이 아니다', () => {
    const r = settleMonth(
      '2026-11',
      today,
      [attendance(today, notCheckedOut)],
      [],
    );
    expect(r.missingCount).toBe(0);
  });

  it('그 달 날짜의 연차·반일 OFF 사용에서 복원분을 뺀다', () => {
    const r = settleMonth(
      month,
      today,
      [],
      [
        entry({ event: 'USE', halfDays: -2, effectiveDate: '2026-10-08' }),
        entry({ event: 'USE', halfDays: -2, effectiveDate: '2026-10-09' }),
        entry({ event: 'RESTORE', halfDays: 2, effectiveDate: '2026-10-09' }),
        entry({ event: 'USE', halfDays: -2, effectiveDate: '2026-11-02' }),
        entry({
          kind: 'HALF_OFF',
          event: 'USE',
          halfDays: -1,
          effectiveDate: '2026-10-20',
        }),
      ],
    );
    expect(r).toMatchObject({ annualUsedDays: 1, halfOffUsed: 1 });
  });

  it('잔여는 기준일까지 생긴 원장만 합산한다 (기준일 뒤 적립·사용은 빼고)', () => {
    const r = settleMonth(
      month,
      today,
      [],
      [
        entry({ event: 'ACCRUE', halfDays: 2, effectiveDate: '2026-10-01' }),
        entry({ event: 'ACCRUE', halfDays: 2, effectiveDate: '2026-11-01' }),
        entry({ event: 'USE', halfDays: -2, effectiveDate: '2026-11-02' }),
        entry({
          kind: 'HALF_OFF',
          event: 'ACCRUE',
          halfDays: 1,
          effectiveDate: '2026-10-10',
          expiresOn: '2026-11-09',
        }),
        entry({
          kind: 'HALF_OFF',
          event: 'EXPIRE',
          halfDays: -1,
          effectiveDate: '2026-11-10',
        }),
      ],
    );
    expect(r).toMatchObject({
      asOf: '2026-10-31',
      annualBalanceDays: 1,
      halfOffBalance: 1,
    });
  });
});
