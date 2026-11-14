import { kstAt } from '../../domain/value/work-date';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { User } from '../../domain/entity/user.entity';
import { CustomException } from '../../domain/exception/custom.exception';
import { FakeTokenPort } from '../../../test/fakes/fake-auth';
import { InMemoryUserRepository } from '../../../test/fakes/in-memory-user.repository';
import { KIM } from '../../../test/fakes/users';
import { JwtAuthGuard } from './jwt-auth.guard';

function contextWith(
  headers: Record<string, string>,
  isPublic = false,
): { ctx: ExecutionContext; request: { headers: object; user?: User } } {
  const request: { headers: object; user?: User } = { headers };
  const handler = () => {};
  if (isPublic) Reflect.defineMetadata('isPublic', true, handler);
  const ctx = {
    getHandler: () => handler,
    getClass: () => class {},
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
  return { ctx, request };
}

describe('JwtAuthGuard', () => {
  let users: InMemoryUserRepository;
  let guard: JwtAuthGuard;

  beforeEach(() => {
    users = new InMemoryUserRepository([KIM]);
    guard = new JwtAuthGuard(new Reflector(), new FakeTokenPort(), users);
  });

  const codeOf = (p: Promise<boolean>) =>
    p.then(
      () => 'OK',
      (e: CustomException) => e.code,
    );

  it('유효한 토큰이면 통과하고 요청에 사용자를 붙인다', async () => {
    const { ctx, request } = contextWith({ authorization: 'Bearer token:2' });
    expect(await guard.canActivate(ctx)).toBe(true);
    expect(request.user).toBe(KIM);
  });

  it('@Public() 경로는 토큰 없이 통과한다', async () => {
    const { ctx } = contextWith({}, true);
    expect(await guard.canActivate(ctx)).toBe(true);
  });

  it.each([
    ['토큰이 없으면', {}],
    ['Bearer 형식이 아니면', { authorization: 'token:2' }],
    ['서명이 틀리거나 만료되면', { authorization: 'Bearer forged' }],
  ])('%s UNAUTHORIZED', async (_, headers) => {
    expect(await codeOf(guard.canActivate(contextWith(headers).ctx))).toBe(
      'UNAUTHORIZED',
    );
  });

  it('토큰이 유효해도 퇴사한 사용자면 UNAUTHORIZED', async () => {
    await users.retire(KIM.id, kstAt('2026-11-12', '18:00:00'));
    const { ctx } = contextWith({ authorization: 'Bearer token:2' });
    expect(await codeOf(guard.canActivate(ctx))).toBe('UNAUTHORIZED');
  });
});
