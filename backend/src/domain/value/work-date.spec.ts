import { kstAt, msOfDayKst, workDateOf } from './work-date';

describe('work-date (KST)', () => {
  it('UTC 순간을 KST 날짜로 바꾼다: 한국 자정 직후는 그날이다', () => {
    expect(workDateOf(new Date('2026-11-12T15:00:00Z'))).toBe('2026-11-13');
  });

  it('한국 23:59:59는 아직 그날이다', () => {
    expect(workDateOf(new Date('2026-11-13T14:59:59Z'))).toBe('2026-11-13');
  });

  it('KST 자정부터 흐른 시간을 ms로 준다', () => {
    expect(msOfDayKst(new Date('2026-11-13T10:00:00+09:00'))).toBe(
      10 * 3600 * 1000,
    );
  });

  it('KST 날짜·시각으로 순간을 만든다', () => {
    expect(kstAt('2026-11-13', '07:00:00').toISOString()).toBe(
      '2026-11-12T22:00:00.000Z',
    );
  });
});
