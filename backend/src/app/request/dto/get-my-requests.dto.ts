import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';

// 기본은 취소 제외, "취소 포함 보기" 토글이면 includeCanceled=true
export class GetMyRequestsQuery {
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  includeCanceled?: boolean;
}
