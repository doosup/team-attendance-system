import { Injectable } from '@nestjs/common';
import { User } from '../../../domain/entity/user.entity';
import { boardStatus } from '../../../domain/policy/board.policy';
import { Clock } from '../../../domain/port/clock.port';
import { AttendanceRepository } from '../../../domain/repository/attendance.repository';
import { RequestDayRepository } from '../../../domain/repository/request-day.repository';
import { UserRepository } from '../../../domain/repository/user.repository';
import { workDateOf } from '../../../domain/value/work-date';
import { UseCase } from '../../use-case.interface';
import { TeamBoardRow } from '../dto/get-team-board.dto';

type Input = { viewer: User; date?: string };

// 팀 보드: 사람마다 그날 상태. 상태 판정은 board.policy, 여기선 모으고 보여 줄 필드만 고른다
@Injectable()
export class GetTeamBoardUseCase implements UseCase<Input, TeamBoardRow[]> {
  constructor(
    private readonly clock: Clock,
    private readonly users: UserRepository,
    private readonly attendances: AttendanceRepository,
    private readonly requestDays: RequestDayRepository,
  ) {}

  async execute({ viewer, date }: Input): Promise<TeamBoardRow[]> {
    const now = this.clock.now();
    const target = date ?? workDateOf(now);
    const [users, attendances, days] = await Promise.all([
      this.users.findAll(),
      this.attendances.findByDate(target),
      this.requestDays.findByDate(target),
    ]);
    const isLead = viewer.role === 'LEAD';

    return users.map((u) => {
      const a = attendances.find((x) => x.props.userId === u.id) ?? null;
      const mine = days.filter((d) => d.userId === u.id);
      const { status, pastTen } = boardStatus(target, a, mine, now);
      const row: TeamBoardRow = { userId: u.id, name: u.name, status };
      // 반일 OFF 오전/오후·반차 시간은 일정 정보라 팀원에게도 보인다 (ATT-34)
      const halfOff = mine.find(
        (d) =>
          d.type === 'HALF_OFF' &&
          d.requestStatus === 'APPROVED' &&
          d.dayStatus === 'ACTIVE',
      );
      if (halfOff && (halfOff.halfOffPart || halfOff.startTime)) {
        row.halfOff = {
          part: halfOff.halfOffPart,
          startTime: halfOff.startTime,
          endTime: halfOff.endTime,
        };
      }
      if (!isLead) return row;
      const p = a?.props;
      return {
        ...row,
        dayType: p?.dayType ?? null,
        checkInAt: p?.checkInAt.toISOString() ?? null,
        checkOutAt: p?.checkOutAt?.toISOString() ?? null,
        isLate: p?.isLate ?? null,
        isEarlyLeave: p?.isEarlyLeave ?? null,
        workedMinutes: p?.workedMinutes ?? null,
        checkOutSource: p?.checkOutSource ?? null,
        pastTen,
      };
    });
  }
}
