import { Clock } from '../../domain/port/clock.port';

// 실제 시각을 읽는 유일한 곳.
export class SystemClock extends Clock {
  now(): Date {
    return new Date();
  }
}
