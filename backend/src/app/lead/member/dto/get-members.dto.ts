import { Role, User } from '../../../../domain/entity/user.entity';

export class MemberResult {
  constructor(
    readonly id: number,
    readonly loginId: string,
    readonly name: string,
    readonly role: Role,
    readonly joinDate: string,
  ) {}

  static from(u: User): MemberResult {
    return new MemberResult(u.id, u.loginId, u.name, u.role, u.joinDate);
  }
}
