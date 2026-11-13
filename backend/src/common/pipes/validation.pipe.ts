import { ValidationPipe } from '@nestjs/common';
import { CustomException } from '../../domain/exception/custom.exception';

// DTO 검증 실패 → 400 VALIDATION_FAILED. 정의하지 않은 필드도 거부한다.
// 요청 DTO는 모두 평평한 객체라(design.md API 목록) 중첩 필드 메시지는 모으지 않는다.
export const validationPipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
  exceptionFactory: (errors) =>
    new CustomException(
      'VALIDATION_FAILED',
      errors.flatMap((e) => Object.values(e.constraints ?? {})).join(', '),
    ),
});
