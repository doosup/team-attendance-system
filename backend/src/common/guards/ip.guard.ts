import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { User } from '../../domain/entity/user.entity';
import { CustomException } from '../../domain/exception/custom.exception';
import { isWithinWindow } from '../../domain/policy/access.policy';
import { Clock } from '../../domain/port/clock.port';
import { AllowedIpRepository } from '../../domain/repository/allowed-ip.repository';
import { AuditLogRepository } from '../../domain/repository/audit-log.repository';
import { RequestDayRepository } from '../../domain/repository/request-day.repository';
import { workDateOf } from '../../domain/value/work-date';
import { normalizeIp } from '../utils/ip.util';

type HttpRequest = { ip?: string; user?: User; method?: string; url?: string };

/**
 * 전역 가드 (JwtAuthGuard 다음). 연구실 IP는 상시 허용, 그 밖의 IP는
 * 오늘 승인된 재택·주말 근무 신청의 IP·시간대에서 **신청한 본인만** 허용 (FR-SYS-01, FR-ATT-04).
 * 로그인 요청처럼 사용자를 아직 모르면 그 IP·시간대의 승인 신청이 하나라도 있으면 통과.
 * 막은 요청은 IP_BLOCKED 이력을 남긴다 (트랜잭션 밖이라 거부해도 남음).
 */
@Injectable()
export class IpGuard implements CanActivate {
  constructor(
    private readonly clock: Clock,
    private readonly allowedIps: AllowedIpRepository,
    private readonly requestDays: RequestDayRepository,
    private readonly audit: AuditLogRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<HttpRequest>();
    const ip = normalizeIp(req.ip ?? '');
    if (await this.allowedIps.isAllowed(ip)) return true;

    const now = this.clock.now();
    const windows = await this.requestDays.findApprovedWindows(
      workDateOf(now),
      ip,
    );
    const open = windows.some(
      (w) =>
        (!req.user || w.userId === req.user.id) &&
        isWithinWindow(now, w.startTime, w.endTime),
    );
    if (open) return true;

    await this.audit.append({
      actorId: req.user?.id ?? null,
      action: 'IP_BLOCKED',
      targetType: null,
      targetId: null,
      payload: { method: req.method, path: req.url?.split('?')[0] },
      ip,
      occurredAt: now,
    });
    throw new CustomException(
      'IP_NOT_ALLOWED',
      `등록된 IP가 아닙니다 (현재 IP: ${ip})`,
    );
  }
}
