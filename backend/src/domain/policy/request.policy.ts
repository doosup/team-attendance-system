import { CustomException } from '../exception/custom.exception';
import { RequestType } from '../repository/request-day.repository';
import { isBusinessDay, previousBusinessDay } from '../value/business-day';
import { HOLIDAY_YEARS } from '../value/holidays';
import { addDays, kstAt } from '../value/work-date';

const REMOTE_MONTHLY_LIMIT = 2;

/**
 * 신청서가 실제로 적용되는 날짜 (RequestDay 행). 결정 15, A9.
 * - 연차·재택: 기간 안의 영업일만
 * - 반일 OFF: 영업일 하루 / 주말·공휴일 근무: 주말·공휴일 하루
 */
export function datesForRequest(
  type: RequestType,
  startDate: string,
  endDate: string,
): string[] {
  if (endDate < startDate) throw new CustomException('INVALID_DATE_RANGE');
  // 공휴일 데이터가 없는 연도는 영업일을 잘못 셀 수 있어 받지 않는다
  for (const d of [startDate, endDate]) {
    if (!HOLIDAY_YEARS.has(Number(d.slice(0, 4)))) {
      throw new CustomException('INVALID_DATE_RANGE');
    }
  }

  if (type === 'HALF_OFF' || type === 'WEEKEND_WORK') {
    if (startDate !== endDate) throw new CustomException('INVALID_DATE_RANGE');
    const business = isBusinessDay(startDate);
    if (type === 'HALF_OFF' && !business) {
      throw new CustomException('NO_BUSINESS_DAY_IN_RANGE');
    }
    if (type === 'WEEKEND_WORK' && business) {
      throw new CustomException('WEEKEND_WORK_NOT_HOLIDAY');
    }
    return [startDate];
  }

  const dates: string[] = [];
  for (let d = startDate; d <= endDate; d = addDays(d, 1)) {
    if (isBusinessDay(d)) dates.push(d);
  }
  if (dates.length === 0) throw new CustomException('NO_BUSINESS_DAY_IN_RANGE');
  return dates;
}

/** 시작일의 직전 영업일 17:00:00 */
export const deadlineOf = (startDate: string): Date =>
  kstAt(previousBusinessDay(startDate), '17:00:00');

/** 신청·본인 취소 기한: 17:00:00까지 허용, 17:00:01부터 거부 (결정 5) */
export function assertBeforeDeadline(now: Date, startDate: string): void {
  if (now > deadlineOf(startDate)) {
    throw new CustomException('REQUEST_DEADLINE_PASSED');
  }
}

/**
 * 재택 한도: 날짜가 속한 달마다 (이미 살아 있는 재택일 + 이번 신청일) > 2 이면 예외 신청.
 * 하나라도 넘으면 신청서 전체가 예외 (결정 18). existingByMonth = { 'YYYY-MM': 살아 있는 재택일 수 }
 */
export function isRemoteOverLimit(
  dates: string[],
  existingByMonth: Record<string, number>,
): boolean {
  const added: Record<string, number> = {};
  for (const d of dates) added[d.slice(0, 7)] = (added[d.slice(0, 7)] ?? 0) + 1;
  return Object.entries(added).some(
    ([month, n]) => (existingByMonth[month] ?? 0) + n > REMOTE_MONTHLY_LIMIT,
  );
}
