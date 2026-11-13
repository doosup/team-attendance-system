import { Injectable } from '@nestjs/common';
import { compare, hashSync } from 'bcrypt';
import { randomBytes } from 'node:crypto';
import { PasswordHasher } from '../../domain/port/password-hasher.port';

// 없는 사용자도 같은 비용의 비교를 하도록 쓰는 더미 해시 (시드와 같은 cost 12).
const DUMMY_HASH = hashSync(randomBytes(16).toString('hex'), 12);

@Injectable()
export class BcryptPasswordHasher extends PasswordHasher {
  async verify(plain: string, hash: string | null): Promise<boolean> {
    const matched = await compare(plain, hash ?? DUMMY_HASH);
    return hash !== null && matched;
  }
}
