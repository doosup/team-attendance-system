export type AuditAction =
  | 'CHECK_IN'
  | 'CHECK_OUT'
  | 'MANUAL_CHECK_OUT'
  | 'REQUEST_CREATE'
  | 'REQUEST_CANCEL'
  | 'REQUEST_DAY_CANCEL'
  | 'REQUEST_APPROVE'
  | 'REQUEST_REJECT'
  | 'LOGIN'
  | 'LOGIN_FAIL'
  | 'IP_BLOCKED'
  | 'ALLOWED_IP_ADD'
  | 'ALLOWED_IP_DELETE'
  | 'CLOCK_CHANGE'
  | 'USER_CREATE'
  | 'USER_RETIRE'
  | 'REQUEST_ACCESS_CHANGE'
  | 'PASSWORD_CHANGE';

// 이력 한 줄 (추가 전용). 비밀번호·토큰은 payload에 넣지 않는다.
export interface AuditDraft {
  actorId: number | null; // null = 로그인 실패·IP 차단처럼 아직 누군지 모름
  action: AuditAction;
  targetType: string | null; // 가리킬 행이 없으면 null (LOGIN_FAIL·IP_BLOCKED·CLOCK_CHANGE)
  targetId: number | null;
  payload: Record<string, unknown>;
  ip: string;
  occurredAt: Date; // Clock 기준 업무 시각 (createdAt은 DB가 실제 시각으로)
}

export interface AuditLogView extends AuditDraft {
  id: number;
  actorName: string | null;
  createdAt: Date;
}
