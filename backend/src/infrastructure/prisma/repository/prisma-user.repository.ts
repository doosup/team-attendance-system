import { Injectable } from '@nestjs/common';
import { User } from '../../../domain/entity/user.entity';
import { UserRepository } from '../../../domain/repository/user.repository';
import { UserMapper } from '../mapper/user.mapper';
import type { PrismaTx } from '../transaction';
import { TransactionHost } from '@nestjs-cls/transactional';

@Injectable()
export class PrismaUserRepository extends UserRepository {
  constructor(private readonly txHost: TransactionHost) {
    super();
  }

  private get tx() {
    return (this.txHost as PrismaTx).tx;
  }

  async findById(id: number): Promise<User | null> {
    const m = await this.tx.user.findFirst({
      where: { id, deletedAt: null },
    });
    return m && UserMapper.toEntity(m);
  }

  async findByLoginId(loginId: string): Promise<User | null> {
    const m = await this.tx.user.findFirst({
      where: { loginId, deletedAt: null },
    });
    return m && UserMapper.toEntity(m);
  }
}
