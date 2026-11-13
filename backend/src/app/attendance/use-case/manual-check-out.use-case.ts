import { Transactional } from '@nestjs-cls/transactional';
import { Injectable } from '@nestjs/common';
import { User } from '../../../domain/entity/user.entity';
import { CustomException } from '../../../domain/exception/custom.exception';
import { assertManualCheckOutRange } from '../../../domain/policy/attendance.policy';
import { weekendWorkOffGrant } from '../../../domain/policy/balance.policy';
import { Clock } from '../../../domain/port/clock.port';
import { AuditLogRepository } from '../../../domain/repository/audit-log.repository';
import { AttendanceRepository } from '../../../domain/repository/attendance.repository';
import { LedgerRepository } from '../../../domain/repository/ledger.repository';
import { workDateOf } from '../../../domain/value/work-date';
import { UseCase } from '../../use-case.interface';
import { AttendanceResult } from '../dto/check-in.dto';

interface Input {
  user: User;
  attendanceId: number;
  checkOutAt: Date;
  ip: string;
}

// 직전 근무일의 미기록 퇴근 1건만 입력받는다 (결정 9). 16:00 제한은 없고 조퇴 판정은 한다.
@Injectable()
export class ManualCheckOutUseCase implements UseCase<Input, AttendanceResult> {
  constructor(
    private readonly clock: Clock,
    private readonly attendances: AttendanceRepository,
    private readonly ledger: LedgerRepository,
    private readonly audit: AuditLogRepository,
  ) {}

  @Transactional()
  async execute({ user, attendanceId, checkOutAt, ip }: Input) {
    const today = workDateOf(this.clock.now());
    const pending = await this.attendances.findLatestBefore(user.id, today);
    // 남의 기록·오늘 기록·이미 입력한 기록 모두 같은 응답 (존재 여부를 드러내지 않음)
    if (!pending || pending.id !== attendanceId || pending.hasCheckedOut) {
      throw new CustomException('MANUAL_CHECKOUT_NOT_PENDING');
    }
    assertManualCheckOutRange(
      pending.props.checkInAt,
      checkOutAt,
      pending.props.workDate,
    );
    pending.checkOut(checkOutAt, 'MANUAL', ip);
    await this.attendances.save(pending);
    const offGranted = pending.props.dayType === 'WEEKEND_WORK';
    if (offGranted) {
      await this.ledger.append([
        weekendWorkOffGrant({
          userId: user.id,
          attendanceId: pending.id,
          workDate: pending.props.workDate,
          requestDayId: pending.props.requestDayId,
        }),
      ]);
    }
    const p = pending.props;
    await this.audit.append({
      actorId: user.id,
      action: 'MANUAL_CHECK_OUT',
      targetType: 'Attendance',
      targetId: pending.id,
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
    return AttendanceResult.from(pending);
  }
}
