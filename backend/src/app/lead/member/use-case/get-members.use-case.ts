import { Injectable } from '@nestjs/common';
import { UserRepository } from '../../../../domain/repository/user.repository';
import { UseCase } from '../../../use-case.interface';
import { MemberResult } from '../dto/get-members.dto';

// 리드: 재직 중인 사용자 목록 (퇴사자 제외)
@Injectable()
export class GetMembersUseCase implements UseCase<void, MemberResult[]> {
  constructor(private readonly users: UserRepository) {}

  async execute(): Promise<MemberResult[]> {
    return (await this.users.findAll()).map((u) => MemberResult.from(u));
  }
}
