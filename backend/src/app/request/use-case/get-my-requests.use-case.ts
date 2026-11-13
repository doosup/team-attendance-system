import { Injectable } from '@nestjs/common';
import { User } from '../../../domain/entity/user.entity';
import { RequestRepository } from '../../../domain/repository/request.repository';
import { UseCase } from '../../use-case.interface';
import { RequestResult } from '../dto/create-request.dto';

type Input = { user: User; includeCanceled: boolean };

@Injectable()
export class GetMyRequestsUseCase implements UseCase<Input, RequestResult[]> {
  constructor(private readonly requests: RequestRepository) {}

  async execute({ user, includeCanceled }: Input) {
    const rows = await this.requests.findByUser(user.id, includeCanceled);
    return rows.map((r) => RequestResult.from(r));
  }
}
