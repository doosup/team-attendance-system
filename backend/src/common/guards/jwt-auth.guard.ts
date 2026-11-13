import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { User } from '../../domain/entity/user.entity';
import { CustomException } from '../../domain/exception/custom.exception';
import { TokenPort } from '../../domain/port/token.port';
import { UserRepository } from '../../domain/repository/user.repository';
import { IS_PUBLIC } from '../decorators/public.decorator';

type AuthRequest = { headers: { authorization?: string }; user?: User };

// 전역 가드. 토큰이 유효해도 사용자를 다시 조회해 퇴사자를 막고, 역할은 DB 값을 쓴다.
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokens: TokenPort,
    private readonly users: UserRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<AuthRequest>();
    const [scheme, token] = request.headers.authorization?.split(' ') ?? [];
    const payload =
      scheme === 'Bearer' && token ? await this.tokens.verify(token) : null;
    const user = payload ? await this.users.findById(payload.userId) : null;
    if (!user) throw new CustomException('UNAUTHORIZED');

    request.user = user;
    return true;
  }
}
