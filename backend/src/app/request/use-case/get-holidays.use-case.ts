import { Injectable } from '@nestjs/common';
import { HOLIDAY_NAMES } from '../../../domain/value/holidays';
import { UseCase } from '../../use-case.interface';
import { HolidayResult } from '../dto/get-holidays.dto';

// 신청 화면에서 공휴일을 보여 주려고 서버의 영업일 판정과 같은 목록을 내려준다 (ATT-37)
@Injectable()
export class GetHolidaysUseCase implements UseCase<void, HolidayResult[]> {
  execute(): HolidayResult[] {
    return Object.entries(HOLIDAY_NAMES)
      .map(([date, name]) => ({ date, name }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }
}
