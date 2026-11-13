import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

// 리드 당일 취소는 사유 필수 (결정 12)
export class CancelRequestDayBody {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  cancelReason!: string;
}
