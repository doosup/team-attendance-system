import { Module } from '@nestjs/common';
import { GetMyBalanceController } from './controller/get-my-balance.controller';
import { GetMyLedgerController } from './controller/get-my-ledger.controller';
import { GetMyBalanceUseCase } from './use-case/get-my-balance.use-case';
import { GetMyLedgerUseCase } from './use-case/get-my-ledger.use-case';

@Module({
  controllers: [GetMyBalanceController, GetMyLedgerController],
  providers: [GetMyBalanceUseCase, GetMyLedgerUseCase],
  exports: [GetMyLedgerUseCase],
})
export class BalanceModule {}
