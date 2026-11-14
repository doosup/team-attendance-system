import {
  IsIn,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { Request } from '../../../domain/entity/request.entity';
import type { HalfOffPart } from '../../../domain/entity/request.entity';
import type { RequestType } from '../../../domain/repository/request-day.repository';

const TYPES: RequestType[] = ['ANNUAL', 'REMOTE', 'HALF_OFF', 'WEEKEND_WORK'];
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
// 재택·주말 근무는 신청한 IP·시간대에서만 출퇴근 (FR-ATT-04, A8)
const needsIpAndTime = (o: CreateRequestRequest) =>
  o.type === 'REMOTE' || o.type === 'WEEKEND_WORK';
// 반일 OFF의 오전/오후·반차 예정 시간은 선택(과제 FN-REQ-01은 종류·날짜·사유만). 시간을 적으면 둘 다 (ATT-34, 판정에는 안 씀)
const isHalfOff = (o: CreateRequestRequest) => o.type === 'HALF_OFF';
const needsTime = (o: CreateRequestRequest) =>
  needsIpAndTime(o) ||
  (isHalfOff(o) && (o.startTime !== undefined || o.endTime !== undefined));

export class CreateRequestRequest {
  @IsIn(TYPES)
  type!: RequestType;

  @Matches(DATE)
  @IsISO8601({ strict: true })
  startDate!: string;

  @Matches(DATE)
  @IsISO8601({ strict: true })
  endDate!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;

  @ValidateIf(needsIpAndTime)
  @IsString()
  @IsNotEmpty()
  @MaxLength(45)
  ip?: string;

  @ValidateIf(isHalfOff)
  @IsOptional()
  @IsIn(['AM', 'PM'])
  halfOffPart?: HalfOffPart;

  @ValidateIf(needsTime)
  @Matches(TIME, { message: 'startTime은 HH:mm 형식입니다' })
  startTime?: string;

  @ValidateIf(needsTime)
  @Matches(TIME, { message: 'endTime은 HH:mm 형식입니다' })
  endTime?: string;
}

export class RequestDayResult {
  constructor(
    readonly id: number,
    readonly date: string,
    readonly status: string,
    readonly cancelType: string | null,
    readonly cancelReason: string | null,
  ) {}
}

export class RequestResult {
  constructor(
    readonly id: number,
    readonly userId: number,
    readonly type: RequestType,
    readonly startDate: string,
    readonly endDate: string,
    readonly status: string,
    readonly isOverLimit: boolean,
    readonly isAfterDeadline: boolean,
    readonly reason: string,
    readonly ip: string | null,
    readonly halfOffPart: HalfOffPart | null,
    readonly startTime: string | null,
    readonly endTime: string | null,
    readonly decidedAt: string | null,
    readonly rejectReason: string | null,
    readonly days: RequestDayResult[],
  ) {}

  static from(r: Request): RequestResult {
    const p = r.props;
    return new RequestResult(
      r.id,
      p.userId,
      p.type,
      p.startDate,
      p.endDate,
      p.status,
      p.isOverLimit,
      p.isAfterDeadline,
      p.reason,
      p.ip,
      p.halfOffPart,
      p.startTime,
      p.endTime,
      p.decidedAt?.toISOString() ?? null,
      p.rejectReason,
      p.days.map(
        (d) =>
          new RequestDayResult(
            d.id ?? 0,
            d.date,
            d.status,
            d.cancelType,
            d.cancelReason,
          ),
      ),
    );
  }
}
