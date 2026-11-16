import { Attendance } from '../../../../domain/entity/attendance.entity';
import { CustomException } from '../../../../domain/exception/custom.exception';
import { balanceOf } from '../../../../domain/policy/balance.policy';
import { kstAt } from '../../../../domain/value/work-date';
import { FixedClock } from '../../../../../test/fakes/fixed-clock';
import { InMemoryAttendanceRepository } from '../../../../../test/fakes/in-memory-attendance.repository';
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
  let attendances: InMemoryAttendanceRepository;
  let create: CreateRequestUseCase;
  let approve: ApproveRequestUseCase;
  let reject: RejectRequestUseCase;
  let pendingList: GetPendingRequestsUseCase;

  beforeEach(() => {
    clock = new FixedClock('2026-11-11', '10:00:00');
    requests = new InMemoryRequestRepository();
    ledger = new InMemoryLedgerRepository();
    audit = new InMemoryAuditLogRepository();
    attendances = new InMemoryAttendanceRepository();
    create = new CreateRequestUseCase(
      clock,
      requests,
      new InMemoryRequestDayRepository(requests),
      ledger,
      audit,
    );
    approve = new ApproveRequestUseCase(clock, requests, attendances, audit);
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

  describe('출근한 뒤에 승인된 날 (ATT-48)', () => {
    const halfOff = async (date: string) => {
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
      return create.execute({
        user: KIM,
        ip: '127.0.0.1',
        input: { type: 'HALF_OFF', startDate: date, endDate: date, reason: '' },
      });
    };
    // 승인 전이라 일반일(FULL_DAY)로 기록된 출근
    const workedAsFullDay = async (
      date: string,
      inAt: string,
      outAt?: string,
    ) => {
      const a = Attendance.checkIn({
        userId: KIM.id,
        workDate: date,
        dayType: 'FULL_DAY',
        checkInAt: kstAt(date, inAt),
        isLate: inAt > '10:00:00',
        checkInIp: '127.0.0.1',
        requestDayId: null,
      });
      if (outAt) a.checkOut(kstAt(date, outAt), 'BUTTON', '127.0.0.1');
      return attendances.create(a);
    };
    const approveIt = (id: number) =>
      approve.execute({ lead: LEAD, requestId: id, ip: '127.0.0.1' });
    const today = () => attendances.findByUserAndDate(KIM.id, '2026-11-16');

    beforeEach(() => clock.at('2026-11-13', '10:00:00'));

    it('반일 OFF가 출근 뒤에 승인되면 그날을 반일 OFF 사용일로 다시 판정한다: 지각 없음', async () => {
      const r = await halfOff('2026-11-16');
      clock.at('2026-11-16', '11:00:00');
      await workedAsFullDay('2026-11-16', '10:30:00'); // 일반일이면 지각
      await approveIt(r.id);
      expect((await today())!.props).toMatchObject({
        dayType: 'HALF_DAY_OFF',
        isLate: false,
        requestDayId: r.days[0].id,
      });
    });

    it('이미 퇴근했으면 조퇴도 4시간 기준으로 다시 판정한다 (09:00→14:00 = 점심 빼고 4시간 → 정상)', async () => {
      const r = await halfOff('2026-11-16');
      clock.at('2026-11-16', '15:00:00');
      await workedAsFullDay('2026-11-16', '09:00:00', '14:00:00');
      expect((await today())!.props.isEarlyLeave).toBe(true); // 일반일 8시간 기준
      await approveIt(r.id);
      expect((await today())!.props).toMatchObject({
        dayType: 'HALF_DAY_OFF',
        isEarlyLeave: false,
        workedMinutes: 240,
      });
    });

    it('이력에 바뀐 출근 기록과 바꾸기 전 판정을 남긴다', async () => {
      const r = await halfOff('2026-11-16');
      clock.at('2026-11-16', '11:00:00');
      const a = await workedAsFullDay('2026-11-16', '10:30:00');
      await approveIt(r.id);
      expect(audit.rows.at(-1)).toMatchObject({
        action: 'REQUEST_APPROVE',
        payload: {
          convertedAttendance: {
            id: a.id,
            before: { dayType: 'FULL_DAY', isLate: true, isEarlyLeave: null },
          },
        },
      });
    });

    it('출근 기록이 없으면 아무것도 바꾸지 않는다', async () => {
      const r = await halfOff('2026-11-16');
      await approveIt(r.id);
      expect(await today()).toBeNull();
      expect(audit.rows.at(-1)!.payload).toMatchObject({
        convertedAttendance: null,
      });
    });

    it('연차는 출근 기록을 바꾸지 않는다 (근무 기록이 남는 것은 리드 당일 취소나 확인 창으로, README 한계)', async () => {
      const r = await annual('2026-11-16');
      clock.at('2026-11-16', '11:00:00');
      await workedAsFullDay('2026-11-16', '10:30:00');
      await approveIt(r.id);
      expect((await today())!.props).toMatchObject({
        dayType: 'FULL_DAY',
        isLate: true,
      });
    });
  });
});
