import { Attendance } from '../entity/attendance.entity';
import { LedgerEntry } from '../entity/ledger-entry.entity';
import { lastDayOfMonth } from '../value/work-date';

export interface MonthlySettlement {
  asOf: string; // 잔여 기준일
  workDays: number; // 출근 기록이 있는 날
  workedMinutes: number; // 퇴근까지 기록된 날의 근무시간 합
  lateCount: number;
  earlyLeaveCount: number;
  manualCount: number; // 퇴근 직접 입력
  missingCount: number; // 지난 날인데 퇴근 미기록
  annualUsedDays: number; // 그 달 날짜에 쓴 연차 (복원분 제외)
  halfOffUsed: number; // 그 달 날짜에 쓴 반일 OFF 개수
  annualBalanceDays: number;
  halfOffBalance: number;
}

/** 잔여 기준일: 지난달은 말일, 이번 달·미래 달은 오늘 */
export const settlementDateOf = (month: string, today: string): string => {
  const end = lastDayOfMonth(month);
  return end < today ? end : today;
};

/**
 * 한 사람의 월별 정산 (FR-STL-01). 판정은 기록 시점에 저장된 값을 모으기만 한다.
 * 잔여는 기준일까지 효력이 생긴 원장만 합산 → 지난달 정산이 이후 신청·적립으로 바뀌지 않는다.
 */
export function settleMonth(
  month: string,
  today: string,
  attendances: Attendance[],
  entries: LedgerEntry[],
): MonthlySettlement {
  const asOf = settlementDateOf(month, today);
  const count = (pred: (a: Attendance['props']) => boolean) =>
    attendances.filter((a) => pred(a.props)).length;

  const sumLedger = (
    kind: LedgerEntry['props']['kind'],
    pred: (e: LedgerEntry['props']) => boolean,
  ) =>
    entries
      .filter((e) => e.props.kind === kind && pred(e.props))
      .reduce((acc, e) => acc + e.props.halfDays, 0);
  const usedIn = (e: LedgerEntry['props']) =>
    (e.event === 'USE' || e.event === 'RESTORE') &&
    e.effectiveDate.startsWith(month);
  const until = (e: LedgerEntry['props']) => e.effectiveDate <= asOf;

  return {
    asOf,
    workDays: attendances.length,
    workedMinutes: attendances.reduce(
      (acc, a) => acc + (a.props.workedMinutes ?? 0),
      0,
    ),
    lateCount: count((a) => a.isLate),
    earlyLeaveCount: count((a) => a.isEarlyLeave === true),
    manualCount: count((a) => a.checkOutSource === 'MANUAL'),
    missingCount: count((a) => a.checkOutAt === null && a.workDate < today),
    annualUsedDays: -sumLedger('ANNUAL', usedIn) / 2,
    halfOffUsed: -sumLedger('HALF_OFF', usedIn),
    annualBalanceDays: sumLedger('ANNUAL', until) / 2,
    halfOffBalance: sumLedger('HALF_OFF', until),
  };
}
