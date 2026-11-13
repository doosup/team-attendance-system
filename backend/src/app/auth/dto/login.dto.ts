import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { UserResult } from './get-me.dto';

export class LoginRequest {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  loginId!: string;

  // bcrypt는 72바이트까지만 쓰므로 그보다 긴 입력은 받지 않는다.
  @IsString()
  @IsNotEmpty()
  @MaxLength(72)
  password!: string;
}

export class LoginResult {
  constructor(
    readonly accessToken: string,
    readonly user: UserResult,
  ) {}
}
