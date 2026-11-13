import { DayRequest } from '../repository/request-day.repository';
import { kstAt } from '../value/work-date';
import {
  assertCheckOutTime,
  expectedCheckOutAt,
  includesLunch,
  judgeCheckIn,
  judgeWork,
  resolveDay,
} from './attendance.policy';

const D = '2026-11-13';
const at = (time: string) => kstAt(D, time);
const codeOf = (fn: () => unknown) => {
  try {
    fn();
    return 'OK';
  } catch (e) {
    return (e as { code: string }).code;
  }
};

describe('출근 판정 judgeCheckIn', () => {
  it('06:59:59 출근은 거부한다 (CHECK_IN_TOO_EARLY)', () => {
    expect(codeOf(() => judgeCheckIn(at('06:59:59'), 'FULL_DAY'))).toBe(
      'CHECK_IN_TOO_EARLY',
    );
  });

  it('07:00:00 출근은 등록된다', () => {
    expect(judgeCheckIn(at('07:00:00'), 'FULL_DAY')).toEqual({ isLate: false });
  });

  it('10:00:00 출근은 정상이다', () => {
    expect(judgeCheckIn(at('10:00:00'), 'FULL_DAY').isLate).toBe(false);
  });

  it('10:00:01 출근은 지각이다', () => {
    expect(judgeCheckIn(at('10:00:01'), 'FULL_DAY').isLate).toBe(true);
  });

  it.each(['HALF_DAY_OFF', 'EMERGENCY_WORK', 'WEEKEND_WORK'] as const)(
    '%s 날은 늦게 와도 지각이 아니다',
    (dayType) => {
      expect(judgeCheckIn(at('13:00:00'), dayType).isLate).toBe(false);
    },
  );

  it('반일 OFF 날도 07:00 전에는 등록할 수 없다', () => {
    expect(codeOf(() => judgeCheckIn(at('06:59:59'), 'HALF_DAY_OFF'))).toBe(
      'CHECK_IN_TOO_EARLY',
    );
  });
});

describe('그날 근무 유형 resolveDay', () => {
  const day = (p: Partial<DayRequest>): DayRequest => ({
    requestDayId: 10,
    type: 'REMOTE',
    requestStatus: 'APPROVED',
    dayStatus: 'ACTIVE',
    cancelType: null,
    ...p,
  });

  it('신청이 없는 영업일은 일반 근무다', () => {
    expect(resolveDay([], true)).toEqual({
      kind: 'FULL_DAY',
      requestDayId: null,
    });
  });

  it('승인된 재택은 일반 근무 규칙이고 신청 날짜와 연결된다', () => {
    expect(resolveDay([day({ type: 'REMOTE' })], true)).toEqual({
      kind: 'FULL_DAY',
      requestDayId: 10,
    });
  });

  it('승인된 반일 OFF 날은 HALF_DAY_OFF', () => {
    expect(resolveDay([day({ type: 'HALF_OFF' })], true).kind).toBe(
      'HALF_DAY_OFF',
    );
  });

  it('대기 중인 반일 OFF는 승인 전이라 일반 근무다', () => {
    expect(
      resolveDay([day({ type: 'HALF_OFF', requestStatus: 'PENDING' })], true)
        .kind,
    ).toBe('FULL_DAY');
  });

  it('승인된 연차일은 ANNUAL_LEAVE (출근 대상 아님)', () => {
    expect(resolveDay([day({ type: 'ANNUAL' })], true).kind).toBe(
      'ANNUAL_LEAVE',
    );
  });

  it('리드가 당일 취소한 날은 긴급 출근(EMERGENCY_WORK)', () => {
    expect(
      resolveDay(
        [
          day({
            type: 'ANNUAL',
            dayStatus: 'CANCELED',
            cancelType: 'LEAD_SAME_DAY',
          }),
        ],
        true,
      ).kind,
    ).toBe('EMERGENCY_WORK');
  });

  it('본인이 미리 취소한 날은 일반 근무다', () => {
    expect(
      resolveDay(
        [
          day({
            type: 'ANNUAL',
            requestStatus: 'CANCELED',
            dayStatus: 'CANCELED',
            cancelType: 'SELF_BEFORE_DEADLINE',
          }),
        ],
        true,
      ),
    ).toEqual({ kind: 'FULL_DAY', requestDayId: null });
  });

  it('주말에 승인된 주말 근무가 있으면 WEEKEND_WORK', () => {
    expect(resolveDay([day({ type: 'WEEKEND_WORK' })], false).kind).toBe(
      'WEEKEND_WORK',
    );
  });

  it('주말에 승인된 신청이 없으면 DAY_OFF (출근 대상 아님)', () => {
    expect(
      resolveDay(
        [day({ type: 'WEEKEND_WORK', requestStatus: 'PENDING' })],
        false,
      ).kind,
    ).toBe('DAY_OFF');
  });
});

describe('정상 퇴근 가능 시각 expectedCheckOutAt', () => {
  it.each([
    ['일반일 07:00 출근 → 16:00', 'FULL_DAY', '07:00:00', '16:00:00'],
    ['일반일 09:00 출근 → 점심 포함 18:00', 'FULL_DAY', '09:00:00', '18:00:00'],
    ['일반일 12:11 출근 → 점심 없음 20:11', 'FULL_DAY', '12:11:00', '20:11:00'],
    ['반일 OFF 07:00 → 11:00', 'HALF_DAY_OFF', '07:00:00', '11:00:00'],
    ['반일 OFF 12:30 → 16:30', 'HALF_DAY_OFF', '12:30:00', '16:30:00'],
    [
      '반일 OFF 11:00 → 점심 포함 16:00',
      'HALF_DAY_OFF',
      '11:00:00',
      '16:00:00',
    ],
    [
      '반일 OFF 10:00 → 점심 포함 15:00',
      'HALF_DAY_OFF',
      '10:00:00',
      '15:00:00',
    ],
    [
      '반일 OFF 08:45 → 12:45에는 점심이 다 들어가 13:45',
      'HALF_DAY_OFF',
      '08:45:00',
      '13:45:00',
    ],
  ] as const)('%s', (_, dayType, checkIn, expected) => {
    expect(expectedCheckOutAt(at(checkIn), dayType)).toEqual(at(expected));
  });

  it.each(['EMERGENCY_WORK', 'WEEKEND_WORK'] as const)(
    '%s 날은 조퇴 판정이 없어 정상 퇴근 시각도 없다',
    (dayType) => {
      expect(expectedCheckOutAt(at('09:00:00'), dayType)).toBeNull();
    },
  );
});

describe('점심 구간 포함 includesLunch (11:30~12:30 전체가 들어갈 때만)', () => {
  it.each([
    ['11:30:00 → 12:30:00 (딱 맞음)', '11:30:00', '12:30:00', true],
    ['09:00:00 → 18:00:00', '09:00:00', '18:00:00', true],
    ['11:30:01 → 18:00:00 (시작이 1초 늦음)', '11:30:01', '18:00:00', false],
    ['09:00:00 → 12:29:59 (끝이 1초 이름)', '09:00:00', '12:29:59', false],
    ['12:11:00 → 20:00:00 (점심 먹고 출근)', '12:11:00', '20:00:00', false],
  ])('%s → %s', (_, from, to, expected) => {
    expect(includesLunch(at(from), at(to))).toBe(expected);
  });
});

describe('퇴근 시각 제한 assertCheckOutTime', () => {
  it('일반일 15:59:59 퇴근은 거부한다 (CHECK_OUT_TOO_EARLY)', () => {
    expect(codeOf(() => assertCheckOutTime(at('15:59:59'), 'FULL_DAY'))).toBe(
      'CHECK_OUT_TOO_EARLY',
    );
  });

  it('일반일 16:00:00 퇴근은 등록된다', () => {
    expect(codeOf(() => assertCheckOutTime(at('16:00:00'), 'FULL_DAY'))).toBe(
      'OK',
    );
  });

  it.each(['HALF_DAY_OFF', 'EMERGENCY_WORK', 'WEEKEND_WORK'] as const)(
    '%s 날은 16:00 전에도 퇴근할 수 있다',
    (dayType) => {
      expect(codeOf(() => assertCheckOutTime(at('11:00:00'), dayType))).toBe(
        'OK',
      );
    },
  );
});

describe('근무시간·조퇴 judgeWork', () => {
  it.each([
    [
      '일반일 09:00→18:00 = 8시간(점심 차감), 정상',
      'FULL_DAY',
      '09:00:00',
      '18:00:00',
      480,
      false,
    ],
    [
      '일반일 09:00→17:59:59 = 7시간 59분, 조퇴',
      'FULL_DAY',
      '09:00:00',
      '17:59:59',
      479,
      true,
    ],
    [
      '일반일 12:11→20:11 = 점심 안 겹쳐 8시간, 정상',
      'FULL_DAY',
      '12:11:00',
      '20:11:00',
      480,
      false,
    ],
    [
      '일반일 07:00→16:00 = 8시간, 정상',
      'FULL_DAY',
      '07:00:00',
      '16:00:00',
      480,
      false,
    ],
    [
      '반일 OFF 07:00→11:00 = 4시간, 정상',
      'HALF_DAY_OFF',
      '07:00:00',
      '11:00:00',
      240,
      false,
    ],
    [
      '반일 OFF 12:30→16:30 = 4시간, 정상',
      'HALF_DAY_OFF',
      '12:30:00',
      '16:30:00',
      240,
      false,
    ],
    [
      '반일 OFF 11:00→16:00 = 점심 차감 4시간, 정상',
      'HALF_DAY_OFF',
      '11:00:00',
      '16:00:00',
      240,
      false,
    ],
    [
      '반일 OFF 10:00→14:00 = 점심 차감 3시간, 조퇴',
      'HALF_DAY_OFF',
      '10:00:00',
      '14:00:00',
      180,
      true,
    ],
    [
      '긴급 출근 10:00→12:00 = 2시간, 조퇴 판정 없음',
      'EMERGENCY_WORK',
      '10:00:00',
      '12:00:00',
      120,
      false,
    ],
    [
      '주말 근무 10:00→13:00 = 점심 차감 2시간, 조퇴 판정 없음',
      'WEEKEND_WORK',
      '10:00:00',
      '13:00:00',
      120,
      false,
    ],
  ] as const)('%s', (_, dayType, from, to, minutes, early) => {
    expect(judgeWork(at(from), at(to), dayType)).toEqual({
      workedMinutes: minutes,
      isEarlyLeave: early,
    });
  });
});
