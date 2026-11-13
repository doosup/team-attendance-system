import { Attendance } from '../../src/domain/entity/attendance.entity';
import { CustomException } from '../../src/domain/exception/custom.exception';
import { AttendanceRepository } from '../../src/domain/repository/attendance.repository';

// 저장소는 사본을 돌려준다: 유스케이스가 엔티티를 바꿔도 save 전에는 반영되지 않는다
const copy = (a?: Attendance) => (a ? new Attendance({ ...a.props }) : null);

export class InMemoryAttendanceRepository extends AttendanceRepository {
  readonly rows: Attendance[] = [];
  private nextId = 1;

  findByUserAndDate(userId: number, workDate: string) {
    return Promise.resolve(
      copy(
        this.rows.find(
          (a) => a.props.userId === userId && a.props.workDate === workDate,
        ),
      ),
    );
  }

  findLatestBefore(userId: number, workDate: string) {
    const before = this.rows
      .filter((a) => a.props.userId === userId && a.props.workDate < workDate)
      .sort((a, b) => b.props.workDate.localeCompare(a.props.workDate));
    return Promise.resolve(copy(before[0]));
  }

  findByUserAndMonth(userId: number, month: string) {
    return Promise.resolve(
      this.rows
        .filter(
          (a) =>
            a.props.userId === userId && a.props.workDate.startsWith(month),
        )
        .sort((a, b) => a.props.workDate.localeCompare(b.props.workDate)),
    );
  }

  save(attendance: Attendance) {
    const i = this.rows.findIndex((a) => a.props.id === attendance.props.id);
    this.rows[i] = new Attendance({ ...attendance.props });
    return Promise.resolve();
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
