import { Transactional } from '@nestjs-cls/transactional';
import { Injectable } from '@nestjs/common';
import { Request } from '../../../../domain/entity/request.entity';
import { User } from '../../../../domain/entity/user.entity';
import { CustomException } from '../../../../domain/exception/custom.exception';
import { Clock } from '../../../../domain/port/clock.port';
import { AttendanceRepository } from '../../../../domain/repository/attendance.repository';
import { AuditLogRepository } from '../../../../domain/repository/audit-log.repository';
import { RequestRepository } from '../../../../domain/repository/request.repository';
import { RequestResult } from '../../../request/dto/create-request.dto';
import { UseCase } from '../../../use-case.interface';

type Input = { lead: User; requestId: number; ip: string };

// 승인: 잔여는 신청 때 이미 차감했으므로 상태만 바꾼다. 승인 기한은 없다 (결정 14)
// 반일 OFF가 출근 뒤에 승인되면 그날 출근 기록을 반일 OFF 사용일로 다시 판정한다 (ATT-48)
@Injectable()
export class ApproveRequestUseCase implements UseCase<Input, RequestResult> {
  constructor(
    private readonly clock: Clock,
    private readonly requests: RequestRepository,
    private readonly attendances: AttendanceRepository,
    private readonly audit: AuditLogRepository,
  ) {}

  @Transactional()
  async execute({ lead, requestId, ip }: Input): Promise<RequestResult> {
    const now = this.clock.now();
    const request = await this.requests.findById(requestId);
    if (!request) throw new CustomException('REQUEST_NOT_FOUND');

    request.approve(lead.id, now);
    await this.requests.save(request);
    const convertedAttendance = await this.rejudgeHalfOff(request);
    await this.audit.append({
      actorId: lead.id,
      action: 'REQUEST_APPROVE',
      targetType: 'Request',
      targetId: request.id,
      payload: {
        applicantId: request.props.userId,
        type: request.props.type,
        startDate: request.props.startDate,
        endDate: request.props.endDate,
        isOverLimit: request.props.isOverLimit,
        isAfterDeadline: request.props.isAfterDeadline,
        convertedAttendance,
      },
      ip,
      occurredAt: now,
    });
    return RequestResult.from(request);
  }

  // 반일 OFF는 하루짜리. 승인 전엔 일반일로 기록되었으니(지각·8시간) 반일 OFF 기준으로 바꾼다.
  // 연차는 바꾸지 않는다: 일한 기록을 지울 수 없어서, 리드 당일 취소나 승인 확인 창으로 (README 한계)
  private async rejudgeHalfOff(request: Request) {
    const day = request.props.days[0];
    if (request.props.type !== 'HALF_OFF' || day?.id == null) return null;
    const attendance = await this.attendances.findByUserAndDate(
      request.props.userId,
      day.date,
    );
    if (!attendance || attendance.props.dayType !== 'FULL_DAY') return null;
    const { dayType, isLate, isEarlyLeave } = attendance.props;
    attendance.toHalfDayOff(day.id);
    await this.attendances.save(attendance);
    return { id: attendance.id, before: { dayType, isLate, isEarlyLeave } };
  }
}
