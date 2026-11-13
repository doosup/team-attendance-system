import { Injectable } from '@nestjs/common';
import { CustomException } from '../../../domain/exception/custom.exception';
import { PasswordHasher } from '../../../domain/port/password-hasher.port';
import { TokenPort } from '../../../domain/port/token.port';
import { UserRepository } from '../../../domain/repository/user.repository';
import { UseCase } from '../../use-case.interface';
import { UserResult } from '../dto/get-me.dto';
import { LoginRequest, LoginResult } from '../dto/login.dto';

// shortcut: LOGIN·LOGIN_FAIL 이력은 아직 남기지 않음, ATT-6(AuditLog 저장소)에서 연결.
@Injectable()
export class LoginUseCase implements UseCase<LoginRequest, LoginResult> {
  constructor(
    private readonly users: UserRepository,
    private readonly hasher: PasswordHasher,
    private readonly tokens: TokenPort,
  ) {}

  async execute({ loginId, password }: LoginRequest): Promise<LoginResult> {
    const user = await this.users.findByLoginId(loginId);
    // 없는 아이디도 비밀번호 검사를 거쳐 응답 시간과 에러를 같게 한다.
    const ok = await this.hasher.verify(password, user?.passwordHash ?? null);
    if (!user || !ok) throw new CustomException('INVALID_CREDENTIALS');

    return new LoginResult(
      await this.tokens.issue(user.id),
      UserResult.from(user),
    );
  }
}
