import { Transactional } from '@nestjs-cls/transactional';
import { Injectable } from '@nestjs/common';
import { User } from '../../../domain/entity/user.entity';
import { CustomException } from '../../../domain/exception/custom.exception';
import { assertCheckOutTime } from '../../../domain/policy/attendance.policy';
import { weekendWorkOffGrant } from '../../../domain/policy/balance.policy';
import { Clock } from '../../../domain/port/clock.port';
import { AuditLogRepository } from '../../../domain/repository/audit-log.repository';
import { AttendanceRepository } from '../../../domain/repository/attendance.repository';
import { LedgerRepository } from '../../../domain/repository/ledger.repository';
import { workDateOf } from '../../../domain/value/work-date';
import { UseCase } from '../../use-case.interface';
import { AttendanceResult } from '../dto/check-in.dto';

// 퇴근 버튼. 미기록 퇴근이 남아 있으면 서버가 거부한다 (ADR-005).
@Injectable()
export class CheckOutUseCase implements UseCase<
  { user: User; ip: string },
  AttendanceResult
> {
  constructor(
    private readonly clock: Clock,
    private readonly attendances: AttendanceRepository,
    private readonly ledger: LedgerRepository,
    private readonly audit: AuditLogRepository,
  ) {}

  @Transactional()
  async execute({
    user,
    ip,
  }: {
    user: User;
    ip: string;
  }): Promise<AttendanceResult> {
    const now = this.clock.now();
    const workDate = workDateOf(now);

    const previous = await this.attendances.findLatestBefore(user.id, workDate);
    if (previous && !previous.hasCheckedOut) {
      throw new CustomException('PENDING_MANUAL_CHECKOUT');
    }
    const today = await this.attendances.findByUserAndDate(user.id, workDate);
    if (!today) throw new CustomException('NOT_CHECKED_IN');
    if (today.hasCheckedOut) throw new CustomException('ALREADY_CHECKED_OUT');

    assertCheckOutTime(now, today.props.dayType);
    today.checkOut(now, 'BUTTON', ip);
    await this.attendances.save(today);
    const offGranted = today.props.dayType === 'WEEKEND_WORK';
    if (offGranted) {
      await this.ledger.append([
        weekendWorkOffGrant({
          userId: user.id,
          attendanceId: today.id,
          workDate: today.props.workDate,
          requestDayId: today.props.requestDayId,
        }),
      ]);
    }
    const p = today.props;
    await this.audit.append({
      actorId: user.id,
      action: 'CHECK_OUT',
      targetType: 'Attendance',
      targetId: today.id,
      payload: {
        workDate: p.workDate,
        checkOutAt: p.checkOutAt?.toISOString(),
        workedMinutes: p.workedMinutes,
        isEarlyLeave: p.isEarlyLeave,
        offGranted,
      },
      ip,
      occurredAt: this.clock.now(),
    });
    return AttendanceResult.from(today);
  }
}
