import { Transactional } from '@nestjs-cls/transactional';
import { Injectable } from '@nestjs/common';
import { Attendance, DayType } from '../../../domain/entity/attendance.entity';
import { User } from '../../../domain/entity/user.entity';
import { CustomException } from '../../../domain/exception/custom.exception';
import {
  judgeCheckIn,
  resolveDay,
} from '../../../domain/policy/attendance.policy';
import { Clock } from '../../../domain/port/clock.port';
import { AuditLogRepository } from '../../../domain/repository/audit-log.repository';
import { AttendanceRepository } from '../../../domain/repository/attendance.repository';
import { RequestDayRepository } from '../../../domain/repository/request-day.repository';
import { isBusinessDay } from '../../../domain/value/business-day';
import { workDateOf } from '../../../domain/value/work-date';
import { UseCase } from '../../use-case.interface';
import {
  AttendanceResult,
  CheckInResult,
  PendingCheckoutResult,
} from '../dto/check-in.dto';

// 출근은 항상 즉시 기록하고, 미기록 퇴근 건은 응답으로 알려 준다 (ADR-005).
@Injectable()
export class CheckInUseCase implements UseCase<
  { user: User; ip: string },
  CheckInResult
> {
  constructor(
    private readonly clock: Clock,
    private readonly attendances: AttendanceRepository,
    private readonly requestDays: RequestDayRepository,
    private readonly audit: AuditLogRepository,
  ) {}

  @Transactional()
  async execute({
    user,
    ip,
  }: {
    user: User;
    ip: string;
  }): Promise<CheckInResult> {
    const now = this.clock.now();
    const workDate = workDateOf(now);

    if (await this.attendances.findByUserAndDate(user.id, workDate)) {
      throw new CustomException('ALREADY_CHECKED_IN');
    }
    const day = resolveDay(
      await this.requestDays.findForUserOnDate(user.id, workDate),
      isBusinessDay(workDate),
    );
    if (day.kind === 'ANNUAL_LEAVE')
      throw new CustomException('ON_ANNUAL_LEAVE');
    if (day.kind === 'DAY_OFF') {
      throw new CustomException('WEEKEND_WORK_NOT_APPROVED');
    }
    const dayType: DayType = day.kind;
    const { isLate } = judgeCheckIn(now, dayType);

    const saved = await this.attendances.create(
      Attendance.checkIn({
        userId: user.id,
        workDate,
        dayType,
        checkInAt: now,
        isLate,
        checkInIp: ip,
        requestDayId: day.requestDayId,
      }),
    );
    await this.audit.append({
      actorId: user.id,
      action: 'CHECK_IN',
      targetType: 'Attendance',
      targetId: saved.id,
      payload: { workDate, dayType, isLate, checkInAt: now.toISOString() },
      ip,
      occurredAt: now,
    });
    const latest = await this.attendances.findLatestBefore(user.id, workDate);
    return new CheckInResult(
      AttendanceResult.from(saved),
      PendingCheckoutResult.listFrom(latest),
    );
  }
}
