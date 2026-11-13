import { LedgerDraft, LedgerEntry } from '../entity/ledger-entry.entity';

// 원장은 추가만 한다 (수정·삭제 없음).
export abstract class LedgerRepository {
  abstract findByUser(userId: number): Promise<LedgerEntry[]>;
  // dedupKey가 이미 있는 줄은 건너뛴다 (조회 시 동기화가 겹쳐도 안전)
  abstract append(drafts: LedgerDraft[]): Promise<void>;
}
