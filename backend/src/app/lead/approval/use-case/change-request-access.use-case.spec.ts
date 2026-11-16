import { CustomException } from '../../../../domain/exception/custom.exception';
import { FixedClock } from '../../../../../test/fakes/fixed-clock';
import { InMemoryAttendanceRepository } from '../../../../../test/fakes/in-memory-attendance.repository';
import { InMemoryAuditLogRepository } from '../../../../../test/fakes/in-memory-audit-log.repository';
import { InMemoryLedgerRepository } from '../../../../../test/fakes/in-memory-ledger.repository';
import { InMemoryRequestDayRepository } from '../../../../../test/fakes/in-memory-request-day.repository';
import { InMemoryRequestRepository } from '../../../../../test/fakes/in-memory-request.repository';
import { KIM, LEAD } from '../../../../../test/fakes/users';
import { CreateRequestUseCase } from '../../../request/use-case/create-request.use-case';
import { ApproveRequestUseCase } from './approve-request.use-case';
import { ChangeRequestAccessUseCase } from './change-request-access.use-case';

describe('리드의 재택·주말 근무 IP·시간대 변경 (ATT-42, 결정 A23)', () => {
  let clock: FixedClock;
  let requests: InMemoryRequestRepository;
  let requestDays: InMemoryRequestDayRepository;
  let audit: InMemoryAuditLogRepository;
  let create: CreateRequestUseCase;
  let approve: ApproveRequestUseCase;
  let change: ChangeRequestAccessUseCase;

  beforeEach(() => {
    clock = new FixedClock('2026-11-11', '10:00:00'); // 수
    requests = new InMemoryRequestRepository();
    requestDays = new InMemoryRequestDayRepository(requests);
    audit = new InMemoryAuditLogRepository();
    create = new CreateRequestUseCase(
      clock,
      requests,
      requestDays,
      new InMemoryLedgerRepository(),
      audit,
    );
    approve = new ApproveRequestUseCase(
      clock,
      requests,
      new InMemoryAttendanceRepository(),
      audit,
    );
    change = new ChangeRequestAccessUseCase(clock, requests, audit);
  });

  const remote = async (date = '2026-11-16') => {
    const r = await create.execute({
      user: KIM,
      ip: '127.0.0.1',
      input: {
        type: 'REMOTE',
        startDate: date,
        endDate: date,
        reason: '',
        ip: '10.0.0.7',
        startTime: '09:00',
        endTime: '18:00',
      },
    });
    await approve.execute({ lead: LEAD, requestId: r.id, ip: '127.0.0.1' });
    return r.id;
  };
  const access = { ip: '10.0.0.8', startTime: '08:00', endTime: '19:00' };
  const run = (requestId: number, a = access, reason = 'IP 오타') =>
    change.execute({
      lead: LEAD,
      requestId,
      access: a,
      reason,
      clientIp: '127.0.0.1',
    });
  const codeOf = (p: Promise<unknown>) =>
    p.then(
      () => 'OK',
      (e: CustomException) => e.code,
    );

  it('바꾼 IP·시간대로 접속 창이 바로 바뀌고, 예전 IP는 더 이상 열리지 않는다', async () => {
    const id = await remote();
    const r = await run(id);
    expect(r).toMatchObject({
      ip: '10.0.0.8',
      startTime: '08:00',
      endTime: '19:00',
      accessChangeReason: 'IP 오타',
    });
    expect(r.accessChangedAt).not.toBeNull();
    expect(
      await requestDays.findApprovedWindows('2026-11-16', '10.0.0.8'),
    ).toEqual([{ userId: KIM.id, startTime: '08:00', endTime: '19:00' }]);
    expect(
      await requestDays.findApprovedWindows('2026-11-16', '10.0.0.7'),
    ).toEqual([]);
  });

  it('이력에 바꾸기 전·후 값과 사유를 남긴다', async () => {
    const id = await remote();
    await run(id);
    expect(audit.rows.at(-1)).toMatchObject({
      actorId: LEAD.id,
      action: 'REQUEST_ACCESS_CHANGE',
      targetId: id,
      payload: {
        applicantId: KIM.id,
        type: 'REMOTE',
        before: { ip: '10.0.0.7', startTime: '09:00', endTime: '18:00' },
        after: { ip: '10.0.0.8', startTime: '08:00', endTime: '19:00' },
        reason: 'IP 오타',
      },
    });
  });

  it('당일(오늘 날짜)도 바꿀 수 있다', async () => {
    const id = await remote('2026-11-16');
    clock.at('2026-11-16', '08:30:00');
    expect(await codeOf(run(id))).toBe('OK');
  });

  it('지난 날짜만 남은 신청은 ACCESS_CHANGE_NOT_ALLOWED', async () => {
    const id = await remote('2026-11-16');
    clock.at('2026-11-17', '09:00:00');
    expect(await codeOf(run(id))).toBe('ACCESS_CHANGE_NOT_ALLOWED');
  });

  it('연차는 IP가 없으므로 ACCESS_CHANGE_NOT_ALLOWED', async () => {
    const r = await create.execute({
      user: KIM,
      ip: '127.0.0.1',
      input: {
        type: 'ANNUAL',
        startDate: '2026-11-16',
        endDate: '2026-11-16',
        reason: '',
      },
    });
    expect(await codeOf(run(r.id))).toBe('ACCESS_CHANGE_NOT_ALLOWED');
  });

  it('취소된 신청은 INVALID_STATUS_TRANSITION', async () => {
    const id = await remote();
    const req = await requests.findById(id);
    req!.cancelBySelf(KIM.id, clock.now());
    await requests.save(req!);
    expect(await codeOf(run(id))).toBe('INVALID_STATUS_TRANSITION');
  });

  it('IP 형식이 틀리면 INVALID_IP_FORMAT, 시작 ≥ 종료면 VALIDATION_FAILED, 사유가 공백이면 VALIDATION_FAILED', async () => {
    const id = await remote();
    expect(await codeOf(run(id, { ...access, ip: '999.1.1.1' }))).toBe(
      'INVALID_IP_FORMAT',
    );
    expect(
      await codeOf(
        run(id, { ...access, startTime: '19:00', endTime: '08:00' }),
      ),
    ).toBe('VALIDATION_FAILED');
    expect(await codeOf(run(id, access, '   '))).toBe('VALIDATION_FAILED');
  });

  it('없는 신청은 REQUEST_NOT_FOUND', async () => {
    expect(await codeOf(run(999))).toBe('REQUEST_NOT_FOUND');
  });
});
