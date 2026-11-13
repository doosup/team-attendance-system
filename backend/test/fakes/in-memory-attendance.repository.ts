import { Attendance } from '../../src/domain/entity/attendance.entity';
import { CustomException } from '../../src/domain/exception/custom.exception';
import { AttendanceRepository } from '../../src/domain/repository/attendance.repository';

export class InMemoryAttendanceRepository extends AttendanceRepository {
  readonly rows: Attendance[] = [];
  private nextId = 1;

  findByUserAndDate(userId: number, workDate: string) {
    return Promise.resolve(
      this.rows.find(
        (a) => a.props.userId === userId && a.props.workDate === workDate,
      ) ?? null,
    );
  }

  findLatestBefore(userId: number, workDate: string) {
    const before = this.rows
      .filter((a) => a.props.userId === userId && a.props.workDate < workDate)
      .sort((a, b) => b.props.workDate.localeCompare(a.props.workDate));
    return Promise.resolve(before[0] ?? null);
  }

  async create(attendance: Attendance) {
    const { userId, workDate } = attendance.props;
    if (await this.findByUserAndDate(userId, workDate)) {
      throw new CustomException('ALREADY_CHECKED_IN');
    }
    const saved = new Attendance({ ...attendance.props, id: this.nextId++ });
    this.rows.push(saved);
    return saved;
  }
}
