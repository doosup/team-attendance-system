import { kstAt } from '../value/work-date';
import {
  assertBeforeDeadline,
  datesForRequest,
  isRemoteOverLimit,
} from './request.policy';

const codeOf = (fn: () => unknown) => {
  try {
    fn();
    return 'OK';
  } catch (e) {
    return (e as { code: string }).code;
  }
};

describe('신청 날짜 datesForRequest', () => {
  it('연차는 기간 안의 영업일만 (금~월 → 금·월 2일)', () => {
    expect(datesForRequest('ANNUAL', '2026-11-13', '2026-11-16')).toEqual([
      '2026-11-13',
      '2026-11-16',
    ]);
  });

  it('재택도 영업일만 (공휴일 제외: 10/8~10/9 한글날 → 10/8)', () => {
    expect(datesForRequest('REMOTE', '2026-10-08', '2026-10-09')).toEqual([
      '2026-10-08',
    ]);
  });

  it('종료일이 시작일보다 이르면 INVALID_DATE_RANGE', () => {
    expect(
      codeOf(() => datesForRequest('ANNUAL', '2026-11-16', '2026-11-13')),
    ).toBe('INVALID_DATE_RANGE');
  });

  it('기간에 영업일이 없으면 NO_BUSINESS_DAY_IN_RANGE (토~일 연차)', () => {
    expect(
      codeOf(() => datesForRequest('ANNUAL', '2026-11-14', '2026-11-15')),
    ).toBe('NO_BUSINESS_DAY_IN_RANGE');
  });

  it.each(['HALF_OFF', 'WEEKEND_WORK'] as const)(
    '%s는 하루만 신청한다 (기간이면 INVALID_DATE_RANGE)',
    (type) => {
      expect(
        codeOf(() => datesForRequest(type, '2026-11-14', '2026-11-15')),
      ).toBe('INVALID_DATE_RANGE');
    },
  );

  it('반일 OFF는 영업일에만 (토요일이면 NO_BUSINESS_DAY_IN_RANGE)', () => {
    expect(
      codeOf(() => datesForRequest('HALF_OFF', '2026-11-14', '2026-11-14')),
    ).toBe('NO_BUSINESS_DAY_IN_RANGE');
  });

  it('주말·공휴일 근무는 주말·공휴일에만 (평일이면 WEEKEND_WORK_NOT_HOLIDAY)', () => {
    expect(
      codeOf(() => datesForRequest('WEEKEND_WORK', '2026-11-13', '2026-11-13')),
    ).toBe('WEEKEND_WORK_NOT_HOLIDAY');
    expect(datesForRequest('WEEKEND_WORK', '2026-10-09', '2026-10-09')).toEqual(
      ['2026-10-09'],
    );
  });

  it('2027년 이후처럼 공휴일 데이터가 없는 연도는 거부한다 (주말만 빼고 잘못 계산하지 않게)', () => {
    expect(
      codeOf(() => datesForRequest('ANNUAL', '2027-01-04', '2027-01-04')),
    ).toBe('INVALID_DATE_RANGE');
  });
});

describe('신청 기한 assertBeforeDeadline (시작일의 직전 영업일 17:00:00까지)', () => {
  it('월요일 연차는 금요일 17:00:00까지 된다', () => {
    expect(
      codeOf(() =>
        assertBeforeDeadline(kstAt('2026-11-13', '17:00:00'), '2026-11-16'),
      ),
    ).toBe('OK');
  });

  it('금요일 17:00:01부터는 REQUEST_DEADLINE_PASSED', () => {
    expect(
      codeOf(() =>
        assertBeforeDeadline(kstAt('2026-11-13', '17:00:01'), '2026-11-16'),
      ),
    ).toBe('REQUEST_DEADLINE_PASSED');
  });

  it('설 연휴 다음 날(2/19) 신청은 연휴 전 영업일(2/13) 17:00까지', () => {
    expect(
      codeOf(() =>
        assertBeforeDeadline(kstAt('2026-02-16', '09:00:00'), '2026-02-19'),
      ),
    ).toBe('REQUEST_DEADLINE_PASSED');
    expect(
      codeOf(() =>
        assertBeforeDeadline(kstAt('2026-02-13', '16:59:59'), '2026-02-19'),
      ),
    ).toBe('OK');
  });

  it('토요일 주말 근무는 금요일 17:00까지', () => {
    expect(
      codeOf(() =>
        assertBeforeDeadline(kstAt('2026-11-13', '17:00:01'), '2026-11-14'),
      ),
    ).toBe('REQUEST_DEADLINE_PASSED');
  });
});

describe('재택 한도 isRemoteOverLimit (그달 2회, 달마다 따로)', () => {
  it('이번 달 1회 썼으면 1일 더는 한도 안이다', () => {
    expect(isRemoteOverLimit(['2026-11-20'], { '2026-11': 1 })).toBe(false);
  });

  it('이번 달 2회 썼으면 1일 더는 예외 신청이다', () => {
    expect(isRemoteOverLimit(['2026-11-20'], { '2026-11': 2 })).toBe(true);
  });

  it('한 번에 3일이면 예외 신청이다', () => {
    expect(
      isRemoteOverLimit(['2026-11-18', '2026-11-19', '2026-11-20'], {}),
    ).toBe(true);
  });

  it('월을 넘는 기간은 달마다 따로 센다 (11월 2일 + 12월 2일 → 한도 안)', () => {
    expect(
      isRemoteOverLimit(
        ['2026-11-27', '2026-11-30', '2026-12-01', '2026-12-02'],
        {},
      ),
    ).toBe(false);
  });

  it('달 하나라도 넘으면 신청서 전체가 예외 (11월 2일 + 12월 3일)', () => {
    expect(
      isRemoteOverLimit(
        ['2026-11-27', '2026-11-30', '2026-12-01', '2026-12-02', '2026-12-03'],
        {},
      ),
    ).toBe(true);
  });
});
