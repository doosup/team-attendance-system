import {
  CancelType,
  DayStatus,
  RequestStatus,
  RequestType,
} from '../repository/request-day.repository';
import { User } from './user.entity';

export interface RequestDayProps {
  id: number | null;
  date: string;
  status: DayStatus;
  cancelType: CancelType | null;
  canceledById: number | null;
  canceledAt: Date | null;
  cancelReason: string | null;
}

export interface RequestProps {
  id: number | null;
  userId: number;
  type: RequestType;
  startDate: string;
  endDate: string;
  status: RequestStatus;
  isOverLimit: boolean;
  reason: string;
  ip: string | null;
  startTime: string | null;
  endTime: string | null;
  decidedById: number | null;
  decidedAt: Date | null;
  rejectReason: string | null;
  days: RequestDayProps[];
}

// 신청서 한 장(기간) + 실제 적용 날짜(RequestDay). 정책은 기간, 저장은 날짜 (ADR-004)
export class Request {
  constructor(readonly props: RequestProps) {}

  /** 제출. 리드 본인 신청은 자동 승인 (결정 14) */
  static submit(
    p: Pick<
      RequestProps,
      | 'type'
      | 'startDate'
      | 'endDate'
      | 'isOverLimit'
      | 'reason'
      | 'ip'
      | 'startTime'
      | 'endTime'
    >,
    applicant: User,
    dates: string[],
    now: Date,
  ): Request {
    const auto = applicant.role === 'LEAD';
    return new Request({
      ...p,
      id: null,
      userId: applicant.id,
      status: auto ? 'APPROVED' : 'PENDING',
      decidedById: auto ? applicant.id : null,
      decidedAt: auto ? now : null,
      rejectReason: null,
      days: dates.map((date) => ({
        id: null,
        date,
        status: 'ACTIVE',
        cancelType: null,
        canceledById: null,
        canceledAt: null,
        cancelReason: null,
      })),
    });
  }

  get id(): number {
    if (this.props.id === null) throw new Error('저장 전 신청');
    return this.props.id;
  }
}
