import { Body, Controller, Post } from '@nestjs/common';
import { ClientIp } from '../../../../common/decorators/client-ip.decorator';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { Roles } from '../../../../common/decorators/roles.decorator';
import { User } from '../../../../domain/entity/user.entity';
import { AddAllowedIpBody } from '../dto/add-allowed-ip.dto';
import { AllowedIpResult } from '../dto/get-allowed-ips.dto';
import { AddAllowedIpUseCase } from '../use-case/add-allowed-ip.use-case';

@Roles('LEAD')
@Controller('lead/allowed-ips')
export class AddAllowedIpController {
  constructor(private readonly useCase: AddAllowedIpUseCase) {}

  @Post()
  add(
    @CurrentUser() lead: User,
    @ClientIp() ip: string,
    @Body() body: AddAllowedIpBody,
  ): Promise<AllowedIpResult> {
    return this.useCase.execute({ lead, ip, body });
  }
}
