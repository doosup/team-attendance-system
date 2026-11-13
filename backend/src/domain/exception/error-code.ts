// 확정 코드표는 docs/design.md "도메인 에러 코드". 코드를 처음 쓰는 티켓에서 한 줄씩 추가한다.
// domain은 코드와 뜻만 안다. HTTP 상태는 common/filters/error-status.ts.
export const ERROR_MESSAGES = {
  VALIDATION_FAILED: '입력 형식이 올바르지 않습니다',
  UNAUTHORIZED: '로그인이 필요합니다',
  INVALID_CREDENTIALS: '아이디 또는 비밀번호가 올바르지 않습니다',
  FORBIDDEN_ROLE: '권한이 없습니다',
} as const;

export type ErrorCode = keyof typeof ERROR_MESSAGES;
