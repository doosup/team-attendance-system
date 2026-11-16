export type RequestType = 'ANNUAL' | 'REMOTE' | 'HALF_OFF' | 'WEEKEND_WORK';
export type RequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELED';
export type DayStatus = 'ACTIVE' | 'CANCELED';
export type CancelType =
  'SELF_BEFORE_DEADLINE' | 'LEAD_SAME_DAY' | 'RETIREMENT';

// 출퇴근 판정에 필요한 "그날의 신청" 요약 (RequestDay + 신청서 종류·상태)
export interface DayRequest {
  requestDayId: number;
  type: RequestType;
  requestStatus: RequestStatus;
  dayStatus: DayStatus;
  cancelType: CancelType | null;
}

export abstract class RequestDayRepository {
  abstract findForUserOnDate(
    userId: number,
    date: string,
  ): Promise<DayRequest[]>;
  // 그 달 살아 있는(대기·승인, ACTIVE) 재택 날짜 수. 예외 신청분은 따로 (결정 11·18)
  abstract countRemoteDays(
    userId: number,
    month: string,
  ): Promise<{ normal: number; overLimit: number }>;
  // dates 중 이미 살아 있는(대기·승인, ACTIVE) 신청이 있는 날짜 — 중복 신청 확인
  abstract findLiveDates(userId: number, dates: string[]): Promise<string[]>;
  // date에 승인(APPROVED)·ACTIVE인 재택·주말 근무 중 신청 IP가 ip인 것의 신청자와 시간대
  abstract findApprovedWindows(
    date: string,
    ip: string,
  ): Promise<{ userId: number; startTime: string; endTime: string }[]>;
  // 그 달(YYYY-MM) 확정된 날짜: 승인된 신청의 ACTIVE 날짜만, 날짜순 (팀 일정 달력, ATT-47)
  abstract findApprovedInMonth(month: string): Promise<
    {
      date: string;
      userId: number;
      type: RequestType;
      halfOffPart: 'AM' | 'PM' | null;
    }[]
  >;
  // 그날 모든 사람의 신청 (팀 보드). 오전/오후·시간대는 반일 OFF 표시용
  abstract findByDate(date: string): Promise<
    (DayRequest & {
      userId: number;
      halfOffPart: 'AM' | 'PM' | null;
      startTime: string | null;
      endTime: string | null;
    })[]
  >;
}
