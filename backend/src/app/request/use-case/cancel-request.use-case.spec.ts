import { CustomException } from '../../../domain/exception/custom.exception';
import { balanceOf } from '../../../domain/policy/balance.policy';
import { FixedClock } from '../../../../test/fakes/fixed-clock';
import { InMemoryAttendanceRepository } from '../../../../test/fakes/in-memory-attendance.repository';
import { InMemoryAuditLogRepository } from '../../../../test/fakes/in-memory-audit-log.repository';
import { InMemoryLedgerRepository } from '../../../../test/fakes/in-memory-ledger.repository';
import { InMemoryRequestDayRepository } from '../../../../test/fakes/in-memory-request-day.repository';
import { InMemoryRequestRepository } from '../../../../test/fakes/in-memory-request.repository';
import { KIM, LEAD } from '../../../../test/fakes/users';
import { CheckInUseCase } from '../../attendance/use-case/check-in.use-case';
import { ApproveRequestUseCase } from '../../lead/approval/use-case/approve-request.use-case';
import { CancelRequestDayUseCase } from '../../lead/approval/use-case/cancel-request-day.use-case';
import { CancelRequestUseCase } from './cancel-request.use-case';
import { CreateRequestUseCase } from './create-request.use-case';

describe('신청 취소', () => {
  let clock: FixedClock;
  let requests: InMemoryRequestRepository;
  let requestDays: InMemoryRequestDayRepository;
  let ledger: InMemoryLedgerRepository;
  let attendances: InMemoryAttendanceRepository;
  let audit: InMemoryAuditLogRepository;
  let create: CreateRequestUseCase;
  let approve: ApproveRequestUseCase;
  let cancel: CancelRequestUseCase;
  let cancelDay: CancelRequestDayUseCase;
  let checkIn: CheckInUseCase;

  beforeEach(() => {
    clock = new FixedClock('2026-11-11', '10:00:00'); // 수, 김근태 연차 10일
    requests = new InMemoryRequestRepository();
    requestDays = new InMemoryRequestDayRepository(requests);
    ledger = new InMemoryLedgerRepository();
    attendances = new InMemoryAttendanceRepository();
    audit = new InMemoryAuditLogRepository();
    create = new CreateRequestUseCase(
      clock,
      requests,
      requestDays,
      ledger,
      audit,
    );
    approve = new ApproveRequestUseCase(clock, requests, audit);
    cancel = new CancelRequestUseCase(clock, requests, ledger, audit);
    cancelDay = new CancelRequestDayUseCase(
      clock,
      requests,
      ledger,
      attendances,
      audit,
    );
    checkIn = new CheckInUseCase(clock, attendances, requestDays, audit);
  });

  const annual = async (start: string, end = start, user = KIM) =>
    create.execute({
      user,
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
  const selfCancel = (requestId: number, user = KIM) =>
    cancel.execute({ user, requestId, ip: '127.0.0.1' });

  describe('본인 취소 (기간 전체, 기한 전)', () => {
    it('기간 전체를 취소하고 차감한 연차를 모두 복원한다', async () => {
      const r = await annual('2026-11-13', '2026-11-16');
      expect(await annualDays()).toBe(8);
      const result = await selfCancel(r.id);
      expect(result.status).toBe('CANCELED');
      expect(await annualDays()).toBe(10);
      expect(audit.actions()).toContain('REQUEST_CANCEL');
    });

    it('승인된 신청도 기한 전이면 취소할 수 있다', async () => {
      const r = await annual('2026-11-16');
      await approve.execute({ lead: LEAD, requestId: r.id, ip: '127.0.0.1' });
      expect(await codeOf(selfCancel(r.id))).toBe('OK');
    });

    it('시작일의 직전 영업일 17:00:00까지는 된다', async () => {
      const r = await annual('2026-11-16'); // 월 → 금 17:00
      clock.at('2026-11-13', '17:00:00');
      expect(await codeOf(selfCancel(r.id))).toBe('OK');
    });

    it('17:00:01부터는 REQUEST_DEADLINE_PASSED', async () => {
      const r = await annual('2026-11-16');
      clock.at('2026-11-13', '17:00:01');
      expect(await codeOf(selfCancel(r.id))).toBe('REQUEST_DEADLINE_PASSED');
    });

    it('기간이 진행 중이면 리드만 당일 취소할 수 있다고 안내한다 (SAME_DAY_CANCEL_LEAD_ONLY)', async () => {
      const r = await annual('2026-11-13', '2026-11-16');
      clock.at('2026-11-13', '09:00:00');
      expect(await codeOf(selfCancel(r.id))).toBe('SAME_DAY_CANCEL_LEAD_ONLY');
    });

    it('남의 신청은 찾을 수 없다고 응답한다 (REQUEST_NOT_FOUND)', async () => {
      const r = await annual('2026-11-16');
      expect(await codeOf(selfCancel(r.id, LEAD))).toBe('REQUEST_NOT_FOUND');
    });

    describe('기한 후 예외 신청 (A22)', () => {
      const late = () => {
        clock.at('2026-11-12', '20:00:00'); // 금 연차의 기한(목 17:00)이 지남
        return create.execute({
          user: KIM,
          ip: '127.0.0.1',
          input: {
            type: 'ANNUAL',
            startDate: '2026-11-13',
            endDate: '2026-11-13',
            reason: '조부상',
          },
        });
      };

      it('리드가 결정하기 전이고 시작 전이면 본인이 철회하고 연차를 돌려받는다', async () => {
        const r = await late();
        expect(await annualDays()).toBe(9);
        expect((await selfCancel(r.id)).status).toBe('CANCELED');
        expect(await annualDays()).toBe(10);
      });

      it('승인된 뒤에는 기한 규칙대로 REQUEST_DEADLINE_PASSED', async () => {
        const r = await late();
        await approve.execute({ lead: LEAD, requestId: r.id, ip: '127.0.0.1' });
        expect(await codeOf(selfCancel(r.id))).toBe('REQUEST_DEADLINE_PASSED');
      });

      it('시작일이 되면 대기 중이어도 리드만 처리할 수 있다', async () => {
        const r = await late();
        clock.at('2026-11-13', '08:00:00');
        expect(await codeOf(selfCancel(r.id))).toBe(
          'SAME_DAY_CANCEL_LEAD_ONLY',
        );
      });
    });

    it('취소한 날짜는 다시 신청할 수 있다', async () => {
      const r = await annual('2026-11-16');
      await selfCancel(r.id);
      expect(await codeOf(annual('2026-11-16'))).toBe('OK');
    });
  });

  describe('리드 당일 취소 (하루만, 사유 필수)', () => {
    const approvedTwoDays = async () => {
      const r = await annual('2026-11-13', '2026-11-16');
      await approve.execute({ lead: LEAD, requestId: r.id, ip: '127.0.0.1' });
      return r;
    };
    const leadCancel = (requestId: number, date: string) =>
      cancelDay.execute({
        lead: LEAD,
        requestId,
        date,
        cancelReason: '장애 대응',
        ip: '127.0.0.1',
      });

    it('그날 하루만 취소하고 그날 연차만 복원한다', async () => {
      const r = await approvedTwoDays();
      clock.at('2026-11-16', '08:00:00');
      const result = await leadCancel(r.id, '2026-11-16');
      expect(result.status).toBe('APPROVED');
      expect(result.days.map((d) => d.status)).toEqual(['ACTIVE', 'CANCELED']);
      expect(await annualDays()).toBe(9);
      expect(audit.actions()).toContain('REQUEST_DAY_CANCEL');
    });

    it('취소된 날 출근하면 긴급 출근이라 지각이 아니다', async () => {
      const r = await approvedTwoDays();
      clock.at('2026-11-16', '08:00:00');
      await leadCancel(r.id, '2026-11-16');
      clock.at('2026-11-16', '11:00:00');
      const { attendance } = await checkIn.execute({
        user: KIM,
        ip: '127.0.0.1',
      });
      expect(attendance).toMatchObject({
        dayType: 'EMERGENCY_WORK',
        isLate: false,
      });
    });

    it('오늘이 아닌 날짜는 당일 취소할 수 없다 (NOT_SAME_DAY)', async () => {
      const r = await approvedTwoDays();
      clock.at('2026-11-13', '08:00:00');
      expect(await codeOf(leadCancel(r.id, '2026-11-16'))).toBe('NOT_SAME_DAY');
      clock.at('2026-11-17', '08:00:00');
      expect(await codeOf(leadCancel(r.id, '2026-11-16'))).toBe('NOT_SAME_DAY');
    });

    it('이미 출근한 재택 날을 당일 취소하면 그날 기록을 긴급 출근으로 바꾼다 (지각 판정 제거)', async () => {
      const r = await create.execute({
        user: KIM,
        ip: '127.0.0.1',
        input: {
          type: 'REMOTE',
          startDate: '2026-11-16',
          endDate: '2026-11-16',
          reason: '',
          ip: '10.0.0.7',
          startTime: '09:00',
          endTime: '18:00',
        },
      });
      await approve.execute({ lead: LEAD, requestId: r.id, ip: '127.0.0.1' });
      clock.at('2026-11-16', '10:30:00');
      await checkIn.execute({ user: KIM, ip: '10.0.0.7' }); // 지각으로 기록됨
      expect(attendances.rows[0].props.isLate).toBe(true);

      clock.at('2026-11-16', '11:00:00');
      await leadCancel(r.id, '2026-11-16');
      expect(attendances.rows[0].props).toMatchObject({
        dayType: 'EMERGENCY_WORK',
        isLate: false,
      });
    });
  });
});
