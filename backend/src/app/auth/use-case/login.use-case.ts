import { Injectable } from '@nestjs/common';
import { CustomException } from '../../../domain/exception/custom.exception';
import { Clock } from '../../../domain/port/clock.port';
import { PasswordHasher } from '../../../domain/port/password-hasher.port';
import { TokenPort } from '../../../domain/port/token.port';
import { AuditLogRepository } from '../../../domain/repository/audit-log.repository';
import { UserRepository } from '../../../domain/repository/user.repository';
import { UseCase } from '../../use-case.interface';
import { UserResult } from '../dto/get-me.dto';
import { LoginRequest, LoginResult } from '../dto/login.dto';

type Input = LoginRequest & { ip: string };

// 트랜잭션 없이 실행: 실패 이력을 남긴 뒤 거부해야 해서 (롤백되면 이력도 사라짐)
@Injectable()
export class LoginUseCase implements UseCase<Input, LoginResult> {
  constructor(
    private readonly users: UserRepository,
    private readonly hasher: PasswordHasher,
    private readonly tokens: TokenPort,
    private readonly clock: Clock,
    private readonly audit: AuditLogRepository,
  ) {}

  async execute({ loginId, password, ip }: Input): Promise<LoginResult> {
    const user = await this.users.findByLoginId(loginId);
    // 없는 아이디도 비밀번호 검사를 거쳐 응답 시간과 에러를 같게 한다.
    const ok = await this.hasher.verify(password, user?.passwordHash ?? null);
    const occurredAt = this.clock.now();

    if (!user || !ok) {
      // 비밀번호는 기록하지 않는다. 누군지 확정되지 않아 actorId는 null
      await this.audit.append({
        actorId: null,
        action: 'LOGIN_FAIL',
        targetType: null,
        targetId: null,
        payload: { loginId },
        ip,
        occurredAt,
      });
      throw new CustomException('INVALID_CREDENTIALS');
    }

    await this.audit.append({
      actorId: user.id,
      action: 'LOGIN',
      targetType: 'User',
      targetId: user.id,
      payload: { loginId },
      ip,
      occurredAt,
    });
    return new LoginResult(
      await this.tokens.issue(user.id),
      UserResult.from(user),
    );
  }
}
