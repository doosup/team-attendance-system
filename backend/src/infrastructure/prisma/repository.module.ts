import { Global, Module } from '@nestjs/common';
import { AttendanceRepository } from '../../domain/repository/attendance.repository';
import { RequestDayRepository } from '../../domain/repository/request-day.repository';
import { UserRepository } from '../../domain/repository/user.repository';
import { PrismaAttendanceRepository } from './repository/prisma-attendance.repository';
import { PrismaRequestDayRepository } from './repository/prisma-request-day.repository';
import { PrismaUserRepository } from './repository/prisma-user.repository';

// domain 저장소 약속 ↔ Prisma 구현 연결 (ADR-007).
const bindings = [
  { provide: UserRepository, useClass: PrismaUserRepository },
  { provide: AttendanceRepository, useClass: PrismaAttendanceRepository },
  { provide: RequestDayRepository, useClass: PrismaRequestDayRepository },
];

@Global()
@Module({
  providers: bindings,
  exports: bindings.map((b) => b.provide),
})
export class RepositoryModule {}
