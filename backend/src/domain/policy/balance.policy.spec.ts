import { LedgerEntry } from '../entity/ledger-entry.entity';
import {
  annualAccrualDates,
  balanceOf,
  dueEvents,
  offExpiresOn,
  offGrants,
  pickOffGrant,
  restoreDrafts,
} from './balance.policy';

let seq = 1;
const entry = (p: Partial<LedgerEntry['props']>): LedgerEntry =>
  new LedgerEntry({
    id: seq++,
    userId: 2,
    kind: 'ANNUAL',
    event: 'ACCRUE',
    halfDays: 2,
    effectiveDate: '2026-02-01',
    expiresOn: null,
    grantId: null,
    requestDayId: null,
    dedupKey: null,
    ...p,
  });
const offGrant = (id: number, date: string) =>
  entry({
    id,
    kind: 'HALF_OFF',
    event: 'ACCRUE',
    halfDays: 1,
    effectiveDate: date,
    expiresOn: offExpiresOn(date),
  });

describe('연차 적립일 annualAccrualDates', () => {
  it('입사 당일엔 적립되지 않고 1개월 뒤부터 매월 입사일과 같은 날 (김근태 1/1 입사)', () => {
    expect(annualAccrualDates('2026-01-01', '2026-04-15')).toEqual([
      '2026-02-01',
      '2026-03-01',
      '2026-04-01',
    ]);
  });

  it('적립일 당일은 포함한다 (연차원 1/15 입사, 오늘 2/15)', () => {
    expect(annualAccrualDates('2026-01-15', '2026-02-15')).toEqual([
      '2026-02-15',
    ]);
  });

  it('적립일 전날까지는 없다 (2/14)', () => {
    expect(annualAccrualDates('2026-01-15', '2026-02-14')).toEqual([]);
  });

  it('그 날짜가 없는 달은 말일에 적립한다 (1/31 입사 → 2/28, 3/31, 4/30)', () => {
    expect(annualAccrualDates('2026-01-31', '2026-04-30')).toEqual([
      '2026-02-28',
      '2026-03-31',
      '2026-04-30',
    ]);
  });
});

describe('반일 OFF 만료 offExpiresOn', () => {
  it('지급일 + 30일이 마지막 사용 가능일이다', () => {
    expect(offExpiresOn('2026-11-01')).toBe('2026-12-01');
  });
});

describe('잔여 balanceOf (반일 단위)', () => {
  it('연차는 적립·사용·복원을 합산한다', () => {
    const entries = [
      entry({ effectiveDate: '2026-02-01' }),
      entry({ effectiveDate: '2026-03-01' }),
      entry({ event: 'USE', halfDays: -2, effectiveDate: '2026-03-10' }),
      entry({ event: 'RESTORE', halfDays: 2, effectiveDate: '2026-03-10' }),
      entry({ event: 'USE', halfDays: -2, effectiveDate: '2026-03-11' }),
    ];
    expect(balanceOf(entries, '2026-03-05').annual).toBe(2);
  });

  it('사용은 신청 시 차감하므로 미래 날짜의 사용도 바로 뺀다', () => {
    const entries = [
      entry({ effectiveDate: '2026-02-01' }),
      entry({ event: 'USE', halfDays: -2, effectiveDate: '2026-12-24' }),
    ];
    expect(balanceOf(entries, '2026-03-01').annual).toBe(0);
  });

  it('시계를 되돌리면 그 뒤의 적립은 아직 없는 것으로 본다', () => {
    const entries = [
      entry({ effectiveDate: '2026-02-01' }),
      entry({ effectiveDate: '2026-03-01' }),
    ];
    expect(balanceOf(entries, '2026-02-15').annual).toBe(2);
  });

  it('반일 OFF는 따로 합산한다', () => {
    const entries = [entry({}), offGrant(100, '2026-11-01')];
    expect(balanceOf(entries, '2026-11-02')).toEqual({ annual: 2, halfOff: 1 });
  });
});

describe('OFF 지급분별 남은 수 offGrants', () => {
  it('사용·복원을 지급분에 연결해 센다', () => {
    const entries = [
      offGrant(100, '2026-11-01'),
      entry({ kind: 'HALF_OFF', event: 'USE', halfDays: -1, grantId: 100 }),
      entry({ kind: 'HALF_OFF', event: 'RESTORE', halfDays: 1, grantId: 100 }),
    ];
    expect(offGrants(entries, '2026-11-02')).toEqual([
      { grantId: 100, expiresOn: '2026-12-01', remaining: 1 },
    ]);
  });
});

describe('사용할 OFF 고르기 pickOffGrant (만료 임박 순, 결정 6)', () => {
  it('만료가 가까운 것부터 쓴다', () => {
    const entries = [offGrant(200, '2026-11-10'), offGrant(100, '2026-11-01')];
    expect(pickOffGrant(entries, '2026-11-20', '2026-11-12')).toBe(100);
  });

  it('나중에 기록된 지급분이라도 만료가 더 가까우면 먼저 쓴다 (주말 근무 퇴근을 다음 출근 때 직접 입력한 경우)', () => {
    const entries = [offGrant(100, '2026-11-10'), offGrant(200, '2026-11-01')];
    expect(pickOffGrant(entries, '2026-11-20', '2026-11-12')).toBe(200);
  });

  it('다 쓴 지급분은 건너뛴다', () => {
    const entries = [
      offGrant(100, '2026-11-01'),
      offGrant(200, '2026-11-10'),
      entry({ kind: 'HALF_OFF', event: 'USE', halfDays: -1, grantId: 100 }),
    ];
    expect(pickOffGrant(entries, '2026-11-20', '2026-11-12')).toBe(200);
  });

  it('사용일에 이미 만료되는 지급분은 쓸 수 없다', () => {
    const entries = [offGrant(100, '2026-11-01')]; // 12/1까지
    expect(pickOffGrant(entries, '2026-12-02', '2026-11-05')).toBeNull();
    expect(pickOffGrant(entries, '2026-12-01', '2026-11-05')).toBe(100);
  });
});

describe('채워 넣을 이벤트 dueEvents (조회 시 동기화)', () => {
  it('빠진 연차 적립을 dedupKey와 함께 만든다', () => {
    const existing = [
      entry({
        effectiveDate: '2026-02-01',
        dedupKey: 'ACCRUE:ANNUAL:2:2026-02-01',
      }),
    ];
    const due = dueEvents(2, '2026-01-01', existing, '2026-03-01');
    expect(due.map((d) => d.dedupKey)).toEqual(['ACCRUE:ANNUAL:2:2026-03-01']);
    expect(due[0]).toMatchObject({
      kind: 'ANNUAL',
      event: 'ACCRUE',
      halfDays: 2,
    });
  });

  it('만료일이 지난 OFF의 남은 수만큼 만료 이벤트를 만든다 (만료 다음 날)', () => {
    const existing = [offGrant(100, '2026-11-01')]; // 12/1까지
    expect(dueEvents(2, '2026-11-15', existing, '2026-12-01')).toEqual([]);
    expect(dueEvents(2, '2026-11-15', existing, '2026-12-02')).toEqual([
      {
        userId: 2,
        kind: 'HALF_OFF',
        event: 'EXPIRE',
        halfDays: -1,
        effectiveDate: '2026-12-02',
        expiresOn: null,
        grantId: 100,
        requestDayId: null,
        dedupKey: 'EXPIRE:HALF_OFF:100:1',
      },
    ]);
  });

  it('이미 쓴 OFF는 만료되지 않는다', () => {
    const existing = [
      offGrant(100, '2026-11-01'),
      entry({ kind: 'HALF_OFF', event: 'USE', halfDays: -1, grantId: 100 }),
    ];
    expect(dueEvents(2, '2026-11-15', existing, '2026-12-10')).toEqual([]);
  });
});

describe('복원 restoreDrafts (반려·취소된 날짜만, 원래 지급분·만료 유지)', () => {
  it('사용한 날짜 행마다 같은 양을 되돌리고 OFF는 같은 지급분에 연결한다', () => {
    const entries = [
      entry({
        id: 1,
        event: 'USE',
        halfDays: -2,
        requestDayId: 11,
        effectiveDate: '2026-11-13',
      }),
      entry({
        id: 2,
        event: 'USE',
        halfDays: -2,
        requestDayId: 12,
        effectiveDate: '2026-11-16',
      }),
      entry({
        id: 3,
        kind: 'HALF_OFF',
        event: 'USE',
        halfDays: -1,
        grantId: 100,
        requestDayId: 13,
      }),
    ];
    expect(restoreDrafts(entries, [11, 13])).toEqual([
      expect.objectContaining({
        kind: 'ANNUAL',
        event: 'RESTORE',
        halfDays: 2,
        requestDayId: 11,
        grantId: null,
      }),
      expect.objectContaining({
        kind: 'HALF_OFF',
        event: 'RESTORE',
        halfDays: 1,
        requestDayId: 13,
        grantId: 100,
      }),
    ]);
  });

  it('이미 복원한 날짜는 다시 복원하지 않는다', () => {
    const entries = [
      entry({ event: 'USE', halfDays: -2, requestDayId: 11 }),
      entry({ event: 'RESTORE', halfDays: 2, requestDayId: 11 }),
    ];
    expect(restoreDrafts(entries, [11])).toEqual([]);
  });

  it('차감이 없는 신청(재택·주말 근무)은 복원할 것이 없다', () => {
    expect(restoreDrafts([], [21, 22])).toEqual([]);
  });
});

// 만료가 빼는 양은 저장된 숫자가 아니라 "만료일이 온 그 시점에 남은 만큼" (ATT-50).
// 시계를 미래로 옮겨 만료가 기록된 뒤 과거로 돌아와 같은 OFF를 써도 음수가 되지 않게
describe('시계를 앞뒤로 옮겨도 OFF 잔여는 음수가 되지 않는다 (ATT-50)', () => {
  // 11/21 지급(12/21까지) → 미래(1/4)에서 만료 기록(-1, 12/22) → 과거(12/16)로 와서 12/21 사용
  const timeTravel = () => [
    offGrant(100, '2026-11-21'),
    entry({
      kind: 'HALF_OFF',
      event: 'EXPIRE',
      halfDays: -1,
      effectiveDate: '2026-12-22',
      grantId: 100,
      dedupKey: 'EXPIRE:HALF_OFF:100:1',
    }),
    entry({
      kind: 'HALF_OFF',
      event: 'USE',
      halfDays: -1,
      effectiveDate: '2026-12-21',
      grantId: 100,
    }),
  ];

  it('만료 기록 뒤에 과거 시점에서 같은 OFF를 썼으면, 만료 이후에도 잔여는 0이다 (-1 아님)', () => {
    expect(balanceOf(timeTravel(), '2026-12-23').halfOff).toBe(0);
    expect(offGrants(timeTravel(), '2026-12-23')[0].remaining).toBe(0);
  });

  it('만료일 전으로 돌아가면 그 사용만 반영해 0이다', () => {
    expect(balanceOf(timeTravel(), '2026-12-16').halfOff).toBe(0);
  });

  it('쓰지 않은 OFF는 만료일 다음 날부터 남은 만큼 사라진다 (평소와 같음)', () => {
    const entries = [
      offGrant(100, '2026-11-21'),
      entry({
        kind: 'HALF_OFF',
        event: 'EXPIRE',
        halfDays: -1,
        effectiveDate: '2026-12-22',
        grantId: 100,
      }),
    ];
    expect(balanceOf(entries, '2026-12-21').halfOff).toBe(1);
    expect(balanceOf(entries, '2026-12-22').halfOff).toBe(0);
  });

  it('지급일 전으로 되돌리면 그 지급분과 그것을 쓴 기록이 함께 빠져 음수가 아니다', () => {
    const entries = [
      offGrant(100, '2026-11-21'),
      entry({
        kind: 'HALF_OFF',
        event: 'USE',
        halfDays: -1,
        effectiveDate: '2026-11-24',
        grantId: 100,
      }),
    ];
    expect(balanceOf(entries, '2026-11-20').halfOff).toBe(0);
  });

  it('만료된 OFF가 나중에 복원돼도 다시 쓸 수 없고 만료 이벤트를 또 만들지 않는다', () => {
    const entries = [
      ...timeTravel(),
      entry({
        kind: 'HALF_OFF',
        event: 'RESTORE',
        halfDays: 1,
        effectiveDate: '2026-12-21',
        grantId: 100,
      }),
    ];
    expect(balanceOf(entries, '2026-12-23').halfOff).toBe(0);
    expect(
      dueEvents(2, '2026-11-15', entries, '2026-12-23').filter(
        (d) => d.kind === 'HALF_OFF',
      ),
    ).toEqual([]);
  });
});
