import {
  DayRequest,
  RequestDayRepository,
} from '../../src/domain/repository/request-day.repository';
import { InMemoryRequestRepository } from './in-memory-request.repository';

type Row = DayRequest & { userId: number; date: string; isOverLimit?: boolean };

// 직접 넣은 rows + (있으면) 신청 저장소의 날짜 행을 함께 본다
export class InMemoryRequestDayRepository extends RequestDayRepository {
  readonly rows: Row[] = [];

  constructor(private readonly requests?: InMemoryRequestRepository) {
    super();
  }

  private all(): Row[] {
    const fromRequests: Row[] = (this.requests?.rows ?? []).flatMap((r) =>
      r.props.days.map((d) => ({
        requestDayId: d.id ?? 0,
        userId: r.props.userId,
        date: d.date,
        type: r.props.type,
        requestStatus: r.props.status,
        dayStatus: d.status,
        cancelType: d.cancelType,
        isOverLimit: r.props.isOverLimit,
      })),
    );
    return [...this.rows, ...fromRequests];
  }

  private live(r: Row) {
    return (
      r.dayStatus === 'ACTIVE' &&
      (r.requestStatus === 'PENDING' || r.requestStatus === 'APPROVED')
    );
  }

  findForUserOnDate(userId: number, date: string) {
    return Promise.resolve(
      this.all()
        .filter((r) => r.userId === userId && r.date === date)
        .map(
          ({ userId: _userId, date: _date, isOverLimit: _over, ...day }) => day,
        ),
    );
  }

  countRemoteDays(userId: number, month: string) {
    const live = this.all().filter(
      (r) =>
        r.userId === userId &&
        r.type === 'REMOTE' &&
        r.date.startsWith(month) &&
        this.live(r),
    );
    return Promise.resolve({
      normal: live.filter((r) => !r.isOverLimit).length,
      overLimit: live.filter((r) => r.isOverLimit).length,
    });
  }

  findLiveDates(userId: number, dates: string[]) {
    return Promise.resolve(
      this.all()
        .filter(
          (r) => r.userId === userId && dates.includes(r.date) && this.live(r),
        )
        .map((r) => r.date),
    );
  }

  findApprovedWindows(date: string, ip: string) {
    return Promise.resolve(
      (this.requests?.rows ?? []).flatMap((r) =>
        r.props.status === 'APPROVED' &&
        (r.props.type === 'REMOTE' || r.props.type === 'WEEKEND_WORK') &&
        r.props.ip === ip &&
        r.props.days.some((d) => d.date === date && d.status === 'ACTIVE')
          ? [
              {
                userId: r.props.userId,
                startTime: r.props.startTime ?? '00:00',
                endTime: r.props.endTime ?? '00:00',
              },
            ]
          : [],
      ),
    );
  }
}
