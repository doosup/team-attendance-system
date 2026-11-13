export type LeaveKind = 'ANNUAL' | 'HALF_OFF';
export type LedgerEvent = 'ACCRUE' | 'USE' | 'EXPIRE' | 'RESTORE';

export interface LedgerEntryProps {
  id: number;
  userId: number;
  kind: LeaveKind;
  event: LedgerEvent;
  halfDays: number; // 1일 = 2, 반일 = 1, 부호 포함
  effectiveDate: string;
  expiresOn: string | null; // HALF_OFF ACCRUE만
  grantId: number | null; // HALF_OFF의 USE·RESTORE·EXPIRE → 지급분
  requestDayId: number | null;
  dedupKey: string | null; // 적립·만료 중복 방지
}

// 아직 저장하지 않은 원장 한 줄 (추가 전용, 수정·삭제 없음)
export type LedgerDraft = Omit<LedgerEntryProps, 'id'>;

export class LedgerEntry {
  constructor(readonly props: LedgerEntryProps) {}
}
