import { kstAt } from '../../../domain/value/work-date';
import { FixedClock } from '../../../../test/fakes/fixed-clock';
import { InMemoryAttendanceRepository } from '../../../../test/fakes/in-memory-attendance.repository';
import { InMemoryAuditLogRepository } from '../../../../test/fakes/in-memory-audit-log.repository';
import { InMemoryRequestDayRepository } from '../../../../test/fakes/in-memory-request-day.repository';
import { InMemoryUserRepository } from '../../../../test/fakes/in-memory-user.repository';
import { KIM, LEAD } from '../../../../test/fakes/users';
import { CheckInUseCase } from '../../attendance/use-case/check-in.use-case';
import { GetTeamMissingUseCase } from '../../lead/attendance/use-case/get-team-missing.use-case';
import { GetMyMissingUseCase } from './get-my-missing.use-case';
import { GetTeamBoardUseCase } from './get-team-board.use-case';

describe('대시보드', () => {
  let clock: FixedClock;
  let attendances: InMemoryAttendanceRepository;
  let requestDays: InMemoryRequestDayRepository;
  let users: InMemoryUserRepository;
  let checkIn: CheckInUseCase;

  beforeEach(() => {
    clock = new FixedClock('2026-11-16', '10:30:00');
    attendances = new InMemoryAttendanceRepository();
    requestDays = new InMemoryRequestDayRepository();
    users = new InMemoryUserRepository([LEAD, KIM]);
    checkIn = new CheckInUseCase(
      clock,
      attendances,
      requestDays,
      new InMemoryAuditLogRepository(),
    );
  });

  describe('팀 보드', () => {
    const board = (viewer = KIM) =>
      new GetTeamBoardUseCase(clock, users, attendances, requestDays).execute({
        viewer,
      });

    it('팀원에게는 상태만 보인다 (시각·지각 없음)', async () => {
      await checkIn.execute({ user: KIM, ip: '127.0.0.1' }); // 10:30 지각
      const rows = await board(KIM);
      expect(rows.find((r) => r.userId === KIM.id)).toEqual({
        userId: KIM.id,
        name: '김근태',
        status: 'WORKING',
      });
    });

    it('반일 OFF인 사람은 팀원에게도 오전/오후와 반차 시간이 보인다 (ATT-34)', async () => {
      requestDays.rows.push({
        requestDayId: 1,
        userId: LEAD.id,
        date: '2026-11-16',
        type: 'HALF_OFF',
        requestStatus: 'APPROVED',
        dayStatus: 'ACTIVE',
        cancelType: null,
        halfOffPart: 'AM',
        startTime: '09:00',
        endTime: '13:00',
      });
      const rows = await board(KIM);
      expect(rows.find((r) => r.userId === LEAD.id)).toEqual({
        userId: LEAD.id,
        name: '이리드',
        status: 'HALF_OFF',
        halfOff: { part: 'AM', startTime: '09:00', endTime: '13:00' },
      });
    });

    it('리드에게는 시각·지각·10시 경과 미출근까지 보인다', async () => {
      await checkIn.execute({ user: KIM, ip: '127.0.0.1' });
      const rows = await board(LEAD);
      expect(rows.find((r) => r.userId === KIM.id)).toMatchObject({
        status: 'WORKING',
        checkInAt: kstAt('2026-11-16', '10:30:00').toISOString(),
        isLate: true,
      });
      expect(rows.find((r) => r.userId === LEAD.id)).toMatchObject({
        status: 'NOT_CHECKED_IN',
        pastTen: true,
      });
    });
  });

  describe('미기록·직접 입력 건', () => {
    it('내 퇴근 미기록 건을 최근 순으로 준다 (오늘 기록은 제외)', async () => {
      clock.at('2026-11-12', '09:00:00');
      await checkIn.execute({ user: KIM, ip: '127.0.0.1' });
      clock.at('2026-11-13', '09:00:00');
      await checkIn.execute({ user: KIM, ip: '127.0.0.1' });
      clock.at('2026-11-16', '09:00:00');
      await checkIn.execute({ user: KIM, ip: '127.0.0.1' });

      const rows = await new GetMyMissingUseCase(clock, attendances).execute(
        KIM,
      );
      expect(rows.map((r) => [r.workDate, r.kind])).toEqual([
        ['2026-11-13', 'MISSING'],
        ['2026-11-12', 'MISSING'],
      ]);
    });

    it('리드는 팀 전체 건을 이름과 함께 본다', async () => {
      clock.at('2026-11-13', '09:00:00');
      await checkIn.execute({ user: KIM, ip: '127.0.0.1' });
      await checkIn.execute({ user: LEAD, ip: '127.0.0.1' });
      clock.at('2026-11-16', '09:00:00');

      const rows = await new GetTeamMissingUseCase(
        clock,
        attendances,
        users,
      ).execute();
      expect(rows.map((r) => r.userName).sort()).toEqual(['김근태', '이리드']);
    });
  });
});
