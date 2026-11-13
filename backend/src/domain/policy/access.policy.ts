import { msOfDayKst } from '../value/work-date';

const toMs = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return (h * 60 + m) * 60 * 1000;
};

/** 신청 시간대 [start, end] 안인가 ('HH:mm', KST). 끝 시각은 포함한다 (결정 원칙 3) */
export function isWithinWindow(
  now: Date,
  startTime: string,
  endTime: string,
): boolean {
  const t = msOfDayKst(now);
  return t >= toMs(startTime) && t <= toMs(endTime);
}
