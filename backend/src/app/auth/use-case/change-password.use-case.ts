import { Transactional } from '@nestjs-cls/transactional';
import { Injectable } from '@nestjs/common';
import { User } from '../../../domain/entity/user.entity';
import { CustomException } from '../../../domain/exception/custom.exception';
import { Clock } from '../../../domain/port/clock.port';
import { PasswordHasher } from '../../../domain/port/password-hasher.port';
import { AuditLogRepository } from '../../../domain/repository/audit-log.repository';
import { UserRepository } from '../../../domain/repository/user.repository';
import { UseCase } from '../../use-case.interface';
import { ChangePasswordRequest } from '../dto/change-password.dto';

type Input = ChangePasswordRequest & { user: User; ip: string };

// 본인 비밀번호 변경: 현재 비밀번호 확인 → 해시 저장 → 이력 (ATT-53). 비밀번호는 이력에 넣지 않는다
@Injectable()
export class ChangePasswordUseCase implements UseCase<Input, void> {
  constructor(
    private readonly users: UserRepository,
    private readonly hasher: PasswordHasher,
    private readonly clock: Clock,
    private readonly audit: AuditLogRepository,
  ) {}

  @Transactional()
  async execute({ user, currentPassword, newPassword, ip }: Input) {
    if (!(await this.hasher.verify(currentPassword, user.passwordHash))) {
      throw new CustomException('INVALID_CURRENT_PASSWORD');
    }
    if (newPassword === currentPassword) {
      throw new CustomException('PASSWORD_UNCHANGED');
    }
    await this.users.changePassword(
      user.id,
      await this.hasher.hash(newPassword),
    );
    await this.audit.append({
      actorId: user.id,
      action: 'PASSWORD_CHANGE',
      targetType: 'User',
      targetId: user.id,
      payload: { loginId: user.loginId },
      ip,
      occurredAt: this.clock.now(),
    });
  }
}
