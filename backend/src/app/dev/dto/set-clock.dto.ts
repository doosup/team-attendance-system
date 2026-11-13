import { IsISO8601, IsString, Matches } from 'class-validator';

export class SetClockRequest {
  @IsString()
  @IsISO8601({ strict: true, strictSeparator: true })
  @Matches(/(Z|[+-]\d{2}:\d{2})$/, {
    message: 'now에는 오프셋(Z 또는 ±hh:mm)이 있어야 합니다',
  })
  now!: string;
}
