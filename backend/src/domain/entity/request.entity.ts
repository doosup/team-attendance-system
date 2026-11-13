import {
  CancelType,
  DayStatus,
  RequestStatus,
  RequestType,
} from '../repository/request-day.repository';
import { CustomException } from '../exception/custom.exception';
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

  /** 리드 승인: 대기 상태만 (결정 14) */
  approve(leadId: number, now: Date): void {
    this.assertPending();
    Object.assign(this.props, {
      status: 'APPROVED',
      decidedById: leadId,
      decidedAt: now,
    });
  }

  /** 리드 반려: 대기 상태만, 사유 필수 (검증은 DTO) */
  reject(leadId: number, reason: string, now: Date): void {
    this.assertPending();
    Object.assign(this.props, {
      status: 'REJECTED',
      decidedById: leadId,
      decidedAt: now,
      rejectReason: reason,
    });
  }

  /** 본인 취소: 기간 전체 (기한 검사는 유스케이스). 취소한 날짜 행 id를 돌려준다 */
  cancelBySelf(userId: number, now: Date): number[] {
    if (this.props.status !== 'PENDING' && this.props.status !== 'APPROVED') {
      throw new CustomException('INVALID_STATUS_TRANSITION');
    }
    this.props.status = 'CANCELED';
    const canceled = this.props.days.filter((d) => d.status === 'ACTIVE');
    for (const d of canceled) {
      Object.assign(d, {
        status: 'CANCELED',
        cancelType: 'SELF_BEFORE_DEADLINE',
        canceledById: userId,
        canceledAt: now,
      });
    }
    return canceled.flatMap((d) => (d.id === null ? [] : [d.id]));
  }

  /** 리드 당일 취소: 승인된 신청의 그날 하루만, 신청서는 승인 유지 (결정 12) */
  cancelDay(date: string, leadId: number, reason: string, now: Date): number {
    if (this.props.status !== 'APPROVED') {
      throw new CustomException('INVALID_STATUS_TRANSITION');
    }
    const day = this.props.days.find((d) => d.date === date);
    if (!day || day.id === null) throw new CustomException('REQUEST_NOT_FOUND');
    if (day.status !== 'ACTIVE') {
      throw new CustomException('INVALID_STATUS_TRANSITION');
    }
    Object.assign(day, {
      status: 'CANCELED',
      cancelType: 'LEAD_SAME_DAY',
      canceledById: leadId,
      canceledAt: now,
      cancelReason: reason,
    });
    return day.id;
  }

  get dayIds(): number[] {
    return this.props.days.flatMap((d) => (d.id === null ? [] : [d.id]));
  }

  private assertPending(): void {
    if (this.props.status !== 'PENDING') {
      throw new CustomException('INVALID_STATUS_TRANSITION');
    }
  }

  get id(): number {
    if (this.props.id === null) throw new Error('저장 전 신청');
    return this.props.id;
  }
}
