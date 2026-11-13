import { CustomException } from '../../../../domain/exception/custom.exception';
import { balanceOf } from '../../../../domain/policy/balance.policy';
import { FixedClock } from '../../../../../test/fakes/fixed-clock';
import { InMemoryAuditLogRepository } from '../../../../../test/fakes/in-memory-audit-log.repository';
import { InMemoryLedgerRepository } from '../../../../../test/fakes/in-memory-ledger.repository';
import { InMemoryRequestDayRepository } from '../../../../../test/fakes/in-memory-request-day.repository';
import { InMemoryRequestRepository } from '../../../../../test/fakes/in-memory-request.repository';
import { InMemoryUserRepository } from '../../../../../test/fakes/in-memory-user.repository';
import { KIM, LEAD } from '../../../../../test/fakes/users';
import { CreateRequestUseCase } from '../../../request/use-case/create-request.use-case';
import { ApproveRequestUseCase } from './approve-request.use-case';
import { GetPendingRequestsUseCase } from './get-pending-requests.use-case';
import { RejectRequestUseCase } from './reject-request.use-case';

describe('승인·반려', () => {
  let clock: FixedClock;
  let requests: InMemoryRequestRepository;
  let ledger: InMemoryLedgerRepository;
  let audit: InMemoryAuditLogRepository;
  let create: CreateRequestUseCase;
  let approve: ApproveRequestUseCase;
  let reject: RejectRequestUseCase;
  let pendingList: GetPendingRequestsUseCase;

  beforeEach(() => {
    clock = new FixedClock('2026-11-11', '10:00:00');
    requests = new InMemoryRequestRepository();
    ledger = new InMemoryLedgerRepository();
    audit = new InMemoryAuditLogRepository();
    create = new CreateRequestUseCase(
      clock,
      requests,
      new InMemoryRequestDayRepository(requests),
      ledger,
      audit,
    );
    approve = new ApproveRequestUseCase(clock, requests, audit);
    reject = new RejectRequestUseCase(clock, requests, ledger, audit);
    pendingList = new GetPendingRequestsUseCase(
      requests,
      new InMemoryUserRepository([LEAD, KIM]),
    );
  });

  const annual = (start: string, end = start) =>
    create.execute({
      user: KIM,
      ip: '127.0.0.1',
      input: { type: 'ANNUAL', startDate: start, endDate: end, reason: '' },
    });
  const annualDays = async () =>
    balanceOf(await ledger.findByUser(KIM.id), '2026-11-11').annual / 2;
  const codeOf = (p: Promise<unknown>) =>
    p.then(
      () => 'OK',
      (e: CustomException) => e.code,
    );

  it('대기 목록은 시작일이 가까운 순이고 신청자 이름·예외 표시를 담는다', async () => {
    await annual('2026-11-20');
    await annual('2026-11-16');
    const list = await pendingList.execute('PENDING');
    expect(list.map((r) => [r.startDate, r.userName, r.isOverLimit])).toEqual([
      ['2026-11-16', '김근태', false],
      ['2026-11-20', '김근태', false],
    ]);
  });

  it('승인하면 APPROVED가 되고 잔여는 그대로다 (신청 때 이미 차감)', async () => {
    const r = await annual('2026-11-16');
    const before = await annualDays();
    const result = await approve.execute({
      lead: LEAD,
      requestId: r.id,
      ip: '127.0.0.1',
    });
    expect(result.status).toBe('APPROVED');
    expect(await annualDays()).toBe(before);
    expect(audit.actions()).toContain('REQUEST_APPROVE');
  });

  it('반려하면 REJECTED가 되고 차감한 연차가 복원된다', async () => {
    const r = await annual('2026-11-13', '2026-11-16'); // 2일
    expect(await annualDays()).toBe(8);
    const result = await reject.execute({
      lead: LEAD,
      requestId: r.id,
      rejectReason: '팀 일정과 겹침',
      ip: '127.0.0.1',
    });
    expect(result).toMatchObject({
      status: 'REJECTED',
      rejectReason: '팀 일정과 겹침',
    });
    expect(await annualDays()).toBe(10);
    expect(audit.actions()).toContain('REQUEST_REJECT');
  });

  it('반려된 날짜는 다시 신청할 수 있다 (살아 있는 신청이 아님)', async () => {
    const r = await annual('2026-11-16');
    await reject.execute({
      lead: LEAD,
      requestId: r.id,
      rejectReason: '사유',
      ip: '127.0.0.1',
    });
    expect(await codeOf(annual('2026-11-16'))).toBe('OK');
  });

  it('이미 처리된 신청은 INVALID_STATUS_TRANSITION', async () => {
    const r = await annual('2026-11-16');
    await approve.execute({ lead: LEAD, requestId: r.id, ip: '127.0.0.1' });
    expect(
      await codeOf(
        reject.execute({
          lead: LEAD,
          requestId: r.id,
          rejectReason: '사유',
          ip: '127.0.0.1',
        }),
      ),
    ).toBe('INVALID_STATUS_TRANSITION');
  });

  it('없는 신청은 REQUEST_NOT_FOUND', async () => {
    expect(
      await codeOf(
        approve.execute({ lead: LEAD, requestId: 999, ip: '127.0.0.1' }),
      ),
    ).toBe('REQUEST_NOT_FOUND');
  });
});
