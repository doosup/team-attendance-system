import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Attendance } from '../../../domain/entity/attendance.entity';
import { CustomException } from '../../../domain/exception/custom.exception';
import { AttendanceRepository } from '../../../domain/repository/attendance.repository';
import { AttendanceMapper } from '../mapper/attendance.mapper';
import { PrismaService } from '../prisma.service';

@Injectable()
export class PrismaAttendanceRepository extends AttendanceRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findByUserAndDate(userId: number, workDate: string) {
    const m = await this.prisma.attendance.findUnique({
      where: { userId_workDate: { userId, workDate } },
    });
    return m && AttendanceMapper.toEntity(m);
  }

  async findLatestBefore(userId: number, workDate: string) {
    const m = await this.prisma.attendance.findFirst({
      where: { userId, workDate: { lt: workDate } },
      orderBy: { workDate: 'desc' },
    });
    return m && AttendanceMapper.toEntity(m);
  }

  async create(attendance: Attendance) {
    try {
      const m = await this.prisma.attendance.create({
        data: AttendanceMapper.toData(attendance),
      });
      return AttendanceMapper.toEntity(m);
    } catch (e) {
      // 동시 출근 요청: @@unique([userId, workDate])가 최종 차단
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new CustomException('ALREADY_CHECKED_IN');
      }
      throw e;
    }
  }
}
