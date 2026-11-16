import { User } from '../../../domain/entity/user.entity';
import { FixedClock } from '../../../../test/fakes/fixed-clock';
import { InMemoryRequestDayRepository } from '../../../../test/fakes/in-memory-request-day.repository';
import { InMemoryUserRepository } from '../../../../test/fakes/in-memory-user.repository';
import { KIM, LEAD } from '../../../../test/fakes/users';
import { GetTeamCalendarUseCase } from './get-team-calendar.use-case';

describe('팀 일정 달력 (ATT-47)', () => {
  let clock: FixedClock;
  let requestDays: InMemoryRequestDayRepository;
  let users: InMemoryUserRepository;

  beforeEach(() => {
    clock = new FixedClock('2026-11-16', '10:00:00');
    requestDays = new InMemoryRequestDayRepository();
    users = new InMemoryUserRepository([LEAD, KIM]);
  });

  let nextId = 1;
  const day = (
    userId: number,
    date: string,
    over: Partial<(typeof requestDays.rows)[number]> = {},
  ) =>
    requestDays.rows.push({
      requestDayId: nextId++,
      userId,
      date,
      type: 'ANNUAL',
      requestStatus: 'APPROVED',
      dayStatus: 'ACTIVE',
      cancelType: null,
      ...over,
    });
  const run = (month?: string) =>
    new GetTeamCalendarUseCase(clock, users, requestDays).execute({ month });

  it('승인된 신청의 취소 안 된 날짜만 이름·종류와 함께 보여 준다', async () => {
    day(KIM.id, '2026-11-18');
    day(LEAD.id, '2026-11-20', { type: 'HALF_OFF', halfOffPart: 'PM' });
    expect(await run('2026-11')).toEqual([
      {
        date: '2026-11-18',
        userId: KIM.id,
        name: '김근태',
        type: 'ANNUAL',
        halfOffPart: null,
      },
      {
        date: '2026-11-20',
        userId: LEAD.id,
        name: '이리드',
        type: 'HALF_OFF',
        halfOffPart: 'PM',
      },
    ]);
  });

  it('승인 대기·반려·취소된 신청과 당일 취소된 날짜는 확정 일정이 아니라 빠진다', async () => {
    day(KIM.id, '2026-11-18', { requestStatus: 'PENDING' });
    day(KIM.id, '2026-11-19', { requestStatus: 'REJECTED' });
    day(KIM.id, '2026-11-20', { requestStatus: 'CANCELED' });
    day(KIM.id, '2026-11-23', {
      dayStatus: 'CANCELED',
      cancelType: 'LEAD_SAME_DAY',
    });
    expect(await run('2026-11')).toEqual([]);
  });

  it('다른 달 날짜는 빠지고, 날짜순으로 준다', async () => {
    day(KIM.id, '2026-12-01');
    day(KIM.id, '2026-11-30');
    day(KIM.id, '2026-10-31');
    day(LEAD.id, '2026-11-02');
    expect((await run('2026-11')).map((e) => e.date)).toEqual([
      '2026-11-02',
      '2026-11-30',
    ]);
  });

  it('퇴사자의 일정은 보이지 않는다 (팀 보드와 같은 기준)', async () => {
    const gone = new User(9, 'gone', 'h', '퇴사자', 'MEMBER', '2026-01-01');
    users = new InMemoryUserRepository([LEAD, KIM, gone]);
    await users.retire(gone.id, clock.now());
    day(gone.id, '2026-11-18');
    expect(await run('2026-11')).toEqual([]);
  });

  it('month가 없으면 Clock 기준 이번 달', async () => {
    day(KIM.id, '2026-11-18');
    day(KIM.id, '2026-12-18');
    expect((await run()).map((e) => e.date)).toEqual(['2026-11-18']);
  });
});
