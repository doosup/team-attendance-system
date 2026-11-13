import { Role, User } from '../../../domain/entity/user.entity';

// 사용자 응답. passwordHash는 절대 담지 않는다.
export class UserResult {
  constructor(
    readonly id: number,
    readonly loginId: string,
    readonly name: string,
    readonly role: Role,
  ) {}

  static from(user: User): UserResult {
    return new UserResult(user.id, user.loginId, user.name, user.role);
  }
}
