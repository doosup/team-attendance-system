import { Controller, Get } from '@nestjs/common';
import { Roles } from '../../../../common/decorators/roles.decorator';
import { AllowedIpResult } from '../dto/get-allowed-ips.dto';
import { GetAllowedIpsUseCase } from '../use-case/get-allowed-ips.use-case';

@Roles('LEAD')
@Controller('lead/allowed-ips')
export class GetAllowedIpsController {
  constructor(private readonly useCase: GetAllowedIpsUseCase) {}

  @Get()
  list(): Promise<AllowedIpResult[]> {
    return this.useCase.execute();
  }
}
