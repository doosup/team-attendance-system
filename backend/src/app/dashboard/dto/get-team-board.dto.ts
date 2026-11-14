import { IsISO8601, IsOptional, Matches } from 'class-validator';
import type { BoardStatus } from '../../../domain/policy/board.policy';

export class GetTeamBoardQuery {
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsISO8601({ strict: true })
  date?: string;
}

// 팀원에게는 상태만, 리드에게는 시각·지각·조퇴·10시 경과까지 (결정 16)
export interface TeamBoardRow {
  userId: number;
  name: string;
  status: BoardStatus;
  // 승인된 반일 OFF의 오전/오후·반차 예정 시간 (모두에게, 적은 게 있을 때만, ATT-34)
  halfOff?: {
    part: 'AM' | 'PM' | null;
    startTime: string | null;
    endTime: string | null;
  };
  dayType?: string | null;
  checkInAt?: string | null;
  checkOutAt?: string | null;
  isLate?: boolean | null;
  isEarlyLeave?: boolean | null;
  workedMinutes?: number | null;
  checkOutSource?: string | null;
  pastTen?: boolean;
}
