import { IsInstant } from '../../../common/decorators/is-instant.decorator';

export class SetClockRequest {
  @IsInstant()
  now!: string;
}
