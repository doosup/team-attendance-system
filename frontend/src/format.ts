import type { HalfOff } from '@/api/types';

// 표시는 언제나 KST (decisions 13). 브라우저 시간대와 무관하게 같은 값을 보여 준다.
const KST = 'Asia/Seoul';

export const kstTime = (iso: string | null | undefined) =>
  iso
    ? new Intl.DateTimeFormat('ko-KR', {
        timeZone: KST,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      }).format(new Date(iso))
    : '-';

export const kstDateTime = (iso: string | null | undefined) =>
  iso
    ? new Intl.DateTimeFormat('sv-SE', {
        timeZone: KST,
        dateStyle: 'short',
        timeStyle: 'medium',
      }).format(new Date(iso))
    : '-';

export const minutesText = (m: number | null | undefined) =>
  m == null ? '-' : `${Math.floor(m / 60)}시간 ${m % 60}분`;

/** 'YYYY-MM-DD' + 'HH:mm(:ss)' (KST) → 오프셋 있는 ISO */
export const kstIso = (date: string, time: string) =>
  `${date}T${time.length === 5 ? `${time}:00` : time}+09:00`;

/** 반일 OFF 표시: '오전 OFF 09:00~13:00'. 오전/오후를 안 적었으면 '반일 OFF' (ATT-34) */
export const halfOffText = (h: HalfOff) =>
  [
    h.part === 'AM' ? '오전 OFF' : h.part === 'PM' ? '오후 OFF' : '반일 OFF',
    h.startTime && `${h.startTime}~${h.endTime ?? ''}`,
  ]
    .filter(Boolean)
    .join(' ');

export const DAY_TYPE: Record<string, string> = {
  FULL_DAY: '일반 근무',
  HALF_DAY_OFF: '반일 OFF',
  EMERGENCY_WORK: '긴급 출근',
  WEEKEND_WORK: '주말·공휴일 근무',
  ANNUAL_LEAVE: '연차',
  DAY_OFF: '휴일',
};

export const BOARD_STATUS: Record<string, string> = {
  WORKING: '출근',
  LEFT: '퇴근',
  REMOTE: '재택',
  ANNUAL: '연차',
  HALF_OFF: '반일 OFF',
  PENDING_APPROVAL: '승인 대기',
  NOT_CHECKED_IN: '미출근',
  DAY_OFF: '휴일',
};

export const REQUEST_TYPE: Record<string, string> = {
  ANNUAL: '연차',
  REMOTE: '재택',
  HALF_OFF: '반일 OFF',
  WEEKEND_WORK: '주말·공휴일 근무',
};

export const REQUEST_STATUS: Record<string, string> = {
  PENDING: '대기',
  APPROVED: '승인',
  REJECTED: '반려',
  CANCELED: '취소',
};

/**
 * 재택 표시 (ATT-43): 한도 검사처럼 이번 달 재택일 합계로 센다.
 * 서버는 신청서 단위로 정상/예외를 나눠 주지만(3일 예외 신청 → 예외 3), 화면은 "한도 안 n일 + 넘은 m일".
 */
export const remoteText = (
  r: { used: number; exceptions: number },
  limit = 2,
) => {
  const total = r.used + r.exceptions;
  return {
    inLimit: `${Math.min(total, limit)}/${limit}일`,
    over: total > limit ? `${total - limit}일 초과` : '',
  };
};

const dayNo = (d: string) =>
  Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10)) / 86_400_000;

/** 신청 기간이 오늘(서버 기준)에서 얼마나 남았나: 달력 일수 D-N → D-1 → D-0 → 진행 중 → 종료 (ATT-46) */
export function dday(
  r: { startDate: string; endDate: string },
  today: string,
): { label: string; tone: '' | 'soon' | 'now' | 'over' } {
  const n = dayNo(r.startDate) - dayNo(today);
  if (n > 1) return { label: `D-${n}`, tone: '' };
  if (n === 1) return { label: 'D-1', tone: 'soon' };
  if (n === 0) return { label: 'D-0', tone: 'now' };
  if (r.endDate >= today) return { label: '진행 중', tone: 'now' };
  return { label: '기간 종료', tone: 'over' };
}
