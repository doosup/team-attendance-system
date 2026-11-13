import { Request } from '../../src/domain/entity/request.entity';
import { RequestRepository } from '../../src/domain/repository/request.repository';

const copy = (r: Request) =>
  new Request({ ...r.props, days: r.props.days.map((d) => ({ ...d })) });

export class InMemoryRequestRepository extends RequestRepository {
  readonly rows: Request[] = [];
  private nextId = 1;
  private nextDayId = 1;

  create(request: Request) {
    const saved = new Request({
      ...request.props,
      id: this.nextId++,
      days: request.props.days.map((d) => ({ ...d, id: this.nextDayId++ })),
    });
    this.rows.push(saved);
    return Promise.resolve(copy(saved));
  }

  findById(id: number) {
    const r = this.rows.find((x) => x.props.id === id);
    return Promise.resolve(r ? copy(r) : null);
  }

  findByStatus(status: string) {
    return Promise.resolve(
      this.rows
        .filter((r) => r.props.status === status)
        .sort((a, b) => a.props.startDate.localeCompare(b.props.startDate))
        .map(copy),
    );
  }

  save(request: Request) {
    const i = this.rows.findIndex((r) => r.props.id === request.props.id);
    this.rows[i] = copy(request);
    return Promise.resolve();
  }

  findByUser(userId: number, includeCanceled: boolean) {
    return Promise.resolve(
      this.rows
        .filter(
          (r) =>
            r.props.userId === userId &&
            (includeCanceled || r.props.status !== 'CANCELED'),
        )
        .sort((a, b) => b.props.startDate.localeCompare(a.props.startDate))
        .map(copy),
    );
  }
}
