import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { User } from '../../domain/entity/user.entity';

// JwtAuthGuard가 붙인 로그인 사용자.
export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): User =>
    ctx.switchToHttp().getRequest<{ user: User }>().user,
);
