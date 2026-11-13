import { ErrorCode } from '../../domain/exception/error-code';

// 도메인 에러 코드 → HTTP 상태 (design.md 코드표). Record라 코드를 추가하면 여기도 채워야 컴파일된다.
export const ERROR_STATUS: Record<ErrorCode, number> = {
  VALIDATION_FAILED: 400,
  UNAUTHORIZED: 401,
  INVALID_CREDENTIALS: 401,
  FORBIDDEN_ROLE: 403,
  CHECK_IN_TOO_EARLY: 422,
  ALREADY_CHECKED_IN: 409,
  ON_ANNUAL_LEAVE: 409,
  WEEKEND_WORK_NOT_APPROVED: 403,
};
