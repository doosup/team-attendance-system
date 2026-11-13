import { Clock } from '../../src/domain/port/clock.port';
import { kstAt } from '../../src/domain/value/work-date';

// 테스트용 시계. at('2026-11-13', '09:00:00')처럼 KST로 맞춘다.
export class FixedClock extends Clock {
  private current: Date;

  constructor(date: string, time: string) {
    super();
    this.current = kstAt(date, time);
  }

  at(date: string, time: string) {
    this.current = kstAt(date, time);
    return this;
  }

  now() {
    return this.current;
  }
}
