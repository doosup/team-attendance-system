// 업무 시각의 유일한 출처. new Date()·Date.now() 대신 주입받아 쓴다 (ADR-003).
export abstract class Clock {
  abstract now(): Date;
}

// 개발용 시각 변경 (/dev/clock). 바꾼 뒤에도 시간은 흐른다.
export abstract class ClockControl {
  abstract set(at: Date): void;
  abstract reset(): void;
  abstract isOverridden(): boolean;
}
