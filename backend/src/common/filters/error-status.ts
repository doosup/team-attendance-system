import { ErrorCode } from '../../domain/exception/error-code';

// 도메인 에러 코드 → HTTP 상태 (design.md 코드표). Record라 코드를 추가하면 여기도 채워야 컴파일된다.
export const ERROR_STATUS: Record<ErrorCode, number> = {
  VALIDATION_FAILED: 400,
};
