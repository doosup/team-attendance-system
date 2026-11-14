import { IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

// 리드의 재택·주말 근무 접속 IP·시간대 변경 (A23). 사유 필수
export class ChangeRequestAccessBody {
  @IsString()
  @IsNotEmpty()
  @MaxLength(45)
  ip!: string;

  @Matches(TIME, { message: 'startTime은 HH:mm 형식입니다' })
  startTime!: string;

  @Matches(TIME, { message: 'endTime은 HH:mm 형식입니다' })
  endTime!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason!: string;
}
