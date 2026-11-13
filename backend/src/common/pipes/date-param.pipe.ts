import { PipeTransform } from '@nestjs/common';
import { isISO8601 } from 'class-validator';
import { CustomException } from '../../domain/exception/custom.exception';

// 경로의 날짜 'YYYY-MM-DD' 검사 (없는 날짜 거부)
export class DateParamPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
      !isISO8601(value, { strict: true })
    ) {
      throw new CustomException(
        'VALIDATION_FAILED',
        '날짜는 YYYY-MM-DD 형식입니다',
      );
    }
    return value;
  }
}
