import {
  CancelType,
  DayStatus,
  RequestStatus,
  RequestType,
} from '../repository/request-day.repository';
import { CustomException } from '../exception/custom.exception';
import { assertTimeWindow } from '../policy/request.policy';
import { User } from './user.entity';

export type HalfOffPart = 'AM' | 'PM';

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
  isAfterDeadline: boolean; // 기한 후 예외 신청 (사유 필수, 리드 승인, A22)
  reason: string;
  ip: string | null;
  halfOffPart: HalfOffPart | null; // 반일 OFF 오전/오후 (표시용, ATT-34)
  startTime: string | null;
  endTime: string | null;
  decidedById: number | null;
  decidedAt: Date | null;
  rejectReason: string | null;
  // 리드가 접속 IP·시간대를 바꾼 기록 (A23). 바꾸기 전 값은 이력에
  accessChangedAt: Date | null;
  accessChangedById: number | null;
  accessChangeReason: string | null;
  days: RequestDayProps[];
}

export interface Access {
  ip: string;
  startTime: string;
  endTime: string;
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
      | 'isAfterDeadline'
      | 'reason'
      | 'ip'
      | 'halfOffPart'
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
      accessChangedAt: null,
      accessChangedById: null,
      accessChangeReason: null,
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

  /**
   * 퇴사 처리 (결정 A20): 승인된 신청은 내일 이후 날짜만, 대기 신청은 효력이 없으므로 전부 취소.
   * 남은 날이 없으면 신청서도 취소
   */
  cancelForRetirement(leadId: number, today: string, now: Date): number[] {
    const pending = this.props.status === 'PENDING';
    const canceled = this.props.days.filter(
      (d) => d.status === 'ACTIVE' && (pending || d.date > today),
    );
    for (const d of canceled) {
      Object.assign(d, {
        status: 'CANCELED',
        cancelType: 'RETIREMENT',
        canceledById: leadId,
        canceledAt: now,
      });
    }
    if (
      canceled.length > 0 &&
      this.props.days.every((d) => d.status === 'CANCELED')
    ) {
      this.props.status = 'CANCELED';
    }
    return canceled.flatMap((d) => (d.id === null ? [] : [d.id]));
  }

  /**
   * 리드의 접속 IP·시간대 변경 (A23): 재택·주말 근무, 대기·승인, 오늘 이후 날짜가 남은 것만.
   * IP 형식·사유 검사는 유스케이스. 바꾸기 전 값을 돌려준다 (이력용)
   */
  changeAccess(
    leadId: number,
    access: Access,
    reason: string,
    today: string,
    now: Date,
  ): Access {
    const { type, status } = this.props;
    if (type !== 'REMOTE' && type !== 'WEEKEND_WORK') {
      throw new CustomException('ACCESS_CHANGE_NOT_ALLOWED');
    }
    if (status !== 'PENDING' && status !== 'APPROVED') {
      throw new CustomException('INVALID_STATUS_TRANSITION');
    }
    if (
      !this.props.days.some((d) => d.status === 'ACTIVE' && d.date >= today)
    ) {
      throw new CustomException('ACCESS_CHANGE_NOT_ALLOWED');
    }
    assertTimeWindow(access.startTime, access.endTime);
    const before = {
      ip: this.props.ip ?? '',
      startTime: this.props.startTime ?? '',
      endTime: this.props.endTime ?? '',
    };
    // 그대로 저장하면 바뀌지 않은 신청에 "리드 변경" 표시와 이력이 남는다
    if (
      before.ip === access.ip &&
      before.startTime === access.startTime &&
      before.endTime === access.endTime
    ) {
      throw new CustomException('VALIDATION_FAILED', '바뀐 내용이 없습니다');
    }
    Object.assign(this.props, {
      ...access,
      accessChangedAt: now,
      accessChangedById: leadId,
      accessChangeReason: reason,
    });
    return before;
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
