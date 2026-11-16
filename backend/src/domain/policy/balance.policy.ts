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
  // OFF는 지급분별로 센다: 만료가 빼는 양이 "그때 남은 만큼"이라 행을 그대로 더하면 안 된다 (ATT-50)
  const halfOff = offGrants(entries, today).reduce(
    (acc, g) => acc + g.remaining,
    0,
  );
  return { annual: sum('ANNUAL'), halfOff };
}

/**
 * OFF 지급분별 남은 수 (만료 임박 순). 지급일이 온 지급분만.
 * 만료 기록은 "이 지급분은 끝났다"는 표시로만 보고, 빼는 양은 그 시점에 남은 만큼(=남은 수를 0으로)이다.
 * 저장된 만료 양을 그대로 빼면, 시계를 미래로 옮겨 만료가 기록된 뒤 과거로 돌아와 같은 OFF를 썼을 때
 * 만료와 사용이 겹쳐 음수가 된다 (ATT-50).
 */
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
    .map((g) => {
      const mine = entries.filter((e) => e.props.grantId === g.props.id);
      const used = mine
        .filter((e) => e.props.event === 'USE' || e.props.event === 'RESTORE')
        .reduce((acc, e) => acc + e.props.halfDays, 0);
      const expired = mine.some(
        (e) => e.props.event === 'EXPIRE' && e.props.effectiveDate <= today,
      );
      const left = g.props.halfDays + used;
      return {
        grantId: g.props.id,
        expiresOn: g.props.expiresOn ?? '',
        remaining: expired ? Math.min(left, 0) : left,
      };
    })
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
      // 지급분마다 한 번: 만료 뒤에 복원돼도 만료 표시가 남은 수를 0으로 보므로 다시 만들 일이 없다 (ATT-50).
      // 키 끝의 회차(:1)는 기존 데이터와 맞추려고 둔다
      return {
        ...base,
        kind: 'HALF_OFF' as const,
        event: 'EXPIRE' as const,
        halfDays: -g.remaining,
        effectiveDate: addDays(g.expiresOn, 1),
        grantId: g.grantId,
        dedupKey: `EXPIRE:HALF_OFF:${g.grantId}:1`,
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

/**
 * 반려·취소된 날짜 행의 차감을 되돌린다 (결정 12·14). 같은 양을 같은 지급분(grantId)으로 되돌려
 * 복원된 OFF는 원래 만료일을 유지한다. 이미 복원한 날짜는 건너뛴다.
 */
export function restoreDrafts(
  entries: LedgerEntry[],
  requestDayIds: number[],
): LedgerDraft[] {
  const targets = new Set(requestDayIds);
  const restored = new Set(
    entries
      .filter((e) => e.props.event === 'RESTORE')
      .map((e) => e.props.requestDayId),
  );
  return entries
    .filter(
      (e) =>
        e.props.event === 'USE' &&
        e.props.requestDayId !== null &&
        targets.has(e.props.requestDayId) &&
        !restored.has(e.props.requestDayId),
    )
    .map(({ props: p }) => ({
      userId: p.userId,
      kind: p.kind,
      event: 'RESTORE' as const,
      halfDays: -p.halfDays,
      effectiveDate: p.effectiveDate,
      expiresOn: null,
      grantId: p.grantId,
      requestDayId: p.requestDayId,
      dedupKey: null,
    }));
}
