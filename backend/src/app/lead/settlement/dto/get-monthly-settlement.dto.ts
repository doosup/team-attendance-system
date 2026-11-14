import { IsOptional, Matches } from 'class-validator';
import { MonthlySettlement } from '../../../../domain/policy/settlement.policy';

export class GetMonthlySettlementQuery {
  // 없으면 이번 달
  @IsOptional()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, { message: 'month는 YYYY-MM 형식입니다' })
  month?: string;
}

export type SettlementRow = Omit<MonthlySettlement, 'asOf'> & {
  userId: number;
  name: string;
  retiredDate: string | null; // 퇴사일 (KST), 재직 중이면 null
  remote: { used: number; exceptions: number };
};

export class MonthlySettlementResult {
  constructor(
    readonly month: string,
    readonly asOf: string, // 잔여 기준일
    readonly rows: SettlementRow[],
  ) {}
}
