export type Role = 'MEMBER' | 'LEAD';

export class User {
  constructor(
    readonly id: number,
    readonly loginId: string,
    readonly passwordHash: string,
    readonly name: string,
    readonly role: Role,
    readonly joinDate: string,
  ) {}

  hasRole(roles: readonly Role[]): boolean {
    return roles.includes(this.role);
  }
}
