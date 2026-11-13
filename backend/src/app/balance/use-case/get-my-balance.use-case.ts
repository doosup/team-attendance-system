import { Transactional } from '@nestjs-cls/transactional';
import { Injectable } from '@nestjs/common';
import { User } from '../../../domain/entity/user.entity';
import { balanceOf, offGrants } from '../../../domain/policy/balance.policy';
import { Clock } from '../../../domain/port/clock.port';
import { LedgerRepository } from '../../../domain/repository/ledger.repository';
import { RequestDayRepository } from '../../../domain/repository/request-day.repository';
import { workDateOf } from '../../../domain/value/work-date';
import { UseCase } from '../../use-case.interface';
import { BalanceResult } from '../dto/get-my-balance.dto';
import { syncLedger } from '../sync-ledger';

const REMOTE_MONTHLY_LIMIT = 2;

@Injectable()
export class GetMyBalanceUseCase implements UseCase<User, BalanceResult> {
  constructor(
    private readonly clock: Clock,
    private readonly ledger: LedgerRepository,
    private readonly requestDays: RequestDayRepository,
  ) {}

  @Transactional()
  async execute(user: Pick<User, 'id' | 'joinDate'>): Promise<BalanceResult> {
    const today = workDateOf(this.clock.now());
    const entries = await syncLedger(this.ledger, user, today);
    const { annual, halfOff } = balanceOf(entries, today);
    const month = today.slice(0, 7);
    const remote = await this.requestDays.countRemoteDays(user.id, month);

    return new BalanceResult(
      { days: annual / 2 },
      {
        count: halfOff,
        grants: offGrants(entries, today)
          .filter((g) => g.remaining > 0 && g.expiresOn >= today)
          .map(({ expiresOn, remaining }) => ({ expiresOn, remaining })),
      },
      {
        month,
        used: remote.normal,
        limit: REMOTE_MONTHLY_LIMIT,
        exceptions: remote.overLimit,
      },
    );
  }
}
