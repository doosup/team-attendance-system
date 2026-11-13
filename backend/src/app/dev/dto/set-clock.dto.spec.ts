import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { SetClockRequest } from './set-clock.dto';

const errorsOf = (body: object) =>
  validateSync(plainToInstance(SetClockRequest, body));

describe('SetClockRequest', () => {
  it.each([
    '2026-11-13T09:59:50+09:00',
    '2026-11-13T00:59:50Z',
    '2026-11-13T00:59:50.123Z',
  ])('오프셋이 있는 ISO 8601은 통과한다: %s', (now) => {
    expect(errorsOf({ now })).toHaveLength(0);
  });

  it.each([
    ['오프셋 없는 시각', '2026-11-13T09:59:50'],
    ['날짜만', '2026-11-13'],
    ['없는 날짜', '2026-02-30T09:00:00+09:00'],
    ['형식이 아닌 문자열', 'tomorrow'],
    ['숫자', 1763000000000],
  ])('%s은 거부한다', (_, now) => {
    expect(errorsOf({ now })).not.toHaveLength(0);
  });

  it('now가 없으면 거부한다', () => {
    expect(errorsOf({})).not.toHaveLength(0);
  });
});
