// 백엔드 응답 모양 (design.md API 목록). 필요한 필드만 적는다.
export type Role = 'MEMBER' | 'LEAD';
export interface Me {
  id: number;
  loginId: string;
  name: string;
  role: Role;
}

export interface Attendance {
  id: number;
  workDate: string;
  dayType: string;
  checkInAt: string;
  checkOutAt: string | null;
  checkOutSource: 'BUTTON' | 'MANUAL' | null;
  isLate: boolean;
  isEarlyLeave: boolean | null;
  workedMinutes: number | null;
}

export interface PendingCheckout {
  id: number;
  workDate: string;
  checkInAt: string;
}

export interface Today {
  workDate: string;
  dayType: string;
  attendance: Attendance | null;
  expectedCheckOutAt: string | null;
  pendingManualCheckouts: PendingCheckout[];
}

export interface Balance {
  annual: { days: number };
  halfOff: {
    count: number;
    grants: { expiresOn: string; remaining: number }[];
  };
  remote: { month: string; used: number; limit: number; exceptions: number };
}

export type HalfOffPart = 'AM' | 'PM';
export interface HalfOff {
  part: HalfOffPart | null;
  startTime: string | null;
  endTime: string | null;
}

// GET /holidays — 서버 영업일 판정과 같은 공휴일 목록
export interface Holiday {
  date: string;
  name: string;
}

export interface BoardRow {
  userId: number;
  name: string;
  status: string;
  halfOff?: HalfOff; // 승인된 반일 OFF의 오전/오후·반차 예정 시간
  dayType?: string | null;
  checkInAt?: string | null;
  checkOutAt?: string | null;
  isLate?: boolean | null;
  isEarlyLeave?: boolean | null;
  workedMinutes?: number | null;
  checkOutSource?: string | null;
  pastTen?: boolean;
}

export interface MissingCheckout {
  attendanceId: number;
  userId: number;
  userName: string | null;
  workDate: string;
  kind: 'MISSING' | 'MANUAL';
  checkInAt: string;
  checkOutAt: string | null;
}

export type RequestType = 'ANNUAL' | 'REMOTE' | 'HALF_OFF' | 'WEEKEND_WORK';
export interface RequestDay {
  id: number;
  date: string;
  status: 'ACTIVE' | 'CANCELED';
  cancelType: string | null;
  cancelReason: string | null;
}
export interface LeaveRequest {
  id: number;
  userId: number;
  userName?: string | null;
  type: RequestType;
  startDate: string;
  endDate: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELED';
  isOverLimit: boolean;
  isAfterDeadline: boolean; // 기한 후 예외 신청
  reason: string;
  ip: string | null;
  halfOffPart: HalfOffPart | null;
  startTime: string | null;
  endTime: string | null;
  rejectReason: string | null;
  days: RequestDay[];
}

// 리드 팀원 관리 (GET·POST /lead/users)
export interface Member {
  id: number;
  loginId: string;
  name: string;
  role: Role;
  joinDate: string;
}

export interface AllowedIp {
  id: number;
  ip: string;
  label: string;
  createdAt: string;
}

export interface AuditLog {
  id: number;
  actor: { id: number; name: string | null } | null;
  action: string;
  targetType: string | null;
  targetId: number | null;
  payload: Record<string, unknown>;
  ip: string;
  occurredAt: string;
  createdAt: string;
}

export interface ServerClock {
  now: string;
  overridden: boolean;
}

export interface SettlementRow {
  userId: number;
  name: string;
  retiredDate: string | null; // 퇴사일 (재직 중이면 null)
  workDays: number;
  workedMinutes: number;
  lateCount: number;
  earlyLeaveCount: number;
  manualCount: number;
  missingCount: number;
  annualUsedDays: number;
  halfOffUsed: number;
  annualBalanceDays: number;
  halfOffBalance: number;
  remote: { used: number; exceptions: number };
}

export interface MonthlySettlement {
  month: string;
  asOf: string;
  rows: SettlementRow[];
}
