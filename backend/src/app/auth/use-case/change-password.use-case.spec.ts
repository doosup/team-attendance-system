import { CustomException } from '../../../domain/exception/custom.exception';
import {
  FakePasswordHasher,
  FakeTokenPort,
} from '../../../../test/fakes/fake-auth';
import { FixedClock } from '../../../../test/fakes/fixed-clock';
import { InMemoryAuditLogRepository } from '../../../../test/fakes/in-memory-audit-log.repository';
import { InMemoryUserRepository } from '../../../../test/fakes/in-memory-user.repository';
import { KIM, LEAD } from '../../../../test/fakes/users';
import { ChangePasswordUseCase } from './change-password.use-case';
import { LoginUseCase } from './login.use-case';

describe('본인 비밀번호 변경 (ATT-53)', () => {
  let users: InMemoryUserRepository;
  let audit: InMemoryAuditLogRepository;
  let change: ChangePasswordUseCase;
  let login: LoginUseCase;
  const clock = new FixedClock('2026-11-16', '09:00:00');
  const hasher = new FakePasswordHasher();

  beforeEach(() => {
    users = new InMemoryUserRepository([LEAD, KIM]);
    audit = new InMemoryAuditLogRepository();
    change = new ChangePasswordUseCase(users, hasher, clock, audit);
    login = new LoginUseCase(users, hasher, new FakeTokenPort(), clock, audit);
  });

  const run = (currentPassword: string, newPassword: string) =>
    change.execute({
      user: KIM,
      currentPassword,
      newPassword,
      ip: '127.0.0.1',
    });
  const codeOf = (p: Promise<unknown>) =>
    p.then(
      () => 'OK',
      (e: CustomException) => e.code,
    );
  const canLogin = (password: string) =>
    codeOf(login.execute({ loginId: 'kim', password, ip: '127.0.0.1' }));

  it('현재 비밀번호가 맞으면 바뀌고, 새 비밀번호로만 로그인된다', async () => {
    expect(await codeOf(run('pw-kim', 'new-password-1'))).toBe('OK');
    expect(await canLogin('new-password-1')).toBe('OK');
    expect(await canLogin('pw-kim')).toBe('INVALID_CREDENTIALS');
  });

  it('현재 비밀번호가 틀리면 INVALID_CURRENT_PASSWORD이고 바뀌지 않는다', async () => {
    expect(await codeOf(run('wrong', 'new-password-1'))).toBe(
      'INVALID_CURRENT_PASSWORD',
    );
    expect(await canLogin('pw-kim')).toBe('OK');
  });

  it('지금과 같은 비밀번호로는 바꿀 수 없다 (PASSWORD_UNCHANGED)', async () => {
    expect(await codeOf(run('pw-kim', 'pw-kim'))).toBe('PASSWORD_UNCHANGED');
  });

  it('이력에 남기되 비밀번호는 payload에 넣지 않는다', async () => {
    await run('pw-kim', 'new-password-1');
    const row = audit.rows.at(-1)!;
    expect(row).toMatchObject({
      actorId: KIM.id,
      action: 'PASSWORD_CHANGE',
      targetType: 'User',
      targetId: KIM.id,
    });
    expect(JSON.stringify(row.payload)).not.toContain('new-password-1');
    expect(JSON.stringify(row.payload)).not.toContain('pw-kim');
  });
});
