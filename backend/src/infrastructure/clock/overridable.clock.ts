import { Clock, ClockControl } from '../../domain/port/clock.port';

// 실제 시각과의 차이만 기억한다 → 바꾼 뒤에도 시간이 흐르고, 재시작하면 실제 시각.
export class OverridableClock extends Clock implements ClockControl {
  private offsetMs: number | null = null;

  constructor(private readonly real: Clock) {
    super();
  }

  // 업무 시각은 초 단위로 자른다: ms 차이로 지각·조퇴가 갈리지 않게 (결정 원칙 3)
  now(): Date {
    const ms = this.real.now().getTime() + (this.offsetMs ?? 0);
    return new Date(ms - (ms % 1000));
  }

  set(at: Date): void {
    this.offsetMs = at.getTime() - this.real.now().getTime();
  }

  reset(): void {
    this.offsetMs = null;
  }

  isOverridden(): boolean {
    return this.offsetMs !== null;
  }
}
