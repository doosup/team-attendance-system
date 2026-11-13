import { ValidationError, ValidationPipe } from '@nestjs/common';
import { CustomException } from '../../domain/exception/custom.exception';

const messagesOf = (errors: ValidationError[]): string[] =>
  errors.flatMap((e) => [
    ...Object.values(e.constraints ?? {}),
    ...messagesOf(e.children ?? []),
  ]);

// DTO 검증 실패 → 400 VALIDATION_FAILED. 정의하지 않은 필드도 거부한다.
export const validationPipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
  exceptionFactory: (errors) =>
    new CustomException('VALIDATION_FAILED', messagesOf(errors).join(', ')),
});
