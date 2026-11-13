import { DayType } from '../entity/attendance.entity';
import { CustomException } from '../exception/custom.exception';
import { DayRequest, RequestType } from '../repository/request-day.repository';
import { msOfDayKst } from '../value/work-date';

const HOUR = 3600 * 1000;
const CHECK_IN_OPEN = 7 * HOUR; // 07:00:00부터
const LATE_AFTER = 10 * HOUR; // 10:00:00까지 정상
const LUNCH_START = 11.5 * HOUR;
const LUNCH_END = 12.5 * HOUR;

/** 그날 근무 유형. 연차일·승인 없는 주말은 출근 대상이 아니다. */
export type DayKind = DayType | 'ANNUAL_LEAVE' | 'DAY_OFF';

export function resolveDay(
  days: DayRequest[],
  isBusinessDay: boolean,
): { kind: DayKind; requestDayId: number | null } {
  const approved = (type: RequestType) =>
    days.find(
      (d) =>
        d.type === type &&
        d.requestStatus === 'APPROVED' &&
        d.dayStatus === 'ACTIVE',
    );
  const pick = (kind: DayKind, d?: DayRequest) => ({
    kind,
    requestDayId: d?.requestDayId ?? null,
  });

  if (!isBusinessDay) {
    const weekend = approved('WEEKEND_WORK');
    return weekend ? pick('WEEKEND_WORK', weekend) : pick('DAY_OFF');
  }
  const emergency = days.find(
    (d) => d.dayStatus === 'CANCELED' && d.cancelType === 'LEAD_SAME_DAY',
  );
  if (emergency) return pick('EMERGENCY_WORK', emergency);
  const annual = approved('ANNUAL');
  if (annual) return pick('ANNUAL_LEAVE', annual);
  const halfOff = approved('HALF_OFF');
  if (halfOff) return pick('HALF_DAY_OFF', halfOff);
  return pick('FULL_DAY', approved('REMOTE'));
}

/** 출근: 07:00:00부터 등록, 일반일만 10:00:01부터 지각 (결정 8·12) */
export function judgeCheckIn(now: Date, dayType: DayType): { isLate: boolean } {
  const t = msOfDayKst(now);
  if (t < CHECK_IN_OPEN) throw new CustomException('CHECK_IN_TOO_EARLY');
  return { isLate: dayType === 'FULL_DAY' && t > LATE_AFTER };
}

/** 점심 11:30~12:30 전체가 [from, to]에 들어가는가 (결정 1) */
export function includesLunch(from: Date, to: Date): boolean {
  return msOfDayKst(from) <= LUNCH_START && msOfDayKst(to) >= LUNCH_END;
}

/** 조퇴 기준 근무시간. 긴급 출근·주말 근무는 조퇴 판정이 없다. */
export function requiredWorkMs(dayType: DayType): number | null {
  if (dayType === 'FULL_DAY') return 8 * HOUR;
  if (dayType === 'HALF_DAY_OFF') return 4 * HOUR;
  return null;
}

/** 내 카드의 정상 퇴근 가능 시각.
 * 일반일 "16:00보다 이르면 16:00" 하한은 따로 두지 않는다: 출근이 07:00부터라 8시간 + 점심이면 항상 16:00 이후다. */
export function expectedCheckOutAt(
  checkInAt: Date,
  dayType: DayType,
): Date | null {
  const required = requiredWorkMs(dayType);
  if (required === null) return null;

  let end = new Date(checkInAt.getTime() + required);
  if (includesLunch(checkInAt, end)) end = new Date(end.getTime() + HOUR);
  return end;
}
