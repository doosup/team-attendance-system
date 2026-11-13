import { Matches } from 'class-validator';

export class GetMyMonthRequest {
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, { message: 'month는 YYYY-MM 형식입니다' })
  month!: string;
}
