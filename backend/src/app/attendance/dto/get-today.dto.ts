import { DayKind } from '../../../domain/policy/attendance.policy';
import { AttendanceResult, PendingCheckoutResult } from './check-in.dto';

// 내 카드: 오늘 근무 유형, 기록, 정상 퇴근 가능 시각, 미기록 퇴근 건
export class TodayResult {
  constructor(
    readonly workDate: string,
    readonly dayType: DayKind,
    readonly attendance: AttendanceResult | null,
    readonly expectedCheckOutAt: string | null,
    readonly pendingManualCheckouts: PendingCheckoutResult[],
  ) {}
}
