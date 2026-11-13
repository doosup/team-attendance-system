import { Clock } from '../../domain/port/clock.port';
import { OverridableClock } from './overridable.clock';

class FakeClock extends Clock {
  constructor(public current: Date) {
    super();
  }
  now() {
    return this.current;
  }
}

const at = (iso: string) => new Date(iso);

describe('OverridableClock', () => {
  let real: FakeClock;
  let clock: OverridableClock;

  beforeEach(() => {
    real = new FakeClock(at('2026-11-13T03:00:00Z'));
    clock = new OverridableClock(real);
  });

  it('바꾸기 전에는 실제 시각을 그대로 준다', () => {
    expect(clock.now()).toEqual(at('2026-11-13T03:00:00Z'));
    expect(clock.isOverridden()).toBe(false);
  });

  it('바꾼 시각을 준다', () => {
    clock.set(at('2026-11-13T09:59:50+09:00'));
    expect(clock.now()).toEqual(at('2026-11-13T09:59:50+09:00'));
    expect(clock.isOverridden()).toBe(true);
  });

  it('바꾼 뒤에도 시간이 흐른다: 09:59:50으로 바꾸고 10초 뒤는 10:00:00이다', () => {
    clock.set(at('2026-11-13T09:59:50+09:00'));
    real.current = at('2026-11-13T03:00:10Z');
    expect(clock.now()).toEqual(at('2026-11-13T10:00:00+09:00'));
  });

  it('과거로도 바꿀 수 있다', () => {
    clock.set(at('2026-02-01T08:00:00+09:00'));
    expect(clock.now()).toEqual(at('2026-02-01T08:00:00+09:00'));
  });

  it('다시 바꾸면 마지막 값 기준이다', () => {
    clock.set(at('2026-02-01T08:00:00+09:00'));
    clock.set(at('2026-12-24T17:00:00+09:00'));
    expect(clock.now()).toEqual(at('2026-12-24T17:00:00+09:00'));
  });

  it('실제 시각과 같은 값으로 바꿔도 바뀐 상태로 본다', () => {
    clock.set(at('2026-11-13T03:00:00Z'));
    expect(clock.isOverridden()).toBe(true);
  });

  it('업무 시각은 초 단위로 자른다: 10:00:00.500은 10:00:00이다 (결정 원칙 3)', () => {
    real.current = at('2026-11-13T01:00:00.500Z');
    expect(clock.now()).toEqual(at('2026-11-13T01:00:00.000Z'));
  });

  it('바꾼 시각에 ms가 있어도 초 단위로 자른다', () => {
    clock.set(at('2026-11-13T09:59:59.999+09:00'));
    expect(clock.now()).toEqual(at('2026-11-13T09:59:59.000+09:00'));
  });

  it('초기화하면 실제 시각으로 돌아간다', () => {
    clock.set(at('2026-02-01T08:00:00+09:00'));
    clock.reset();
    expect(clock.now()).toEqual(at('2026-11-13T03:00:00Z'));
    expect(clock.isOverridden()).toBe(false);
  });
});
