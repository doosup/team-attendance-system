import { InMemoryAuditLogRepository } from '../../../../test/fakes/in-memory-audit-log.repository';
import { CustomException } from '../../../domain/exception/custom.exception';
import { balanceOf } from '../../../domain/policy/balance.policy';
import { FixedClock } from '../../../../test/fakes/fixed-clock';
import { InMemoryLedgerRepository } from '../../../../test/fakes/in-memory-ledger.repository';
import { InMemoryRequestDayRepository } from '../../../../test/fakes/in-memory-request-day.repository';
import { InMemoryRequestRepository } from '../../../../test/fakes/in-memory-request.repository';
import { KIM, LEAD } from '../../../../test/fakes/users';
import { CreateRequestUseCase } from './create-request.use-case';

describe('CreateRequestUseCase', () => {
  let clock: FixedClock;
  let requests: InMemoryRequestRepository;
  let ledger: InMemoryLedgerRepository;
  let useCase: CreateRequestUseCase;
  let audit: InMemoryAuditLogRepository;

  beforeEach(() => {
    clock = new FixedClock('2026-11-11', '10:00:00'); // 수, 김근태 연차 10일 적립
    requests = new InMemoryRequestRepository();
    ledger = new InMemoryLedgerRepository();
    audit = new InMemoryAuditLogRepository();
    useCase = new CreateRequestUseCase(
      clock,
      requests,
      new InMemoryRequestDayRepository(requests),
      ledger,
      audit,
    );
  });

  const annual = (start: string, end = start) => ({
    type: 'ANNUAL' as const,
    startDate: start,
    endDate: end,
    reason: '',
  });
  const remote = (start: string, end = start, reason = '') => ({
    type: 'REMOTE' as const,
    startDate: start,
    endDate: end,
    reason,
    ip: '10.0.0.7',
    startTime: '09:00',
    endTime: '18:00',
  });
  const codeOf = (p: Promise<unknown>) =>
    p.then(
      () => 'OK',
      (e: CustomException) => e.code,
    );
  const annualDays = async () =>
    balanceOf(await ledger.findByUser(KIM.id), '2026-11-11').annual / 2;

  it('연차 기간 신청은 영업일마다 날짜 행을 만들고 대기 상태로 접수한다', async () => {
    const r = await useCase.execute({
      ip: '127.0.0.1',
      user: KIM,
      input: annual('2026-11-13', '2026-11-16'),
    });
    expect(r.status).toBe('PENDING');
    expect(r.days.map((d) => d.date)).toEqual(['2026-11-13', '2026-11-16']);
  });

  it('연차는 신청 시 영업일 수만큼 바로 차감한다 (금~월 = 2일)', async () => {
    await useCase.execute({
      ip: '127.0.0.1',
      user: KIM,
      input: annual('2026-11-13', '2026-11-16'),
    });
    expect(await annualDays()).toBe(8);
  });

  it('잔여보다 많이 신청하면 INSUFFICIENT_BALANCE', async () => {
    expect(
      await codeOf(
        useCase.execute({
          ip: '127.0.0.1',
          user: KIM,
          input: annual('2026-11-16', '2026-11-30'),
        }),
      ),
    ).toBe('INSUFFICIENT_BALANCE');
  });

  it('기한(직전 영업일 17:00:00)이 지나면 REQUEST_DEADLINE_PASSED', async () => {
    clock.at('2026-11-12', '17:00:01');
    expect(
      await codeOf(
        useCase.execute({
          ip: '127.0.0.1',
          user: KIM,
          input: annual('2026-11-13'),
        }),
      ),
    ).toBe('REQUEST_DEADLINE_PASSED');
  });

  it('이미 살아 있는 신청과 날짜가 겹치면 OVERLAPPING_REQUEST', async () => {
    await useCase.execute({
      ip: '127.0.0.1',
      user: KIM,
      input: annual('2026-11-16'),
    });
    expect(
      await codeOf(
        useCase.execute({
          ip: '127.0.0.1',
          user: KIM,
          input: remote('2026-11-16'),
        }),
      ),
    ).toBe('OVERLAPPING_REQUEST');
  });

  it('리드 본인 신청은 자동 승인된다', async () => {
    const r = await useCase.execute({
      ip: '127.0.0.1',
      user: LEAD,
      input: annual('2026-11-16'),
    });
    expect(r.status).toBe('APPROVED');
  });

  it('재택 IP는 정규화해 저장하고, 형식이 틀리면 INVALID_IP_FORMAT', async () => {
    const r = await useCase.execute({
      ip: '127.0.0.1',
      user: KIM,
      input: { ...remote('2026-11-16'), ip: ' ::ffff:10.0.0.7 ' },
    });
    expect(r.ip).toBe('10.0.0.7');
    expect(
      await codeOf(
        useCase.execute({
          ip: '127.0.0.1',
          user: KIM,
          input: { ...remote('2026-11-17'), ip: '10.0.0' },
        }),
      ),
    ).toBe('INVALID_IP_FORMAT');
  });

  it('재택 시간대는 시작이 종료보다 일러야 한다', async () => {
    expect(
      await codeOf(
        useCase.execute({
          ip: '127.0.0.1',
          user: KIM,
          input: {
            ...remote('2026-11-16'),
            startTime: '18:00',
            endTime: '09:00',
          },
        }),
      ),
    ).toBe('VALIDATION_FAILED');
  });

  describe('재택 월 2회 한도 (예외 신청, ATT-29)', () => {
    it('그달 2회까지는 일반 신청이다', async () => {
      await useCase.execute({
        ip: '127.0.0.1',
        user: KIM,
        input: remote('2026-11-16'),
      });
      const r = await useCase.execute({
        ip: '127.0.0.1',
        user: KIM,
        input: remote('2026-11-17'),
      });
      expect(r.isOverLimit).toBe(false);
    });

    it('3회째는 거부하지 않고 사유를 받아 예외 신청으로 접수한다', async () => {
      await useCase.execute({
        ip: '127.0.0.1',
        user: KIM,
        input: remote('2026-11-16', '2026-11-17'),
      });
      const r = await useCase.execute({
        ip: '127.0.0.1',
        user: KIM,
        input: remote('2026-11-18', '2026-11-18', '아이가 아파서'),
      });
      expect(r).toMatchObject({ isOverLimit: true, status: 'PENDING' });
    });

    it('예외 신청분도 그달 재택 횟수에 들어간다 (3일 예외 뒤 1일 더 → 또 예외, A10)', async () => {
      await useCase.execute({
        ip: '127.0.0.1',
        user: KIM,
        input: remote('2026-11-16', '2026-11-18', '이사'),
      });
      expect(
        await codeOf(
          useCase.execute({
            ip: '127.0.0.1',
            user: KIM,
            input: remote('2026-11-19'),
          }),
        ),
      ).toBe('OVER_LIMIT_REASON_REQUIRED');
    });

    it('예외 신청에 사유가 없으면 OVER_LIMIT_REASON_REQUIRED', async () => {
      await useCase.execute({
        ip: '127.0.0.1',
        user: KIM,
        input: remote('2026-11-16', '2026-11-17'),
      });
      expect(
        await codeOf(
          useCase.execute({
            ip: '127.0.0.1',
            user: KIM,
            input: remote('2026-11-18'),
          }),
        ),
      ).toBe('OVER_LIMIT_REASON_REQUIRED');
    });

    it('리드 본인의 예외 신청도 자동 승인된다 (예외 표시는 남음)', async () => {
      await useCase.execute({
        ip: '127.0.0.1',
        user: LEAD,
        input: remote('2026-11-16', '2026-11-17'),
      });
      const r = await useCase.execute({
        ip: '127.0.0.1',
        user: LEAD,
        input: remote('2026-11-18', '2026-11-18', '외부 미팅'),
      });
      expect(r).toMatchObject({ isOverLimit: true, status: 'APPROVED' });
    });
  });

  describe('반일 OFF', () => {
    it('근무 예정 시간대도 시작이 종료보다 일러야 한다 (ATT-34)', async () => {
      expect(
        await codeOf(
          useCase.execute({
            ip: '127.0.0.1',
            user: KIM,
            input: {
              type: 'HALF_OFF',
              startDate: '2026-11-16',
              endDate: '2026-11-16',
              reason: '',
              startTime: '17:00',
              endTime: '13:00',
            },
          }),
        ),
      ).toBe('VALIDATION_FAILED');
    });

    it('반일 OFF는 오전/오후와 반차 시간 없이도 신청된다 (과제 FN-REQ-01은 종류·날짜·사유만)', async () => {
      await ledger.append([
        {
          userId: KIM.id,
          kind: 'HALF_OFF',
          event: 'ACCRUE',
          halfDays: 1,
          effectiveDate: '2026-11-07',
          expiresOn: '2026-12-07',
          grantId: null,
          requestDayId: null,
          dedupKey: 'ACCRUE:HALF_OFF:attendance:1',
        },
      ]);
      const r = await useCase.execute({
        ip: '127.0.0.1',
        user: KIM,
        input: {
          type: 'HALF_OFF',
          startDate: '2026-11-16',
          endDate: '2026-11-16',
          reason: '',
        },
      });
      expect(r).toMatchObject({
        status: 'PENDING',
        halfOffPart: null,
        startTime: null,
        endTime: null,
      });
    });

    it('OFF가 없으면 INSUFFICIENT_BALANCE', async () => {
      expect(
        await codeOf(
          useCase.execute({
            ip: '127.0.0.1',
            user: KIM,
            input: {
              type: 'HALF_OFF',
              startDate: '2026-11-16',
              endDate: '2026-11-16',
              reason: '',
              startTime: '13:00',
              endTime: '17:00',
            },
          }),
        ),
      ).toBe('INSUFFICIENT_BALANCE');
    });

    it('만료가 가까운 지급분에서 하나 쓰고 원장에 지급분을 연결한다', async () => {
      await ledger.append([
        {
          userId: KIM.id,
          kind: 'HALF_OFF',
          event: 'ACCRUE',
          halfDays: 1,
          effectiveDate: '2026-11-07',
          expiresOn: '2026-12-07',
          grantId: null,
          requestDayId: null,
          dedupKey: 'ACCRUE:HALF_OFF:attendance:1',
        },
      ]);
      const r = await useCase.execute({
        ip: '127.0.0.1',
        user: KIM,
        input: {
          type: 'HALF_OFF',
          startDate: '2026-11-16',
          endDate: '2026-11-16',
          reason: '',
          halfOffPart: 'AM',
          startTime: '09:00',
          endTime: '13:00',
        },
      });
      expect(r).toMatchObject({
        ip: null,
        halfOffPart: 'AM',
        startTime: '09:00',
        endTime: '13:00',
      });
      const use = ledger.rows.find((e) => e.props.event === 'USE');
      expect(use?.props).toMatchObject({
        kind: 'HALF_OFF',
        halfDays: -1,
        grantId: ledger.rows[0].props.id,
        requestDayId: r.days[0].id,
      });
    });
  });

  it('신청하면 REQUEST_CREATE 이력에 자동 승인·예외 여부를 남긴다', async () => {
    await useCase.execute({
      user: LEAD,
      input: annual('2026-11-16'),
      ip: '127.0.0.1',
    });
    expect(audit.rows[0]).toMatchObject({
      actorId: LEAD.id,
      action: 'REQUEST_CREATE',
      targetType: 'Request',
      ip: '127.0.0.1',
      payload: expect.objectContaining({
        autoApproved: true,
        isOverLimit: false,
      }) as unknown,
    });
  });
});
