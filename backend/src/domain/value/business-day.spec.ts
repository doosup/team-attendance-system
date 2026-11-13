import { isBusinessDay, previousBusinessDay } from './business-day';

describe('영업일', () => {
  it('평일은 영업일이다', () => {
    expect(isBusinessDay('2026-11-13')).toBe(true); // 금
  });

  it.each(['2026-11-14', '2026-11-15'])('주말(%s)은 영업일이 아니다', (d) => {
    expect(isBusinessDay(d)).toBe(false);
  });

  it.each([
    ['신정', '2026-01-01'],
    ['설날', '2026-02-17'],
    ['삼일절 대체공휴일', '2026-03-02'],
    ['지방선거일', '2026-06-03'],
    ['추석', '2026-09-25'],
    ['한글날', '2026-10-09'],
    ['성탄절', '2026-12-25'],
  ])('공휴일(%s)은 영업일이 아니다', (_, d) => {
    expect(isBusinessDay(d)).toBe(false);
  });

  it('월요일의 직전 영업일은 금요일이다', () => {
    expect(previousBusinessDay('2026-11-16')).toBe('2026-11-13');
  });

  it('연휴 다음 날의 직전 영업일은 연휴 전날이다 (설 연휴 2/16~18)', () => {
    expect(previousBusinessDay('2026-02-19')).toBe('2026-02-13');
  });
});
