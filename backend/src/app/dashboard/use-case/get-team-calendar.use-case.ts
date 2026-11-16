import { Injectable } from '@nestjs/common';
import { Clock } from '../../../domain/port/clock.port';
import { RequestDayRepository } from '../../../domain/repository/request-day.repository';
import { UserRepository } from '../../../domain/repository/user.repository';
import { workDateOf } from '../../../domain/value/work-date';
import { UseCase } from '../../use-case.interface';
import { TeamCalendarEntry } from '../dto/get-team-calendar.dto';

type Input = { month?: string };

// 팀 일정 달력: 그 달 확정된(승인·취소 안 됨) 날짜에 이름을 붙인다. 퇴사자는 팀 보드처럼 뺀다
@Injectable()
export class GetTeamCalendarUseCase implements UseCase<
  Input,
  TeamCalendarEntry[]
> {
  constructor(
    private readonly clock: Clock,
    private readonly users: UserRepository,
    private readonly requestDays: RequestDayRepository,
  ) {}

  async execute({ month }: Input): Promise<TeamCalendarEntry[]> {
    const target = month ?? workDateOf(this.clock.now()).slice(0, 7);
    const [users, days] = await Promise.all([
      this.users.findAll(),
      this.requestDays.findApprovedInMonth(target),
    ]);
    const names = new Map(users.map((u) => [u.id, u.name]));
    return days.flatMap((d) => {
      const name = names.get(d.userId);
      return name === undefined ? [] : [{ ...d, name }];
    });
  }
}
