import { Transactional } from '@nestjs-cls/transactional';
import { Injectable } from '@nestjs/common';
import { User } from '../../../../domain/entity/user.entity';
import { CustomException } from '../../../../domain/exception/custom.exception';
import { Clock } from '../../../../domain/port/clock.port';
import { PasswordHasher } from '../../../../domain/port/password-hasher.port';
import { AuditLogRepository } from '../../../../domain/repository/audit-log.repository';
import { UserRepository } from '../../../../domain/repository/user.repository';
import { workDateOf } from '../../../../domain/value/work-date';
import { UseCase } from '../../../use-case.interface';
import { MemberResult } from '../dto/get-members.dto';
import { RegisterMemberBody } from '../dto/register-member.dto';

type Input = { lead: User; ip: string; body: RegisterMemberBody };

// 회원가입 대신 리드가 팀원을 등록한다 (결정 A19). 과거 입사일은 원장이 조회 시 소급 적립
@Injectable()
export class RegisterMemberUseCase implements UseCase<Input, MemberResult> {
  constructor(
    private readonly clock: Clock,
    private readonly users: UserRepository,
    private readonly hasher: PasswordHasher,
    private readonly audit: AuditLogRepository,
  ) {}

  @Transactional()
  async execute({ lead, ip, body }: Input): Promise<MemberResult> {
    const now = this.clock.now();
    if (body.joinDate > workDateOf(now)) {
      throw new CustomException('JOIN_DATE_IN_FUTURE');
    }
    const name = body.name.trim();
    // 아이디 중복(퇴사자 포함)은 DB 유일 제약이 막고 저장소가 DUPLICATE_LOGIN_ID로 바꾼다
    const user = await this.users.create({
      loginId: body.loginId,
      passwordHash: await this.hasher.hash(body.password),
      name,
      role: 'MEMBER',
      joinDate: body.joinDate,
    });
    await this.audit.append({
      actorId: lead.id,
      action: 'USER_CREATE',
      targetType: 'User',
      targetId: user.id,
      payload: { loginId: user.loginId, name, joinDate: user.joinDate },
      ip,
      occurredAt: now,
    });
    return MemberResult.from(user);
  }
}
