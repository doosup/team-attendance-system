import { AllowedIp } from '../../../../domain/entity/allowed-ip.entity';

export class AllowedIpResult {
  constructor(
    readonly id: number,
    readonly ip: string,
    readonly label: string,
    readonly createdAt: string,
  ) {}

  static from(a: AllowedIp): AllowedIpResult {
    return new AllowedIpResult(a.id, a.ip, a.label, a.createdAt.toISOString());
  }
}
