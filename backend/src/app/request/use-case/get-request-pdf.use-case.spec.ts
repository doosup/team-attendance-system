import { CustomException } from '../../../domain/exception/custom.exception';
import {
  RequestDocument,
  RequestPdfRenderer,
} from '../../../domain/port/request-pdf.port';
import { kstAt } from '../../../domain/value/work-date';
import { FixedClock } from '../../../../test/fakes/fixed-clock';
import { InMemoryAttendanceRepository } from '../../../../test/fakes/in-memory-attendance.repository';
import { InMemoryAuditLogRepository } from '../../../../test/fakes/in-memory-audit-log.repository';
import { InMemoryLedgerRepository } from '../../../../test/fakes/in-memory-ledger.repository';
import { InMemoryRequestDayRepository } from '../../../../test/fakes/in-memory-request-day.repository';
import { InMemoryRequestRepository } from '../../../../test/fakes/in-memory-request.repository';
import { InMemoryUserRepository } from '../../../../test/fakes/in-memory-user.repository';
import { KIM, LEAD } from '../../../../test/fakes/users';
import { ApproveRequestUseCase } from '../../lead/approval/use-case/approve-request.use-case';
import { CreateRequestUseCase } from './create-request.use-case';
import { GetRequestPdfUseCase } from './get-request-pdf.use-case';

// 그리기는 infrastructure 테스트가 맡는다. 여기서는 무엇을 넘기는지만 본다
class CapturingRenderer extends RequestPdfRenderer {
  last: RequestDocument | null = null;
  render(doc: RequestDocument) {
    this.last = doc;
    return Promise.resolve(Buffer.from('%PDF-fake'));
  }
}

describe('신청서 PDF', () => {
  let clock: FixedClock;
  let requests: InMemoryRequestRepository;
  let users: InMemoryUserRepository;
  let renderer: CapturingRenderer;
  let create: CreateRequestUseCase;
  let approve: ApproveRequestUseCase;
  let getPdf: GetRequestPdfUseCase;

  beforeEach(() => {
    clock = new FixedClock('2026-11-11', '10:00:00');
    requests = new InMemoryRequestRepository();
    users = new InMemoryUserRepository([LEAD, KIM]);
    renderer = new CapturingRenderer();
    const audit = new InMemoryAuditLogRepository();
    create = new CreateRequestUseCase(
      clock,
      requests,
      new InMemoryRequestDayRepository(requests),
      new InMemoryLedgerRepository(),
      audit,
    );
    approve = new ApproveRequestUseCase(
      clock,
      requests,
      new InMemoryAttendanceRepository(),
      audit,
    );
    getPdf = new GetRequestPdfUseCase(clock, requests, users, renderer);
  });

  const annual = (user = KIM) =>
    create.execute({
      user,
      ip: '127.0.0.1',
      input: {
        type: 'ANNUAL',
        startDate: '2026-11-20',
        endDate: '2026-11-23',
        reason: '가족 행사',
      },
    });

  it('본인은 자기 신청서를 받는다 (신청자 이름·발급 시각 포함, 미결재)', async () => {
    const { id } = await annual();

    const pdf = await getPdf.execute({ user: KIM, requestId: id });

    expect(pdf.toString()).toBe('%PDF-fake');
    expect(renderer.last).toMatchObject({
      requestId: id,
      type: 'ANNUAL',
      status: 'PENDING',
      applicantName: '김근태',
      startDate: '2026-11-20',
      endDate: '2026-11-23',
      reason: '가족 행사',
      deciderName: null,
      issuedAt: kstAt('2026-11-11', '10:00:00'),
    });
    expect(renderer.last?.days.map((d) => d.date)).toEqual([
      '2026-11-20',
      '2026-11-23',
    ]);
  });

  it('리드는 팀원 신청서를 받고, 승인했다면 결재자 이름이 들어간다', async () => {
    const { id } = await annual();
    await approve.execute({ lead: LEAD, requestId: id, ip: '127.0.0.1' });

    await getPdf.execute({ user: LEAD, requestId: id });

    expect(renderer.last).toMatchObject({
      status: 'APPROVED',
      applicantName: '김근태',
      deciderName: '이리드',
      decidedAt: kstAt('2026-11-11', '10:00:00'),
    });
  });

  it('팀원이 남의 신청서를 요청하면 없는 신청과 같이 거부한다', async () => {
    const { id } = await annual(LEAD);

    await expect(getPdf.execute({ user: KIM, requestId: id })).rejects.toThrow(
      new CustomException('REQUEST_NOT_FOUND'),
    );
    expect(renderer.last).toBeNull();
  });

  it('없는 신청은 REQUEST_NOT_FOUND', async () => {
    await expect(
      getPdf.execute({ user: LEAD, requestId: 999 }),
    ).rejects.toThrow(new CustomException('REQUEST_NOT_FOUND'));
  });

  it('퇴사한 신청자의 신청서도 이름이 그대로 나온다', async () => {
    const { id } = await annual();
    await users.retire(KIM.id, kstAt('2026-11-12', '18:00:00'));

    await getPdf.execute({ user: LEAD, requestId: id });

    expect(renderer.last?.applicantName).toBe('김근태');
  });
});
