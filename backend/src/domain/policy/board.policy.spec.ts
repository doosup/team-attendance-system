import { Attendance } from '../entity/attendance.entity';
import { DayRequest } from '../repository/request-day.repository';
import { kstAt } from '../value/work-date';
import { boardStatus } from './board.policy';

const D = '2026-11-16'; // 월
const day = (p: Partial<DayRequest>): DayRequest => ({
  requestDayId: 1,
  type: 'ANNUAL',
  requestStatus: 'APPROVED',
  dayStatus: 'ACTIVE',
  cancelType: null,
  ...p,
});
const attendance = (checkOut?: string) =>
  new Attendance({
    id: 1,
    userId: 2,
    workDate: D,
    dayType: 'FULL_DAY',
    checkInAt: kstAt(D, '09:00:00'),
    isLate: false,
    checkInIp: '127.0.0.1',
    requestDayId: null,
    checkOutAt: checkOut ? kstAt(D, checkOut) : null,
    checkOutSource: checkOut ? 'BUTTON' : null,
    checkOutIp: null,
    isEarlyLeave: checkOut ? false : null,
    workedMinutes: checkOut ? 480 : null,
  });
const now = (time: string) => kstAt(D, time);

describe('팀 보드 상태 boardStatus', () => {
  it('출근했으면 WORKING, 퇴근했으면 LEFT', () => {
    expect(boardStatus(D, attendance(), [], now('11:00:00')).status).toBe(
      'WORKING',
    );
    expect(
      boardStatus(D, attendance('18:00:00'), [], now('19:00:00')).status,
    ).toBe('LEFT');
  });

  it('승인된 재택 날 출근했으면 REMOTE', () => {
    expect(
      boardStatus(D, attendance(), [day({ type: 'REMOTE' })], now('11:00:00'))
        .status,
    ).toBe('REMOTE');
  });

  it('승인된 연차는 ANNUAL, 반일 OFF는 출근 전 HALF_OFF', () => {
    expect(
      boardStatus(D, null, [day({ type: 'ANNUAL' })], now('11:00:00')).status,
    ).toBe('ANNUAL');
    expect(
      boardStatus(D, null, [day({ type: 'HALF_OFF' })], now('11:00:00')).status,
    ).toBe('HALF_OFF');
  });

  it('대상일에 승인 대기 중이면 PENDING_APPROVAL (결정 14)', () => {
    expect(
      boardStatus(D, null, [day({ requestStatus: 'PENDING' })], now('11:00:00'))
        .status,
    ).toBe('PENDING_APPROVAL');
  });

  it('영업일에 기록이 없으면 NOT_CHECKED_IN, 10:00:01부터 리드용 강조', () => {
    expect(boardStatus(D, null, [], now('10:00:00'))).toMatchObject({
      status: 'NOT_CHECKED_IN',
      pastTen: false,
    });
    expect(boardStatus(D, null, [], now('10:00:01')).pastTen).toBe(true);
  });

  it('지난 날짜는 시각과 무관하게 10시가 지난 것으로 본다', () => {
    expect(boardStatus('2026-11-13', null, [], now('08:00:00')).pastTen).toBe(
      true,
    );
  });

  it('주말에 기록·신청이 없으면 DAY_OFF', () => {
    expect(boardStatus('2026-11-14', null, [], now('11:00:00')).status).toBe(
      'DAY_OFF',
    );
  });

  it('리드가 당일 취소한 날 출근 전이면 NOT_CHECKED_IN (긴급 출근 대상)', () => {
    expect(
      boardStatus(
        D,
        null,
        [day({ dayStatus: 'CANCELED', cancelType: 'LEAD_SAME_DAY' })],
        now('11:00:00'),
      ).status,
    ).toBe('NOT_CHECKED_IN');
  });
});
