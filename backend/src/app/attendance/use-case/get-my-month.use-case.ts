import { Injectable } from '@nestjs/common';
import { User } from '../../../domain/entity/user.entity';
import { AttendanceRepository } from '../../../domain/repository/attendance.repository';
import { UseCase } from '../../use-case.interface';
import { AttendanceResult } from '../dto/check-in.dto';

@Injectable()
export class GetMyMonthUseCase implements UseCase<
  { user: User; month: string },
  AttendanceResult[]
> {
  constructor(private readonly attendances: AttendanceRepository) {}

  async execute({ user, month }: { user: User; month: string }) {
    const rows = await this.attendances.findByUserAndMonth(user.id, month);
    return rows.map((a) => AttendanceResult.from(a));
  }
}
