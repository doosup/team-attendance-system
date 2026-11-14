import { GetHolidaysUseCase } from './get-holidays.use-case';

describe('공휴일 목록 (신청 화면 표시용, ATT-37)', () => {
  it('지원 연도의 공휴일을 날짜순으로 이름과 함께 돌려준다', () => {
    const rows = new GetHolidaysUseCase().execute();
    expect(rows[0]).toEqual({ date: '2026-01-01', name: '신정' });
    expect(rows).toContainEqual({
      date: '2027-02-09',
      name: '설날 대체공휴일',
    });
    expect(rows.map((r) => r.date)).toEqual(
      [...rows.map((r) => r.date)].sort(),
    );
  });
});
