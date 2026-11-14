import {
  IsISO8601,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

// 역할은 받지 않는다: 등록은 팀원만 (결정 A19)
export class RegisterMemberBody {
  @Matches(/^[a-z0-9]{3,20}$/, {
    message: '아이디는 영문 소문자·숫자 3~20자입니다',
  })
  loginId!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72) // bcrypt는 72바이트까지만 본다
  password!: string;

  @IsString()
  @Matches(/\S/, { message: '이름을 입력하세요' }) // 공백만은 안 됨
  @MaxLength(20)
  name!: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsISO8601({ strict: true })
  joinDate!: string;
}
