import { Transactional } from '@nestjs-cls/transactional';
import { Injectable } from '@nestjs/common';
import { User } from '../../../domain/entity/user.entity';
import { Clock } from '../../../domain/port/clock.port';
import { LedgerRepository } from '../../../domain/repository/ledger.repository';
import { workDateOf } from '../../../domain/value/work-date';
import { UseCase } from '../../use-case.interface';
import { LedgerEntryResult } from '../dto/get-my-ledger.dto';
import { syncLedger } from '../sync-ledger';

// 원장 내역 (본인 /balances/me/ledger, 리드 /lead/users/:userId/ledger 공통)
@Injectable()
export class GetMyLedgerUseCase implements UseCase<
  Pick<User, 'id' | 'joinDate'>,
  LedgerEntryResult[]
> {
  constructor(
    private readonly clock: Clock,
    private readonly ledger: LedgerRepository,
  ) {}

  @Transactional()
  async execute(user: Pick<User, 'id' | 'joinDate'>) {
    const today = workDateOf(this.clock.now());
    const entries = await syncLedger(this.ledger, user, today);
    return entries.map((e) => LedgerEntryResult.from(e));
  }
}
