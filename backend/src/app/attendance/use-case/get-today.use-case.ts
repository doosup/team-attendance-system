import { Injectable } from '@nestjs/common';
import { User } from '../../../domain/entity/user.entity';
import {
  expectedCheckOutAt,
  resolveDay,
} from '../../../domain/policy/attendance.policy';
import { Clock } from '../../../domain/port/clock.port';
import { AttendanceRepository } from '../../../domain/repository/attendance.repository';
import { RequestDayRepository } from '../../../domain/repository/request-day.repository';
import { isBusinessDay } from '../../../domain/value/business-day';
import { workDateOf } from '../../../domain/value/work-date';
import { UseCase } from '../../use-case.interface';
import { AttendanceResult, PendingCheckoutResult } from '../dto/check-in.dto';
import { TodayResult } from '../dto/get-today.dto';

@Injectable()
export class GetTodayUseCase implements UseCase<User, TodayResult> {
  constructor(
    private readonly clock: Clock,
    private readonly attendances: AttendanceRepository,
    private readonly requestDays: RequestDayRepository,
  ) {}

  async execute(user: User): Promise<TodayResult> {
    const workDate = workDateOf(this.clock.now());
    const today = await this.attendances.findByUserAndDate(user.id, workDate);
    const latest = await this.attendances.findLatestBefore(user.id, workDate);

    // 출근했으면 그때 정한 유형, 아니면 지금 신청 기준 유형
    const dayType =
      today?.props.dayType ??
      resolveDay(
        await this.requestDays.findForUserOnDate(user.id, workDate),
        isBusinessDay(workDate),
      ).kind;
    const expected =
      today && !today.hasCheckedOut
        ? expectedCheckOutAt(today.props.checkInAt, today.props.dayType)
        : null;

    return new TodayResult(
      workDate,
      dayType,
      today && AttendanceResult.from(today),
      expected?.toISOString() ?? null,
      PendingCheckoutResult.listFrom(latest),
    );
  }
}
