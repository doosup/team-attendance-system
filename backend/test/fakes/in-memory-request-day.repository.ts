import {
  DayRequest,
  RequestDayRepository,
} from '../../src/domain/repository/request-day.repository';

export class InMemoryRequestDayRepository extends RequestDayRepository {
  readonly rows: (DayRequest & { userId: number; date: string })[] = [];

  findForUserOnDate(userId: number, date: string) {
    return Promise.resolve(
      this.rows
        .filter((r) => r.userId === userId && r.date === date)
        .map(({ userId: _userId, date: _date, ...day }) => day),
    );
  }
}
