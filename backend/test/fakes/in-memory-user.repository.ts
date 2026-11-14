import { User } from '../../src/domain/entity/user.entity';
import { CustomException } from '../../src/domain/exception/custom.exception';
import {
  NewUser,
  UserRepository,
} from '../../src/domain/repository/user.repository';

// 유스케이스·가드 테스트용 가짜 저장소. 퇴사자는 retiredAt으로 표시한다.
export class InMemoryUserRepository extends UserRepository {
  private readonly users: User[];

  constructor(users: User[] = []) {
    super();
    this.users = [...users];
  }

  findById(id: number) {
    return Promise.resolve(this.active().find((u) => u.id === id) ?? null);
  }

  findByLoginId(loginId: string) {
    return Promise.resolve(
      this.active().find((u) => u.loginId === loginId) ?? null,
    );
  }

  findAll() {
    return Promise.resolve(this.active());
  }

  findAllIncludingRetired() {
    return Promise.resolve([...this.users].sort((a, b) => a.id - b.id));
  }

  create(u: NewUser) {
    if (this.users.some((x) => x.loginId === u.loginId)) {
      return Promise.reject(new CustomException('DUPLICATE_LOGIN_ID'));
    }
    const id = Math.max(0, ...this.users.map((x) => x.id)) + 1;
    const user = new User(
      id,
      u.loginId,
      u.passwordHash,
      u.name,
      u.role,
      u.joinDate,
    );
    this.users.push(user);
    return Promise.resolve(user);
  }

  retire(id: number, at: Date) {
    const i = this.users.findIndex((u) => u.id === id);
    const u = this.users[i];
    this.users[i] = new User(
      u.id,
      u.loginId,
      u.passwordHash,
      u.name,
      u.role,
      u.joinDate,
      at,
    );
    return Promise.resolve();
  }

  private active() {
    return this.users
      .filter((u) => u.retiredAt === null)
      .sort((a, b) => a.id - b.id);
  }
}
