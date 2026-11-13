import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);

// 한국은 서머타임이 없어 +09:00 고정 오프셋으로 충분하다.
const KST_OFFSET_MIN = 9 * 60;

/** 순간(UTC) → 근무일 'YYYY-MM-DD' (KST) */
export const workDateOf = (instant: Date): string =>
  dayjs(instant).utcOffset(KST_OFFSET_MIN).format('YYYY-MM-DD');

/** 순간 → KST 자정부터 흐른 ms */
export const msOfDayKst = (instant: Date): number => {
  const kst = dayjs(instant).utcOffset(KST_OFFSET_MIN);
  return kst.diff(kst.startOf('day'));
};

/** KST 날짜 + 'HH:mm:ss' → 순간 */
export const kstAt = (date: string, time: string): Date =>
  new Date(`${date}T${time}+09:00`);

/** 날짜 문자열에 n일 더하기 */
export const addDays = (date: string, n: number): string =>
  dayjs.utc(date).add(n, 'day').format('YYYY-MM-DD');

/** 0 = 일요일 … 6 = 토요일 */
export const dayOfWeek = (date: string): number => dayjs.utc(date).day();
