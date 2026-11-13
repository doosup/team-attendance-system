// GET·PUT·DELETE /dev/clock 공통 응답.
export class ClockResult {
  constructor(
    readonly now: string,
    readonly overridden: boolean,
  ) {}

  static of(now: Date, overridden: boolean): ClockResult {
    return new ClockResult(now.toISOString(), overridden);
  }
}
