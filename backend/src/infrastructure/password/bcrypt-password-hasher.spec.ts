import { hash } from 'bcrypt';
import { BcryptPasswordHasher } from './bcrypt-password-hasher';

describe('BcryptPasswordHasher', () => {
  const hasher = new BcryptPasswordHasher();

  it('맞는 비밀번호면 true, 틀리면 false', async () => {
    const h = await hash('password123', 4);
    expect(await hasher.verify('password123', h)).toBe(true);
    expect(await hasher.verify('password124', h)).toBe(false);
  });

  it('해시가 없으면(없는 사용자) false', async () => {
    expect(await hasher.verify('password123', null)).toBe(false);
  });
});
