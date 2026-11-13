import { Injectable } from '@nestjs/common';
import { Clock } from '../../../../domain/port/clock.port';
import { AttendanceRepository } from '../../../../domain/repository/attendance.repository';
import { UserRepository } from '../../../../domain/repository/user.repository';
import { workDateOf } from '../../../../domain/value/work-date';
import { MissingCheckoutResult } from '../../../dashboard/dto/get-my-missing.dto';
import { UseCase } from '../../../use-case.interface';

// 리드: 팀 전체 퇴근 미기록·직접 입력 건 (리드가 직접 입력 값을 검토)
@Injectable()
export class GetTeamMissingUseCase implements UseCase<
  void,
  MissingCheckoutResult[]
> {
  constructor(
    private readonly clock: Clock,
    private readonly attendances: AttendanceRepository,
    private readonly users: UserRepository,
  ) {}

  async execute() {
    const today = workDateOf(this.clock.now());
    const names = new Map(
      (await this.users.findAll()).map((u) => [u.id, u.name]),
    );
    const rows = await this.attendances.findMissingOrManual(today);
    return rows.map((a) =>
      MissingCheckoutResult.from(a, names.get(a.props.userId) ?? null),
    );
  }
}
