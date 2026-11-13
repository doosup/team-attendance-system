import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

// 반려는 사유 필수 (결정 14)
export class RejectRequestBody {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  rejectReason!: string;
}
