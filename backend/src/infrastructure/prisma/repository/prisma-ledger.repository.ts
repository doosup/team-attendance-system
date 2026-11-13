import { TransactionHost } from '@nestjs-cls/transactional';
import { Injectable } from '@nestjs/common';
import {
  LedgerDraft,
  LedgerEntry,
} from '../../../domain/entity/ledger-entry.entity';
import { LedgerRepository } from '../../../domain/repository/ledger.repository';
import type { PrismaTx } from '../transaction';

@Injectable()
export class PrismaLedgerRepository extends LedgerRepository {
  constructor(private readonly txHost: TransactionHost) {
    super();
  }

  private get tx() {
    return (this.txHost as PrismaTx).tx;
  }

  async findByUser(userId: number): Promise<LedgerEntry[]> {
    const rows = await this.tx.leaveLedger.findMany({
      where: { userId },
      orderBy: [{ effectiveDate: 'asc' }, { id: 'asc' }],
    });
    return rows.map(
      ({ createdAt: _createdAt, ...props }) => new LedgerEntry(props),
    );
  }

  async append(drafts: LedgerDraft[]): Promise<void> {
    if (drafts.length === 0) return;
    const keys = drafts.flatMap((d) => (d.dedupKey ? [d.dedupKey] : []));
    const existing = new Set(
      (
        await this.tx.leaveLedger.findMany({
          where: { dedupKey: { in: keys } },
          select: { dedupKey: true },
        })
      ).map((r) => r.dedupKey),
    );
    for (const d of drafts) {
      if (d.dedupKey && existing.has(d.dedupKey)) continue;
      // 동시에 같은 키를 넣으면 dedupKey 유일 제약이 최종 차단 (P2002 → 요청 실패, 재조회하면 정상)
      await this.tx.leaveLedger.create({ data: d });
    }
  }
}
