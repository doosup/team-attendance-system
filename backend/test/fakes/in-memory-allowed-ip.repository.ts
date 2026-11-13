import { AllowedIp } from '../../src/domain/entity/allowed-ip.entity';
import { AllowedIpRepository } from '../../src/domain/repository/allowed-ip.repository';

export class InMemoryAllowedIpRepository extends AllowedIpRepository {
  readonly rows: (AllowedIp & { deleted: boolean })[] = [];

  constructor(ips: string[] = []) {
    super();
    ips.forEach((ip) => this.push(ip, '연구실', null));
  }

  private push(ip: string, label: string, createdById: number | null) {
    const row = {
      id: this.rows.length + 1,
      ip,
      label,
      createdById,
      createdAt: new Date(0),
      deleted: false,
    };
    this.rows.push(row);
    return row;
  }

  isAllowed(ip: string) {
    return Promise.resolve(this.rows.some((r) => !r.deleted && r.ip === ip));
  }

  findActive() {
    return Promise.resolve(
      this.rows.filter((r) => !r.deleted).map(({ deleted: _d, ...r }) => r),
    );
  }

  create(ip: string, label: string, createdById: number) {
    const { deleted: _d, ...row } = this.push(ip, label, createdById);
    return Promise.resolve(row);
  }

  softDelete(id: number) {
    const row = this.rows.find((r) => r.id === id);
    if (row) row.deleted = true;
    return Promise.resolve();
  }
}
