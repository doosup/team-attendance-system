export type DayType =
  'FULL_DAY' | 'HALF_DAY_OFF' | 'EMERGENCY_WORK' | 'WEEKEND_WORK';
export type CheckOutSource = 'BUTTON' | 'MANUAL';

export interface AttendanceProps {
  id: number | null;
  userId: number;
  workDate: string;
  dayType: DayType;
  checkInAt: Date;
  isLate: boolean;
  checkInIp: string;
  requestDayId: number | null;
  checkOutAt: Date | null;
  checkOutSource: CheckOutSource | null;
  checkOutIp: string | null;
  isEarlyLeave: boolean | null; // null = 퇴근 전(판정 전)
  workedMinutes: number | null;
}

// 한 사람의 하루 = 한 줄. 판정 결과는 기록 시점에 저장한다.
export class Attendance {
  constructor(readonly props: AttendanceProps) {}

  static checkIn(
    p: Pick<
      AttendanceProps,
      | 'userId'
      | 'workDate'
      | 'dayType'
      | 'checkInAt'
      | 'isLate'
      | 'checkInIp'
      | 'requestDayId'
    >,
  ): Attendance {
    return new Attendance({
      ...p,
      id: null,
      checkOutAt: null,
      checkOutSource: null,
      checkOutIp: null,
      isEarlyLeave: null,
      workedMinutes: null,
    });
  }

  get id(): number {
    if (this.props.id === null) throw new Error('저장 전 출근 기록');
    return this.props.id;
  }

  get hasCheckedOut(): boolean {
    return this.props.checkOutAt !== null;
  }
}
