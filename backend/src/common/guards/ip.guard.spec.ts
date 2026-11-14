import { InMemoryAuditLogRepository } from '../../../test/fakes/in-memory-audit-log.repository';
import { ExecutionContext } from '@nestjs/common';
import { User } from '../../domain/entity/user.entity';
import { CustomException } from '../../domain/exception/custom.exception';
import { FixedClock } from '../../../test/fakes/fixed-clock';
import { InMemoryAllowedIpRepository } from '../../../test/fakes/in-memory-allowed-ip.repository';
import { InMemoryRequestDayRepository } from '../../../test/fakes/in-memory-request-day.repository';
import { InMemoryRequestRepository } from '../../../test/fakes/in-memory-request.repository';
import { KIM, LEAD } from '../../../test/fakes/users';
import { Request } from '../../domain/entity/request.entity';
import { IpGuard } from './ip.guard';

const contextWith = (ip: string, user?: User) =>
  ({
    switchToHttp: () => ({
      getRequest: () => ({ ip, user, method: 'GET', url: '/attendance/today' }),
    }),
  }) as unknown as ExecutionContext;

describe('IpGuard', () => {
  let clock: FixedClock;
  let requests: InMemoryRequestRepository;
  let guard: IpGuard;
  let audit: InMemoryAuditLogRepository;

  beforeEach(async () => {
    clock = new FixedClock('2026-11-16', '10:00:00'); // 월
    requests = new InMemoryRequestRepository();
    audit = new InMemoryAuditLogRepository();
    guard = new IpGuard(
      clock,
      new InMemoryAllowedIpRepository(['127.0.0.1']),
      new InMemoryRequestDayRepository(requests),
      audit,
    );
    // 김근태 11/16 재택 승인 (10.0.0.7, 09:00~18:00)
    const remote = Request.submit(
      {
        type: 'REMOTE',
        startDate: '2026-11-16',
        endDate: '2026-11-16',
        isOverLimit: false,
        isAfterDeadline: false,
        reason: '',
        ip: '10.0.0.7',
        halfOffPart: null,
        startTime: '09:00',
        endTime: '18:00',
      },
      KIM,
      ['2026-11-16'],
      clock.now(),
    );
    remote.props.status = 'APPROVED';
    await requests.create(remote);
  });

  const check = async (ip: string, user?: User) => {
    try {
      return await guard.canActivate(contextWith(ip, user));
    } catch (e) {
      return (e as CustomException).code;
    }
  };

  it('연구실 IP는 언제나 허용한다', async () => {
    clock.at('2026-11-15', '03:00:00');
    expect(await check('127.0.0.1', KIM)).toBe(true);
  });

  it('로컬 IPv6 표기(::1, ::ffff:127.0.0.1)도 연구실 IP로 본다', async () => {
    expect(await check('::1', KIM)).toBe(true);
    expect(await check('::ffff:127.0.0.1', KIM)).toBe(true);
  });

  it('등록되지 않은 IP는 IP_NOT_ALLOWED이고 메시지에 현재 IP를 담는다', async () => {
    await expect(
      guard.canActivate(contextWith('203.0.113.9', KIM)),
    ).rejects.toMatchObject({
      code: 'IP_NOT_ALLOWED',
      message: '등록된 IP가 아닙니다 (현재 IP: 203.0.113.9)',
    });
  });

  it('승인된 재택 신청의 IP·시간대에서는 본인을 허용한다', async () => {
    expect(await check('10.0.0.7', KIM)).toBe(true);
  });

  it('재택 IP라도 신청한 본인이 아니면 막는다', async () => {
    expect(await check('10.0.0.7', LEAD)).toBe('IP_NOT_ALLOWED');
  });

  it.each([
    ['08:59:59', 'IP_NOT_ALLOWED'],
    ['09:00:00', true],
    ['18:00:00', true],
    ['18:00:01', 'IP_NOT_ALLOWED'],
  ])('재택 시간대 경계 %s → %s', async (time, expected) => {
    clock.at('2026-11-16', time);
    expect(await check('10.0.0.7', KIM)).toBe(expected);
  });

  it('다른 날에는 재택 IP가 열리지 않는다', async () => {
    clock.at('2026-11-17', '10:00:00');
    expect(await check('10.0.0.7', KIM)).toBe('IP_NOT_ALLOWED');
  });

  it('승인 대기 중인 신청은 IP를 열지 않는다 (결정 14)', async () => {
    requests.rows[0].props.status = 'PENDING';
    expect(await check('10.0.0.7', KIM)).toBe('IP_NOT_ALLOWED');
  });

  it('리드가 당일 취소한 날짜는 IP를 열지 않는다', async () => {
    requests.rows[0].props.days[0].status = 'CANCELED';
    expect(await check('10.0.0.7', KIM)).toBe('IP_NOT_ALLOWED');
  });

  it('로그인 전(사용자 모름)에는 그 IP·시간대의 승인 신청이 있으면 통과시킨다', async () => {
    expect(await check('10.0.0.7')).toBe(true);
    expect(await check('203.0.113.9')).toBe('IP_NOT_ALLOWED');
  });

  it('막은 요청은 IP_BLOCKED 이력에 IP·경로를 남긴다', async () => {
    await check('203.0.113.9', KIM);
    expect(audit.rows[0]).toMatchObject({
      actorId: KIM.id,
      action: 'IP_BLOCKED',
      targetType: null,
      ip: '203.0.113.9',
      payload: { method: 'GET', path: '/attendance/today' },
    });
  });

  it('허용한 요청은 이력을 남기지 않는다', async () => {
    await check('127.0.0.1', KIM);
    expect(audit.rows).toEqual([]);
  });
});
