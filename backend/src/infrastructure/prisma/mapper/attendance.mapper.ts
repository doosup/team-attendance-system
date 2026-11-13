import { Attendance as AttendanceModel, Prisma } from '@prisma/client';
import { Attendance } from '../../../domain/entity/attendance.entity';

export const AttendanceMapper = {
  toEntity(m: AttendanceModel): Attendance {
    return new Attendance({
      id: m.id,
      userId: m.userId,
      workDate: m.workDate,
      dayType: m.dayType,
      checkInAt: m.checkInAt,
      isLate: m.isLate,
      checkInIp: m.checkInIp,
      requestDayId: m.requestDayId,
      checkOutAt: m.checkOutAt,
      checkOutSource: m.checkOutSource,
      checkOutIp: m.checkOutIp,
      isEarlyLeave: m.isEarlyLeave,
      workedMinutes: m.workedMinutes,
    });
  },

  toData(a: Attendance): Prisma.AttendanceUncheckedCreateInput {
    const { id, ...data } = a.props;
    return data;
  },
};
