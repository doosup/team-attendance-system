import { Injectable } from '@nestjs/common';
import { User } from '../../../domain/entity/user.entity';
import { Clock } from '../../../domain/port/clock.port';
import { AttendanceRepository } from '../../../domain/repository/attendance.repository';
import { workDateOf } from '../../../domain/value/work-date';
import { UseCase } from '../../use-case.interface';
import { MissingCheckoutResult } from '../dto/get-my-missing.dto';

@Injectable()
export class GetMyMissingUseCase implements UseCase<
  User,
  MissingCheckoutResult[]
> {
  constructor(
    private readonly clock: Clock,
    private readonly attendances: AttendanceRepository,
  ) {}

  async execute(user: User) {
    const today = workDateOf(this.clock.now());
    const rows = await this.attendances.findMissingOrManual(today, user.id);
    return rows.map((a) => MissingCheckoutResult.from(a));
  }
}
