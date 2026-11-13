import { Injectable } from '@nestjs/common';
import { CustomException } from '../../../../domain/exception/custom.exception';
import { UserRepository } from '../../../../domain/repository/user.repository';
import { LedgerEntryResult } from '../../../balance/dto/get-my-ledger.dto';
import { GetMyLedgerUseCase } from '../../../balance/use-case/get-my-ledger.use-case';
import { UseCase } from '../../../use-case.interface';

// 리드가 보는 팀원 원장. 원장 조회 자체는 본인용 유스케이스를 그대로 쓴다.
@Injectable()
export class GetUserLedgerUseCase implements UseCase<
  number,
  LedgerEntryResult[]
> {
  constructor(
    private readonly users: UserRepository,
    private readonly ledger: GetMyLedgerUseCase,
  ) {}

  async execute(userId: number) {
    const user = await this.users.findById(userId);
    if (!user) throw new CustomException('USER_NOT_FOUND');
    return this.ledger.execute(user);
  }
}
