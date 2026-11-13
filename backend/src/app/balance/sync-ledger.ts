import { LedgerEntry } from '../../domain/entity/ledger-entry.entity';
import { dueEvents } from '../../domain/policy/balance.policy';
import { LedgerRepository } from '../../domain/repository/ledger.repository';

/**
 * 원장 조회 전 동기화: 오늘까지 "생겼어야 할" 연차 적립·OFF 만료를 채우고 전체를 돌려준다.
 * 잔여·원장 조회와 신청(잔여 검사)이 함께 쓴다.
 */
export async function syncLedger(
  ledger: LedgerRepository,
  user: { id: number; joinDate: string },
  today: string,
): Promise<LedgerEntry[]> {
  const existing = await ledger.findByUser(user.id);
  const due = dueEvents(user.id, user.joinDate, existing, today);
  if (due.length === 0) return existing;
  await ledger.append(due);
  return ledger.findByUser(user.id);
}
