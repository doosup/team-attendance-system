import { Injectable } from '@nestjs/common';
import { AllowedIpRepository } from '../../../../domain/repository/allowed-ip.repository';
import { UseCase } from '../../../use-case.interface';
import { AllowedIpResult } from '../dto/get-allowed-ips.dto';

@Injectable()
export class GetAllowedIpsUseCase implements UseCase<void, AllowedIpResult[]> {
  constructor(private readonly ips: AllowedIpRepository) {}

  async execute() {
    return (await this.ips.findActive()).map((a) => AllowedIpResult.from(a));
  }
}
