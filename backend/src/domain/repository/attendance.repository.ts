import { Attendance } from '../entity/attendance.entity';

export abstract class AttendanceRepository {
  abstract findByUserAndDate(
    userId: number,
    workDate: string,
  ): Promise<Attendance | null>;
  // workDate보다 앞선 가장 최근 근무일 (미기록 퇴근 판단용)
  abstract findLatestBefore(
    userId: number,
    workDate: string,
  ): Promise<Attendance | null>;
  // month = 'YYYY-MM', 날짜순
  abstract findByUserAndMonth(
    userId: number,
    month: string,
  ): Promise<Attendance[]>;
  abstract findByDate(workDate: string): Promise<Attendance[]>;
  // 퇴근 미기록(오늘 이전, checkOutAt 없음) 또는 직접 입력(MANUAL) 건, 최근 근무일 순. userId 없으면 팀 전체
  abstract findMissingOrManual(
    today: string,
    userId?: number,
  ): Promise<Attendance[]>;
  // 같은 사람·같은 날이 이미 있으면 ALREADY_CHECKED_IN
  abstract create(attendance: Attendance): Promise<Attendance>;
  abstract save(attendance: Attendance): Promise<void>;
}
