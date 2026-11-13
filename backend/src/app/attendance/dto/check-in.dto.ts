import { Attendance } from '../../../domain/entity/attendance.entity';

export class AttendanceResult {
  constructor(
    readonly id: number,
    readonly workDate: string,
    readonly dayType: string,
    readonly checkInAt: string,
    readonly checkOutAt: string | null,
    readonly checkOutSource: string | null,
    readonly isLate: boolean,
    readonly isEarlyLeave: boolean | null,
    readonly workedMinutes: number | null,
  ) {}

  static from(a: Attendance): AttendanceResult {
    const p = a.props;
    return new AttendanceResult(
      a.id,
      p.workDate,
      p.dayType,
      p.checkInAt.toISOString(),
      p.checkOutAt?.toISOString() ?? null,
      p.checkOutSource,
      p.isLate,
      p.isEarlyLeave,
      p.workedMinutes,
    );
  }
}

// 퇴근 시각을 직접 입력해야 하는 직전 근무일 (화면이 닫기 없는 입력 창을 띄운다)
export class PendingCheckoutResult {
  constructor(
    readonly id: number,
    readonly workDate: string,
    readonly checkInAt: string,
  ) {}

  static listFrom(latest: Attendance | null): PendingCheckoutResult[] {
    if (!latest || latest.hasCheckedOut) return [];
    return [
      new PendingCheckoutResult(
        latest.id,
        latest.props.workDate,
        latest.props.checkInAt.toISOString(),
      ),
    ];
  }
}

export class CheckInResult {
  constructor(
    readonly attendance: AttendanceResult,
    readonly pendingManualCheckouts: PendingCheckoutResult[],
  ) {}
}
