// 확정 코드표는 docs/design.md "도메인 에러 코드". 코드를 처음 쓰는 티켓에서 한 줄씩 추가한다.
// domain은 코드와 뜻만 안다. HTTP 상태는 common/filters/error-status.ts.
export const ERROR_MESSAGES = {
  VALIDATION_FAILED: '입력 형식이 올바르지 않습니다',
  UNAUTHORIZED: '로그인이 필요합니다',
  INVALID_CREDENTIALS: '아이디 또는 비밀번호가 올바르지 않습니다',
  FORBIDDEN_ROLE: '권한이 없습니다',
  CHECK_IN_TOO_EARLY: '출근은 07:00부터 등록할 수 있습니다',
  ALREADY_CHECKED_IN: '오늘은 이미 출근했습니다',
  ON_ANNUAL_LEAVE:
    '오늘은 연차일입니다. 출근이 필요하면 리드에게 당일 취소를 요청하세요',
  WEEKEND_WORK_NOT_APPROVED: '승인된 주말·공휴일 근무 신청이 없습니다',
  NOT_CHECKED_IN: '오늘 출근 기록이 없습니다',
  ALREADY_CHECKED_OUT: '오늘은 이미 퇴근했습니다',
  CHECK_OUT_TOO_EARLY: '퇴근은 16:00부터 등록할 수 있습니다',
  PENDING_MANUAL_CHECKOUT: '먼저 퇴근을 찍지 않은 날의 퇴근 시각을 입력하세요',
  MANUAL_CHECKOUT_OUT_OF_RANGE:
    '퇴근 시각은 그날 출근 시각 이후부터 23:59:59까지 입력할 수 있습니다',
  MANUAL_CHECKOUT_NOT_PENDING: '직접 입력할 미기록 퇴근 건이 아닙니다',
} as const;

export type ErrorCode = keyof typeof ERROR_MESSAGES;
