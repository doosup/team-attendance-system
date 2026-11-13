// 확정 코드표는 docs/design.md "도메인 에러 코드". 코드를 처음 쓰는 티켓에서 한 줄씩 추가한다.
export const ERROR_CODES = {
  VALIDATION_FAILED: { status: 400, message: '입력 형식이 올바르지 않습니다' },
} as const;

export type ErrorCode = keyof typeof ERROR_CODES;
