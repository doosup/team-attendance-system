import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { normalizeIp } from '../utils/ip.util';

// 접속 IP (정규화). 프록시 뒤가 아니라 소켓 주소를 그대로 쓴다.
export const ClientIp = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): string =>
    normalizeIp(ctx.switchToHttp().getRequest<{ ip?: string }>().ip ?? ''),
);
