import { ERROR_CODES, ErrorCode } from './error-code';

export class CustomException extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string = ERROR_CODES[code].message,
  ) {
    super(message);
  }

  get status(): number {
    return ERROR_CODES[this.code].status;
  }
}
