import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role, User } from '../../domain/entity/user.entity';
import { CustomException } from '../../domain/exception/custom.exception';
import { KIM, LEAD } from '../../../test/fakes/users';
import { RolesGuard } from './roles.guard';

function contextWith(user: User | undefined, roles?: Role[]): ExecutionContext {
  const handler = () => {};
  if (roles) Reflect.defineMetadata('roles', roles, handler);
  return {
    getHandler: () => handler,
    getClass: () => class {},
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  const guard = new RolesGuard(new Reflector());

  it('역할 제한이 없는 경로는 누구나 통과한다', () => {
    expect(guard.canActivate(contextWith(KIM))).toBe(true);
  });

  it('리드 전용 경로는 리드가 통과한다', () => {
    expect(guard.canActivate(contextWith(LEAD, ['LEAD']))).toBe(true);
  });

  it('리드 전용 경로를 팀원이 부르면 FORBIDDEN_ROLE', () => {
    expect(() => guard.canActivate(contextWith(KIM, ['LEAD']))).toThrow(
      expect.objectContaining({ code: 'FORBIDDEN_ROLE' }) as CustomException,
    );
  });
});
