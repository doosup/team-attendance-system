import { LedgerEntry } from '../../../domain/entity/ledger-entry.entity';

export class LedgerEntryResult {
  constructor(
    readonly id: number,
    readonly kind: string,
    readonly event: string,
    readonly days: number,
    readonly effectiveDate: string,
    readonly expiresOn: string | null,
    readonly requestDayId: number | null,
  ) {}

  static from(e: LedgerEntry): LedgerEntryResult {
    const p = e.props;
    return new LedgerEntryResult(
      p.id,
      p.kind,
      p.event,
      p.halfDays / 2,
      p.effectiveDate,
      p.expiresOn,
      p.requestDayId,
    );
  }
}
