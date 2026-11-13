import { PasswordHasher } from '../../src/domain/port/password-hasher.port';
import { TokenPort } from '../../src/domain/port/token.port';

export class FakePasswordHasher extends PasswordHasher {
  readonly calls: (string | null)[] = [];

  verify(plain: string, hash: string | null) {
    this.calls.push(hash);
    return Promise.resolve(hash === `hash:${plain}`);
  }
}

// 'token:<userId>' 형식만 유효하다고 본다.
export class FakeTokenPort extends TokenPort {
  issue(userId: number) {
    return Promise.resolve(`token:${userId}`);
  }

  verify(token: string) {
    const m = /^token:(\d+)$/.exec(token);
    return Promise.resolve(m ? { userId: Number(m[1]) } : null);
  }
}
