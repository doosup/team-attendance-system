import { AllowedIpRepository } from '../../src/domain/repository/allowed-ip.repository';

export class InMemoryAllowedIpRepository extends AllowedIpRepository {
  constructor(private readonly ips: string[] = []) {
    super();
  }

  isAllowed(ip: string) {
    return Promise.resolve(this.ips.includes(ip));
  }
}
