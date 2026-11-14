import { Injectable } from '@nestjs/common';
import type { RequestStatus } from '../../../../domain/repository/request-day.repository';
import { RequestRepository } from '../../../../domain/repository/request.repository';
import { UserRepository } from '../../../../domain/repository/user.repository';
import { UseCase } from '../../../use-case.interface';
import {
  LeadRequestResult,
  withUserName,
} from '../dto/get-pending-requests.dto';

// 리드 대기 목록: 시작일 가까운 순, 예외 신청(isOverLimit) 표시 (결정 14·18)
@Injectable()
export class GetPendingRequestsUseCase implements UseCase<
  RequestStatus,
  LeadRequestResult[]
> {
  constructor(
    private readonly requests: RequestRepository,
    private readonly users: UserRepository,
  ) {}

  async execute(status: RequestStatus = 'PENDING') {
    const names = new Map(
      (await this.users.findAll()).map((u) => [u.id, u.name]),
    );
    const rows = await this.requests.findByStatus(status);
    // 퇴사자의 남은 신청은 리드가 처리할 대상이 아니다 (결정 A20)
    return rows.flatMap((r) => {
      const name = names.get(r.props.userId);
      return name === undefined ? [] : [withUserName(r, name)];
    });
  }
}
