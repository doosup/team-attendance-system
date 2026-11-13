import { User } from '../../src/domain/entity/user.entity';
import { UserRepository } from '../../src/domain/repository/user.repository';

// 유스케이스·가드 테스트용 가짜 저장소. 퇴사자는 deletedIds로 표시한다.
export class InMemoryUserRepository extends UserRepository {
  private readonly deletedIds = new Set<number>();

  constructor(private readonly users: User[] = []) {
    super();
  }

  softDelete(id: number) {
    this.deletedIds.add(id);
  }

  findById(id: number) {
    return Promise.resolve(this.active().find((u) => u.id === id) ?? null);
  }

  findByLoginId(loginId: string) {
    return Promise.resolve(
      this.active().find((u) => u.loginId === loginId) ?? null,
    );
  }

  private active() {
    return this.users.filter((u) => !this.deletedIds.has(u.id));
  }
}
