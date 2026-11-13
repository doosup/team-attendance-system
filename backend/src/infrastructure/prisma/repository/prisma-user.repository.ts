import { Injectable } from '@nestjs/common';
import { User } from '../../../domain/entity/user.entity';
import { UserRepository } from '../../../domain/repository/user.repository';
import { UserMapper } from '../mapper/user.mapper';
import { PrismaService } from '../prisma.service';

@Injectable()
export class PrismaUserRepository extends UserRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findById(id: number): Promise<User | null> {
    const m = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
    });
    return m && UserMapper.toEntity(m);
  }

  async findByLoginId(loginId: string): Promise<User | null> {
    const m = await this.prisma.user.findFirst({
      where: { loginId, deletedAt: null },
    });
    return m && UserMapper.toEntity(m);
  }
}
