export abstract class PasswordHasher {
  abstract hash(plain: string): Promise<string>;
  // hash가 null(없는 사용자)이어도 같은 시간을 들여 false를 돌려준다 → 아이디 존재 여부를 숨김.
  abstract verify(plain: string, hash: string | null): Promise<boolean>;
}
