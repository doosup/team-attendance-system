import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';
import { Role, User } from '../../../../domain/entity/user.entity';
import { workDateOf } from '../../../../domain/value/work-date';

// GET /lead/users?includeRetired= — 이력 필터·이름 표시에 퇴사자도 필요해서 (ATT-38)
export class GetMembersQuery {
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    value === 'true' ? true : value === 'false' ? false : value,
  )
  @IsBoolean()
  includeRetired?: boolean;
}

export class MemberResult {
  constructor(
    readonly id: number,
    readonly loginId: string,
    readonly name: string,
    readonly role: Role,
    readonly joinDate: string,
    readonly retiredDate: string | null,
  ) {}

  static from(u: User): MemberResult {
    return new MemberResult(
      u.id,
      u.loginId,
      u.name,
      u.role,
      u.joinDate,
      u.retiredAt && workDateOf(u.retiredAt),
    );
  }
}
