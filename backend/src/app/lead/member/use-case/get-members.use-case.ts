import { Injectable } from '@nestjs/common';
import { UserRepository } from '../../../../domain/repository/user.repository';
import { UseCase } from '../../../use-case.interface';
import { MemberResult } from '../dto/get-members.dto';

type Input = { includeRetired?: boolean } | void;

// 리드: 재직 중인 사용자 목록. includeRetired면 퇴사자도 (이력 필터용)
@Injectable()
export class GetMembersUseCase implements UseCase<Input, MemberResult[]> {
  constructor(private readonly users: UserRepository) {}

  async execute(input: Input): Promise<MemberResult[]> {
    const rows = input?.includeRetired
      ? await this.users.findAllIncludingRetired()
      : await this.users.findAll();
    return rows.map((u) => MemberResult.from(u));
  }
}
