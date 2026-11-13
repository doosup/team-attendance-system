import { Global, Module } from '@nestjs/common';
import { AllowedIpRepository } from '../../domain/repository/allowed-ip.repository';
import { AttendanceRepository } from '../../domain/repository/attendance.repository';
import { LedgerRepository } from '../../domain/repository/ledger.repository';
import { RequestDayRepository } from '../../domain/repository/request-day.repository';
import { RequestRepository } from '../../domain/repository/request.repository';
import { UserRepository } from '../../domain/repository/user.repository';
import { PrismaAllowedIpRepository } from './repository/prisma-allowed-ip.repository';
import { PrismaAttendanceRepository } from './repository/prisma-attendance.repository';
import { PrismaLedgerRepository } from './repository/prisma-ledger.repository';
import { PrismaRequestDayRepository } from './repository/prisma-request-day.repository';
import { PrismaRequestRepository } from './repository/prisma-request.repository';
import { PrismaUserRepository } from './repository/prisma-user.repository';

// domain 저장소 약속 ↔ Prisma 구현 연결 (ADR-007).
const bindings = [
  { provide: UserRepository, useClass: PrismaUserRepository },
  { provide: AttendanceRepository, useClass: PrismaAttendanceRepository },
  { provide: RequestDayRepository, useClass: PrismaRequestDayRepository },
  { provide: LedgerRepository, useClass: PrismaLedgerRepository },
  { provide: RequestRepository, useClass: PrismaRequestRepository },
  { provide: AllowedIpRepository, useClass: PrismaAllowedIpRepository },
];

@Global()
@Module({
  providers: bindings,
  exports: bindings.map((b) => b.provide),
})
export class RepositoryModule {}
