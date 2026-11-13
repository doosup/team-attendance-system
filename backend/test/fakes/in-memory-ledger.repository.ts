import {
  LedgerDraft,
  LedgerEntry,
} from '../../src/domain/entity/ledger-entry.entity';
import { LedgerRepository } from '../../src/domain/repository/ledger.repository';

export class InMemoryLedgerRepository extends LedgerRepository {
  readonly rows: LedgerEntry[] = [];
  private nextId = 1;

  findByUser(userId: number) {
    return Promise.resolve(this.rows.filter((e) => e.props.userId === userId));
  }

  append(drafts: LedgerDraft[]) {
    for (const d of drafts) {
      if (
        d.dedupKey &&
        this.rows.some((e) => e.props.dedupKey === d.dedupKey)
      ) {
        continue;
      }
      this.rows.push(new LedgerEntry({ ...d, id: this.nextId++ }));
    }
    return Promise.resolve();
  }
}
