import { IsInstant } from '../../../common/decorators/is-instant.decorator';

export class ManualCheckOutRequest {
  @IsInstant()
  checkOutAt!: string;
}
