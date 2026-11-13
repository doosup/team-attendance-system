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
