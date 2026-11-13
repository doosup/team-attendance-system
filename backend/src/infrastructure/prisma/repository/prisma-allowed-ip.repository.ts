import { TransactionHost } from '@nestjs-cls/transactional';
import { Injectable } from '@nestjs/common';
import { AllowedIp } from '../../../domain/entity/allowed-ip.entity';
import { AllowedIpRepository } from '../../../domain/repository/allowed-ip.repository';
import { SystemClock } from '../../clock/system.clock';
import type { PrismaTx } from '../transaction';

const SELECT = {
  id: true,
  ip: true,
  label: true,
  createdById: true,
  createdAt: true,
};

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

  findActive(): Promise<AllowedIp[]> {
    return this.tx.allowedIp.findMany({
      where: { deletedAt: null },
      select: SELECT,
      orderBy: { id: 'asc' },
    });
  }

  create(ip: string, label: string, createdById: number): Promise<AllowedIp> {
    return this.tx.allowedIp.create({
      data: { ip, label, createdById },
      select: SELECT,
    });
  }

  async softDelete(id: number): Promise<void> {
    // deletedAt은 기술 시각(실제 시각)이라 바꾼 Clock이 아니라 시스템 시각을 쓴다
    await this.tx.allowedIp.update({
      where: { id },
      data: { deletedAt: new SystemClock().now() },
    });
  }
}
