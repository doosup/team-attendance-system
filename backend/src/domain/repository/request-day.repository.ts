export type RequestType = 'ANNUAL' | 'REMOTE' | 'HALF_OFF' | 'WEEKEND_WORK';
export type RequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELED';
export type DayStatus = 'ACTIVE' | 'CANCELED';
export type CancelType = 'SELF_BEFORE_DEADLINE' | 'LEAD_SAME_DAY';

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
}
