import { CustomException } from '../../../domain/exception/custom.exception';
import {
  FakePasswordHasher,
  FakeTokenPort,
} from '../../../../test/fakes/fake-auth';
import { InMemoryUserRepository } from '../../../../test/fakes/in-memory-user.repository';
import { KIM, LEAD } from '../../../../test/fakes/users';
import { LoginUseCase } from './login.use-case';

describe('LoginUseCase', () => {
  let users: InMemoryUserRepository;
  let hasher: FakePasswordHasher;
  let useCase: LoginUseCase;

  beforeEach(() => {
    users = new InMemoryUserRepository([LEAD, KIM]);
    hasher = new FakePasswordHasher();
    useCase = new LoginUseCase(users, hasher, new FakeTokenPort());
  });

  const codeOf = (p: Promise<unknown>) =>
    p.then(
      () => 'OK',
      (e: CustomException) => e.code,
    );

  it('아이디·비밀번호가 맞으면 토큰과 사용자 정보를 준다', async () => {
    const result = await useCase.execute({
      loginId: 'kim',
      password: 'pw-kim',
    });
    expect(result.accessToken).toBe('token:2');
    expect(result.user).toEqual({
      id: 2,
      loginId: 'kim',
      name: '김근태',
      role: 'MEMBER',
    });
  });

  it('응답에 비밀번호 해시가 들어가지 않는다', async () => {
    const result = await useCase.execute({
      loginId: 'kim',
      password: 'pw-kim',
    });
    expect(JSON.stringify(result)).not.toContain('hash:');
  });

  it('비밀번호가 틀리면 INVALID_CREDENTIALS', async () => {
    expect(
      await codeOf(useCase.execute({ loginId: 'kim', password: 'wrong' })),
    ).toBe('INVALID_CREDENTIALS');
  });

  it('없는 아이디도 같은 INVALID_CREDENTIALS이고, 비밀번호 검사를 똑같이 거친다', async () => {
    expect(
      await codeOf(useCase.execute({ loginId: 'nobody', password: 'pw-kim' })),
    ).toBe('INVALID_CREDENTIALS');
    expect(hasher.calls).toEqual([null]);
  });

  it('퇴사(소프트 삭제)한 사용자는 로그인할 수 없다', async () => {
    users.softDelete(KIM.id);
    expect(
      await codeOf(useCase.execute({ loginId: 'kim', password: 'pw-kim' })),
    ).toBe('INVALID_CREDENTIALS');
  });
});
