import { Role, User } from '../entity/user.entity';

export type NewUser = {
  loginId: string;
  passwordHash: string;
  name: string;
  role: Role;
  joinDate: string;
};

// 소프트 삭제(퇴사)된 사용자는 찾지 않는다. 퇴사자가 필요한 조회만 findAllIncludingRetired.
export abstract class UserRepository {
  abstract findById(id: number): Promise<User | null>;
  abstract findByLoginId(loginId: string): Promise<User | null>;
  abstract findAll(): Promise<User[]>;
  // 정산·신청서 PDF처럼 지난 기록을 보여 줄 때 (retiredAt 포함, id 순)
  abstract findAllIncludingRetired(): Promise<User[]>;
  // loginId는 퇴사자 포함 유일: 겹치면 DUPLICATE_LOGIN_ID (결정 A19)
  abstract create(user: NewUser): Promise<User>;
  abstract retire(id: number, at: Date): Promise<void>;
  // 본인 비밀번호 변경 (해시만 저장, ATT-53)
  abstract changePassword(id: number, passwordHash: string): Promise<void>;
}
