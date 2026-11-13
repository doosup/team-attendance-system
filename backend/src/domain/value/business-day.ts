import { HOLIDAYS } from './holidays';
import { addDays, dayOfWeek } from './work-date';

/** 영업일 = 월~금 중 공휴일이 아닌 날 (결정 4) */
export const isBusinessDay = (date: string): boolean => {
  const dow = dayOfWeek(date);
  return dow !== 0 && dow !== 6 && !HOLIDAYS.has(date);
};

/** date보다 앞선 가장 가까운 영업일 */
export const previousBusinessDay = (date: string): string => {
  let d = addDays(date, -1);
  while (!isBusinessDay(d)) d = addDays(d, -1);
  return d;
};
