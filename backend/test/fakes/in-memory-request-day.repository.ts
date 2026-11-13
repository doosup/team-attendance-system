import {
  DayRequest,
  RequestDayRepository,
} from '../../src/domain/repository/request-day.repository';

export class InMemoryRequestDayRepository extends RequestDayRepository {
  readonly rows: (DayRequest & {
    userId: number;
    date: string;
    isOverLimit?: boolean;
  })[] = [];

  findForUserOnDate(userId: number, date: string) {
    return Promise.resolve(
      this.rows
        .filter((r) => r.userId === userId && r.date === date)
        .map(
          ({ userId: _userId, date: _date, isOverLimit: _over, ...day }) => day,
        ),
    );
  }

  countRemoteDays(userId: number, month: string) {
    const live = this.rows.filter(
      (r) =>
        r.userId === userId &&
        r.type === 'REMOTE' &&
        r.date.startsWith(month) &&
        r.dayStatus === 'ACTIVE' &&
        (r.requestStatus === 'PENDING' || r.requestStatus === 'APPROVED'),
    );
    return Promise.resolve({
      normal: live.filter((r) => !r.isOverLimit).length,
      overLimit: live.filter((r) => r.isOverLimit).length,
    });
  }
}
