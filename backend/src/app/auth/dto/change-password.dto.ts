import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

// 새 비밀번호 기준은 팀원 등록과 같다: 8자 이상, bcrypt가 보는 72바이트까지 (결정 A19)
export class ChangePasswordRequest {
  @IsString()
  @IsNotEmpty()
  @MaxLength(72)
  currentPassword!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  newPassword!: string;
}
