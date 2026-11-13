import { IsIn, IsOptional } from 'class-validator';
import { Request } from '../../../../domain/entity/request.entity';
import type { RequestStatus } from '../../../../domain/repository/request-day.repository';
import { RequestResult } from '../../../request/dto/create-request.dto';

export class GetPendingRequestsQuery {
  @IsOptional()
  @IsIn(['PENDING', 'APPROVED', 'REJECTED', 'CANCELED'])
  status?: RequestStatus;
}

// 리드 목록: 신청서 + 신청자 이름
export type LeadRequestResult = RequestResult & { userName: string | null };

export const withUserName = (
  r: Request,
  userName: string | null,
): LeadRequestResult => ({ ...RequestResult.from(r), userName });
