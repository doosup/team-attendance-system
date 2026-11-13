import { ERROR_MESSAGES, ErrorCode } from './error-code';

export class CustomException extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string = ERROR_MESSAGES[code],
  ) {
    super(message);
  }
}
