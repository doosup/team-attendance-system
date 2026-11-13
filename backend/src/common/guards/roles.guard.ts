import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role, User } from '../../domain/entity/user.entity';
import { CustomException } from '../../domain/exception/custom.exception';
import { ROLES } from '../decorators/roles.decorator';

// JwtAuthGuard 다음에 실행된다. @Roles()가 없으면 로그인한 누구나 통과.
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!roles) return true;

    const { user } = context.switchToHttp().getRequest<{ user?: User }>();
    if (!user?.hasRole(roles)) throw new CustomException('FORBIDDEN_ROLE');
    return true;
  }
}
