import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { LedgerDraft, LedgerEntry } from '../entity/ledger-entry.entity';
import { addDays } from '../value/work-date';

dayjs.extend(utc);

const OFF_VALID_DAYS = 30;

/**
 * 연차 적립일: 입사 1개월 뒤부터 매월 입사일과 같은 날, 없으면 그 달 말일 (결정 2·3).
 * 매번 입사일에서 n개월을 더해 1/31 → 2/28 → 3/31처럼 말일 보정이 누적되지 않게 한다.
 */
export function annualAccrualDates(joinDate: string, today: string): string[] {
  const join = dayjs.utc(joinDate);
  const dates: string[] = [];
  for (let n = 1; ; n++) {
    const d = join.add(n, 'month').format('YYYY-MM-DD');
    if (d > today) return dates;
    dates.push(d);
  }
}

/** 반일 OFF 마지막 사용 가능일 = 지급일 + 30일 (A7) */
export const offExpiresOn = (grantDate: string): string =>
  addDays(grantDate, OFF_VALID_DAYS);

// 적립·만료는 "그날이 와야" 생기는 이벤트라 오늘 이후 것은 빼고 센다 (시계를 되돌려도 일관).
// 사용·복원은 신청 시점에 차감·복원하므로 날짜와 무관하게 센다 (결정 14).
const counts = (e: LedgerEntry, today: string): boolean =>
  e.props.event === 'USE' ||
  e.props.event === 'RESTORE' ||
  e.props.effectiveDate <= today;

/** 잔여 (반일 단위) */
export function balanceOf(
  entries: LedgerEntry[],
  today: string,
): { annual: number; halfOff: number } {
  const sum = (kind: LedgerEntry['props']['kind']) =>
    entries
      .filter((e) => e.props.kind === kind && counts(e, today))
      .reduce((acc, e) => acc + e.props.halfDays, 0);
  return { annual: sum('ANNUAL'), halfOff: sum('HALF_OFF') };
}

/** OFF 지급분별 남은 수 (만료 임박 순) */
export function offGrants(
  entries: LedgerEntry[],
  today: string,
): { grantId: number; expiresOn: string; remaining: number }[] {
  return entries
    .filter(
      (e) =>
        e.props.kind === 'HALF_OFF' &&
        e.props.event === 'ACCRUE' &&
        e.props.effectiveDate <= today,
    )
    .map((g) => ({
      grantId: g.props.id,
      expiresOn: g.props.expiresOn ?? '',
      remaining:
        g.props.halfDays +
        entries
          .filter((e) => e.props.grantId === g.props.id && counts(e, today))
          .reduce((acc, e) => acc + e.props.halfDays, 0),
    }))
    .sort(
      (a, b) => a.expiresOn.localeCompare(b.expiresOn) || a.grantId - b.grantId,
    );
}

/** useDate에 쓸 OFF: 그날까지 유효하고 남은 것 중 만료가 가장 가까운 것 (결정 6) */
export function pickOffGrant(
  entries: LedgerEntry[],
  useDate: string,
  today: string,
): number | null {
  const grant = offGrants(entries, today).find(
    (g) => g.remaining > 0 && g.expiresOn >= useDate,
  );
  return grant?.grantId ?? null;
}

/** 조회 시점에 "생겼어야 할" 적립·만료 중 아직 없는 것 (dedupKey로 중복 방지) */
export function dueEvents(
  userId: number,
  joinDate: string,
  existing: LedgerEntry[],
  today: string,
): LedgerDraft[] {
  const keys = new Set(existing.map((e) => e.props.dedupKey));
  const base = { userId, expiresOn: null, requestDayId: null };

  const accruals: LedgerDraft[] = annualAccrualDates(joinDate, today)
    .map((date) => ({
      ...base,
      kind: 'ANNUAL' as const,
      event: 'ACCRUE' as const,
      halfDays: 2,
      effectiveDate: date,
      grantId: null,
      dedupKey: `ACCRUE:ANNUAL:${userId}:${date}`,
    }))
    .filter((d) => !keys.has(d.dedupKey));

  const expiries: LedgerDraft[] = offGrants(existing, today)
    .filter((g) => g.expiresOn < today && g.remaining > 0)
    .map((g) => {
      // 같은 지급분이 만료 후 복원되면 다시 만료될 수 있어 회차를 키에 넣는다
      const nth =
        existing.filter(
          (e) => e.props.grantId === g.grantId && e.props.event === 'EXPIRE',
        ).length + 1;
      return {
        ...base,
        kind: 'HALF_OFF' as const,
        event: 'EXPIRE' as const,
        halfDays: -g.remaining,
        effectiveDate: addDays(g.expiresOn, 1),
        grantId: g.grantId,
        dedupKey: `EXPIRE:HALF_OFF:${g.grantId}:${nth}`,
      };
    });

  return [...accruals, ...expiries];
}

/** 승인된 주말·공휴일 근무에서 출퇴근이 모두 기록되면 퇴근 시점에 반일 OFF 1개 (결정 7) */
export function weekendWorkOffGrant(a: {
  userId: number;
  attendanceId: number;
  workDate: string;
  requestDayId: number | null;
}): LedgerDraft {
  return {
    userId: a.userId,
    kind: 'HALF_OFF',
    event: 'ACCRUE',
    halfDays: 1,
    effectiveDate: a.workDate,
    expiresOn: offExpiresOn(a.workDate),
    grantId: null,
    requestDayId: a.requestDayId,
    dedupKey: `ACCRUE:HALF_OFF:attendance:${a.attendanceId}`,
  };
}
