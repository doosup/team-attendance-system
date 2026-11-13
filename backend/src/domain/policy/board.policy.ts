import { Attendance } from '../entity/attendance.entity';
import { DayRequest } from '../repository/request-day.repository';
import { isBusinessDay } from '../value/business-day';
import { msOfDayKst, workDateOf } from '../value/work-date';

export type BoardStatus =
  | 'WORKING'
  | 'LEFT'
  | 'REMOTE'
  | 'ANNUAL'
  | 'HALF_OFF'
  | 'PENDING_APPROVAL'
  | 'NOT_CHECKED_IN'
  | 'DAY_OFF';

const TEN = 10 * 3600 * 1000;

/**
 * 팀 보드 한 사람의 그날 상태 (결정 16). 지각은 출근 순간 판정되므로 아직 안 온 사람은
 * "미출근"이고, 10:00이 지나면 리드 화면에서만 강조(pastTen)한다.
 */
export function boardStatus(
  date: string,
  attendance: Attendance | null,
  days: DayRequest[],
  now: Date,
): { status: BoardStatus; pastTen: boolean } {
  const approved = (type: DayRequest['type']) =>
    days.some(
      (d) =>
        d.type === type &&
        d.requestStatus === 'APPROVED' &&
        d.dayStatus === 'ACTIVE',
    );
  const today = workDateOf(now);
  const pastTen = date < today || (date === today && msOfDayKst(now) > TEN);
  const of = (status: BoardStatus) => ({ status, pastTen: false });

  if (approved('ANNUAL')) return of('ANNUAL');
  if (attendance) {
    if (approved('REMOTE') && !attendance.hasCheckedOut) return of('REMOTE');
    return of(attendance.hasCheckedOut ? 'LEFT' : 'WORKING');
  }
  if (approved('HALF_OFF')) return of('HALF_OFF');
  if (approved('REMOTE')) return { status: 'NOT_CHECKED_IN', pastTen };
  const pending = days.some(
    (d) => d.requestStatus === 'PENDING' && d.dayStatus === 'ACTIVE',
  );
  if (pending) return of('PENDING_APPROVAL');
  if (!isBusinessDay(date) && !approved('WEEKEND_WORK')) return of('DAY_OFF');
  return { status: 'NOT_CHECKED_IN', pastTen };
}
