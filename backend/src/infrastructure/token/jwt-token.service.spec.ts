import { JwtService } from '@nestjs/jwt';
import { JwtTokenService } from './jwt-token.service';

describe('JwtTokenService', () => {
  const jwt = new JwtService({
    secret: 'test-secret',
    signOptions: { expiresIn: '12h' },
  });
  const service = new JwtTokenService(jwt);

  it('발급한 토큰을 검증하면 사용자 id가 나온다', async () => {
    const token = await service.issue(2);
    expect(await service.verify(token)).toEqual({ userId: 2 });
  });

  it('토큰은 12시간 뒤 만료된다', async () => {
    const payload = jwt.decode<{ iat: number; exp: number }>(
      await service.issue(2),
    );
    expect(payload.exp - payload.iat).toBe(12 * 60 * 60);
  });

  it('다른 비밀키로 서명한 토큰은 null', async () => {
    const forged = await new JwtService({ secret: 'other' }).signAsync({
      sub: 2,
    });
    expect(await service.verify(forged)).toBeNull();
  });

  it('만료된 토큰은 null', async () => {
    const expired = await jwt.signAsync({ sub: 2 }, { expiresIn: -10 });
    expect(await service.verify(expired)).toBeNull();
  });

  it('형식이 아닌 문자열은 null', async () => {
    expect(await service.verify('not-a-jwt')).toBeNull();
  });
});
