import { FakePasswordHasher } from '../../../../../test/fakes/fake-auth';
import { FixedClock } from '../../../../../test/fakes/fixed-clock';
import { InMemoryAuditLogRepository } from '../../../../../test/fakes/in-memory-audit-log.repository';
import { InMemoryLedgerRepository } from '../../../../../test/fakes/in-memory-ledger.repository';
import { InMemoryRequestDayRepository } from '../../../../../test/fakes/in-memory-request-day.repository';
import { InMemoryRequestRepository } from '../../../../../test/fakes/in-memory-request.repository';
import { InMemoryUserRepository } from '../../../../../test/fakes/in-memory-user.repository';
import { KIM, LEAD } from '../../../../../test/fakes/users';
import { CustomException } from '../../../../domain/exception/custom.exception';
import { balanceOf } from '../../../../domain/policy/balance.policy';
import { kstAt } from '../../../../domain/value/work-date';
import { ApproveRequestUseCase } from '../../approval/use-case/approve-request.use-case';
import { GetPendingRequestsUseCase } from '../../approval/use-case/get-pending-requests.use-case';
import { CreateRequestUseCase } from '../../../request/use-case/create-request.use-case';
import { GetMembersUseCase } from './get-members.use-case';
import { RegisterMemberUseCase } from './register-member.use-case';
import { RetireMemberUseCase } from './retire-member.use-case';

describe('팀원 등록·퇴사 처리 (결정 A19·A20)', () => {
  let clock: FixedClock;
  let users: InMemoryUserRepository;
  let requests: InMemoryRequestRepository;
  let ledger: InMemoryLedgerRepository;
  let audit: InMemoryAuditLogRepository;
  let register: RegisterMemberUseCase;
  let retire: RetireMemberUseCase;
  let list: GetMembersUseCase;
  let create: CreateRequestUseCase;

  beforeEach(() => {
    clock = new FixedClock('2026-11-11', '10:00:00'); // 수
    users = new InMemoryUserRepository([LEAD, KIM]);
    requests = new InMemoryRequestRepository();
    ledger = new InMemoryLedgerRepository();
    audit = new InMemoryAuditLogRepository();
    register = new RegisterMemberUseCase(
      clock,
      users,
      new FakePasswordHasher(),
      audit,
    );
    retire = new RetireMemberUseCase(clock, users, requests, ledger, audit);
    list = new GetMembersUseCase(users);
    create = new CreateRequestUseCase(
      clock,
      requests,
      new InMemoryRequestDayRepository(requests),
      ledger,
      audit,
    );
  });

  const body = (over: Partial<Record<string, string>> = {}) => ({
    loginId: 'newbie',
    password: 'password123',
    name: '신입',
    joinDate: '2026-11-02',
    ...over,
  });
  const codeOf = (p: Promise<unknown>) =>
    p.then(
      () => 'OK',
      (e: CustomException) => e.code,
    );

  describe('등록', () => {
    it('팀원 역할로 저장하고 비밀번호는 해시로만 남기며 이력을 쓴다', async () => {
      const r = await register.execute({
        lead: LEAD,
        ip: '127.0.0.1',
        body: body(),
      });

      expect(r.id).toBeGreaterThan(KIM.id);
      expect(r).toMatchObject({
        loginId: 'newbie',
        name: '신입',
        role: 'MEMBER',
        joinDate: '2026-11-02',
      });
      const saved = await users.findByLoginId('newbie');
      expect(saved?.passwordHash).toBe('hash:password123');
      expect(audit.rows.at(-1)).toMatchObject({
        actorId: LEAD.id,
        action: 'USER_CREATE',
        targetType: 'User',
        targetId: r.id,
        payload: { loginId: 'newbie', name: '신입', joinDate: '2026-11-02' },
      });
      expect(JSON.stringify(audit.rows)).not.toContain('password123');
    });

    it('입사일은 오늘까지 가능하고, 내일이면 JOIN_DATE_IN_FUTURE', async () => {
      expect(
        await codeOf(
          register.execute({
            lead: LEAD,
            ip: '127.0.0.1',
            body: body({ joinDate: '2026-11-11' }),
          }),
        ),
      ).toBe('OK');
      expect(
        await codeOf(
          register.execute({
            lead: LEAD,
            ip: '127.0.0.1',
            body: body({ loginId: 'later', joinDate: '2026-11-12' }),
          }),
        ),
      ).toBe('JOIN_DATE_IN_FUTURE');
    });

    it('퇴사자가 쓰던 아이디도 다시 쓸 수 없다 (DUPLICATE_LOGIN_ID)', async () => {
      await retire.execute({ lead: LEAD, id: KIM.id, ip: '127.0.0.1' });

      expect(
        await codeOf(
          register.execute({
            lead: LEAD,
            ip: '127.0.0.1',
            body: body({ loginId: KIM.loginId }),
          }),
        ),
      ).toBe('DUPLICATE_LOGIN_ID');
    });
  });

  describe('퇴사 처리', () => {
    it('로그인·목록 조회에서 빠지고, 퇴사자 포함 조회에는 퇴사 시각과 남는다', async () => {
      await retire.execute({ lead: LEAD, id: KIM.id, ip: '127.0.0.1' });

      expect(await users.findById(KIM.id)).toBeNull();
      expect((await list.execute()).map((m) => m.loginId)).toEqual(['lead']);
      const kept = (await users.findAllIncludingRetired()).find(
        (u) => u.id === KIM.id,
      );
      expect(kept?.retiredAt).toEqual(kstAt('2026-11-11', '10:00:00'));
      expect(audit.rows.at(-1)).toMatchObject({
        actorId: LEAD.id,
        action: 'USER_RETIRE',
        targetType: 'User',
        targetId: KIM.id,
      });
    });

    it('승인된 신청은 내일 이후 날짜만 자동 취소되고 연차가 복원된다 (오늘 날짜는 그대로)', async () => {
      // 11/11 신청: 11/13(금)·11/16(월) 연차 2일
      const req = await create.execute({
        user: KIM,
        ip: '127.0.0.1',
        input: {
          type: 'ANNUAL',
          startDate: '2026-11-13',
          endDate: '2026-11-16',
          reason: '',
        },
      });
      await new ApproveRequestUseCase(clock, requests, audit).execute({
        lead: LEAD,
        requestId: req.id,
        ip: '127.0.0.1',
      });
      const annual = async () =>
        balanceOf(await ledger.findByUser(KIM.id), '2026-11-13').annual / 2;
      const before = await annual();

      clock.at('2026-11-13', '18:00:00'); // 금요일 퇴사 처리
      await retire.execute({ lead: LEAD, id: KIM.id, ip: '127.0.0.1' });

      const saved = await requests.findById(req.id);
      expect(saved?.props.days.map((d) => [d.date, d.status])).toEqual([
        ['2026-11-13', 'ACTIVE'],
        ['2026-11-16', 'CANCELED'],
      ]);
      expect(saved?.props.days[1].cancelType).toBe('RETIREMENT');
      expect(await annual()).toBe(before + 1);
      expect(audit.rows.at(-1)?.payload).toMatchObject({
        canceledDays: 1,
        restoredHalfDays: 2,
      });
    });

    it('리드의 대기·승인 목록에 퇴사자의 신청이 남지 않는다', async () => {
      await create.execute({
        user: KIM,
        ip: '127.0.0.1',
        input: {
          type: 'ANNUAL',
          startDate: '2026-11-13',
          endDate: '2026-11-16',
          reason: '',
        },
      });
      clock.at('2026-11-13', '18:00:00'); // 기간 중 퇴사

      await retire.execute({ lead: LEAD, id: KIM.id, ip: '127.0.0.1' });

      const lists = new GetPendingRequestsUseCase(requests, users);
      expect(await lists.execute('PENDING')).toEqual([]);
      expect(await lists.execute('APPROVED')).toEqual([]);
    });

    it('리드는 퇴사 처리할 수 없다 (CANNOT_RETIRE_LEAD)', async () => {
      expect(
        await codeOf(
          retire.execute({ lead: LEAD, id: LEAD.id, ip: '127.0.0.1' }),
        ),
      ).toBe('CANNOT_RETIRE_LEAD');
    });

    it('없거나 이미 퇴사한 사용자는 USER_NOT_FOUND', async () => {
      await retire.execute({ lead: LEAD, id: KIM.id, ip: '127.0.0.1' });
      expect(
        await codeOf(
          retire.execute({ lead: LEAD, id: KIM.id, ip: '127.0.0.1' }),
        ),
      ).toBe('USER_NOT_FOUND');
      expect(
        await codeOf(retire.execute({ lead: LEAD, id: 999, ip: '127.0.0.1' })),
      ).toBe('USER_NOT_FOUND');
    });
  });
});
