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
  // 같은 사람·같은 날이 이미 있으면 ALREADY_CHECKED_IN
  abstract create(attendance: Attendance): Promise<Attendance>;
}
