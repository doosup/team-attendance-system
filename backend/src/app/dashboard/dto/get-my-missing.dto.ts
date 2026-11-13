import { Attendance } from '../../../domain/entity/attendance.entity';

// 퇴근 미기록(MISSING) 또는 직접 입력(MANUAL) 건
export class MissingCheckoutResult {
  constructor(
    readonly attendanceId: number,
    readonly userId: number,
    readonly workDate: string,
    readonly kind: 'MISSING' | 'MANUAL',
    readonly checkInAt: string,
    readonly checkOutAt: string | null,
    readonly userName: string | null = null,
  ) {}

  static from(a: Attendance, userName: string | null = null) {
    const p = a.props;
    return new MissingCheckoutResult(
      a.id,
      p.userId,
      p.workDate,
      p.checkOutSource === 'MANUAL' ? 'MANUAL' : 'MISSING',
      p.checkInAt.toISOString(),
      p.checkOutAt?.toISOString() ?? null,
      userName,
    );
  }
}
