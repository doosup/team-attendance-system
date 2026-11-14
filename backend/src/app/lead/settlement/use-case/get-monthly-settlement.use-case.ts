import { Transactional } from '@nestjs-cls/transactional';
import { Injectable } from '@nestjs/common';
import {
  employedIn,
  settleMonth,
  settlementDateOf,
} from '../../../../domain/policy/settlement.policy';
import { Clock } from '../../../../domain/port/clock.port';
import { AttendanceRepository } from '../../../../domain/repository/attendance.repository';
import { LedgerRepository } from '../../../../domain/repository/ledger.repository';
import { RequestDayRepository } from '../../../../domain/repository/request-day.repository';
import { UserRepository } from '../../../../domain/repository/user.repository';
import { workDateOf } from '../../../../domain/value/work-date';
import { syncLedger } from '../../../balance/sync-ledger';
import { UseCase } from '../../../use-case.interface';
import {
  MonthlySettlementResult,
  SettlementRow,
} from '../dto/get-monthly-settlement.dto';

// 리드: 팀원별 월 집계 (FR-STL-01). 판정은 settlement.policy, 여기서는 모으기만
@Injectable()
export class GetMonthlySettlementUseCase implements UseCase<
  { month?: string },
  MonthlySettlementResult
> {
  constructor(
    private readonly clock: Clock,
    private readonly users: UserRepository,
    private readonly attendances: AttendanceRepository,
    private readonly ledger: LedgerRepository,
    private readonly requestDays: RequestDayRepository,
  ) {}

  // 원장 동기화(적립·만료 채우기)가 쓰기라서 트랜잭션
  @Transactional()
  async execute({ month }: { month?: string }) {
    const today = workDateOf(this.clock.now());
    const target = month ?? today.slice(0, 7);

    // shortcut: 사람마다 쿼리 3번(N+1), 팀 4명이라 충분. 인원이 늘면 월 단위 일괄 조회로
    const rows: SettlementRow[] = [];
    // 그 달에 재직한 날이 있는 사람만, 퇴사자 포함 (결정 A20)
    const members = (await this.users.findAllIncludingRetired()).filter((u) =>
      employedIn(target, u.joinDate, u.retiredAt && workDateOf(u.retiredAt)),
    );
    for (const user of members) {
      // 트랜잭션 클라이언트 하나를 쓰므로 병렬이 아니라 차례로
      const attendances = await this.attendances.findByUserAndMonth(
        user.id,
        target,
      );
      const retiredDate = user.retiredAt && workDateOf(user.retiredAt);
      // 원장은 추가 전용이라 퇴사자는 퇴사일까지만 채운다 (퇴사 뒤 적립이 영구히 남지 않게)
      const entries = await syncLedger(
        this.ledger,
        user,
        retiredDate && retiredDate < today ? retiredDate : today,
      );
      const remote = await this.requestDays.countRemoteDays(user.id, target);
      const { asOf: _asOf, ...s } = settleMonth(
        target,
        today,
        attendances,
        entries,
      );
      rows.push({
        userId: user.id,
        name: user.name,
        retiredDate,
        ...s,
        remote: { used: remote.normal, exceptions: remote.overLimit },
      });
    }
    return new MonthlySettlementResult(
      target,
      settlementDateOf(target, today),
      rows,
    );
  }
}
