import { Global, Module } from '@nestjs/common';
import { UserRepository } from '../../domain/repository/user.repository';
import { PrismaUserRepository } from './repository/prisma-user.repository';

// domain 저장소 약속 ↔ Prisma 구현 연결 (ADR-007).
@Global()
@Module({
  providers: [{ provide: UserRepository, useClass: PrismaUserRepository }],
  exports: [UserRepository],
})
export class RepositoryModule {}
