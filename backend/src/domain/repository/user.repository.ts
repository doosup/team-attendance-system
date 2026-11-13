import { User } from '../entity/user.entity';

// 소프트 삭제(퇴사)된 사용자는 찾지 않는다.
export abstract class UserRepository {
  abstract findById(id: number): Promise<User | null>;
  abstract findByLoginId(loginId: string): Promise<User | null>;
  abstract findAll(): Promise<User[]>;
}
