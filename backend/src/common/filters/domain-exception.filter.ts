import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { CustomException } from '../../domain/exception/custom.exception';
import { ERROR_STATUS } from './error-status';

// 모든 실패 응답을 { error: { code, message } }로 맞춘다.
@Catch()
export class DomainExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(DomainExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const [status, code, message] = this.toError(exception);
    host
      .switchToHttp()
      .getResponse<Response>()
      .status(status)
      .json({ error: { code, message } });
  }

  private toError(e: unknown): [number, string, string] {
    if (e instanceof CustomException)
      return [ERROR_STATUS[e.code], e.code, e.message];
    if (e instanceof HttpException) {
      const status = e.getStatus();
      return [status, HttpStatus[status] ?? 'HTTP_ERROR', e.message];
    }
    this.logger.error(e);
    return [500, 'INTERNAL_ERROR', '서버 오류가 발생했습니다'];
  }
}
