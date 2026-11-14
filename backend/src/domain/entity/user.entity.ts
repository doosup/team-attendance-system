export type Role = 'MEMBER' | 'LEAD';

export class User {
  constructor(
    readonly id: number,
    readonly loginId: string,
    readonly passwordHash: string,
    readonly name: string,
    readonly role: Role,
    readonly joinDate: string,
    // 퇴사 처리 시각 (소프트 삭제). 퇴사자 포함 조회에서만 값이 있다
    readonly retiredAt: Date | null = null,
  ) {}

  hasRole(roles: readonly Role[]): boolean {
    return roles.includes(this.role);
  }
}
