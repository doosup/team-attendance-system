import { IsOptional, Matches } from 'class-validator';
import type { RequestType } from '../../../domain/repository/request-day.repository';

export class GetTeamCalendarQuery {
  @IsOptional()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/)
  month?: string;
}

// 확정 일정만, 모두에게 같은 필드: IP·사유·출퇴근 시각은 넣지 않는다 (ATT-47)
export interface TeamCalendarEntry {
  date: string;
  userId: number;
  name: string;
  type: RequestType;
  halfOffPart: 'AM' | 'PM' | null;
}
