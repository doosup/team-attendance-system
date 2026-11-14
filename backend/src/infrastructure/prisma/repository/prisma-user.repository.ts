import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CustomException } from '../../../domain/exception/custom.exception';
import { User } from '../../../domain/entity/user.entity';
import {
  NewUser,
  UserRepository,
} from '../../../domain/repository/user.repository';
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

  async findAll(): Promise<User[]> {
    const rows = await this.tx.user.findMany({
      where: { deletedAt: null },
      orderBy: { id: 'asc' },
    });
    return rows.map((m) => UserMapper.toEntity(m));
  }

  async findAllIncludingRetired(): Promise<User[]> {
    const rows = await this.tx.user.findMany({ orderBy: { id: 'asc' } });
    return rows.map((m) => UserMapper.toEntity(m));
  }

  async create(u: NewUser): Promise<User> {
    try {
      return UserMapper.toEntity(await this.tx.user.create({ data: u }));
    } catch (e) {
      // 퇴사자 아이디·동시 등록 모두 loginId @unique가 최종 차단
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new CustomException('DUPLICATE_LOGIN_ID');
      }
      throw e;
    }
  }

  async retire(id: number, at: Date): Promise<void> {
    await this.tx.user.update({ where: { id }, data: { deletedAt: at } });
  }

  async findByLoginId(loginId: string): Promise<User | null> {
    const m = await this.tx.user.findFirst({
      where: { loginId, deletedAt: null },
    });
    return m && UserMapper.toEntity(m);
  }
}
