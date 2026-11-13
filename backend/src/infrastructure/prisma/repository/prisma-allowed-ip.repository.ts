import { TransactionHost } from '@nestjs-cls/transactional';
import { Injectable } from '@nestjs/common';
import { AllowedIpRepository } from '../../../domain/repository/allowed-ip.repository';
import type { PrismaTx } from '../transaction';

@Injectable()
export class PrismaAllowedIpRepository extends AllowedIpRepository {
  constructor(private readonly txHost: TransactionHost) {
    super();
  }

  private get tx() {
    return (this.txHost as PrismaTx).tx;
  }

  async isAllowed(ip: string): Promise<boolean> {
    return !!(await this.tx.allowedIp.findFirst({
      where: { ip, deletedAt: null },
      select: { id: true },
    }));
  }
}
