import {
  Controller,
  Delete,
  HttpCode,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { ClientIp } from '../../../../common/decorators/client-ip.decorator';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { Roles } from '../../../../common/decorators/roles.decorator';
import { User } from '../../../../domain/entity/user.entity';
import { DeleteAllowedIpUseCase } from '../use-case/delete-allowed-ip.use-case';

@Roles('LEAD')
@Controller('lead/allowed-ips/:id')
export class DeleteAllowedIpController {
  constructor(private readonly useCase: DeleteAllowedIpUseCase) {}

  @Delete()
  @HttpCode(200)
  async remove(
    @CurrentUser() lead: User,
    @ClientIp() ip: string,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<{ id: number }> {
    await this.useCase.execute({ lead, id, ip });
    return { id };
  }
}
