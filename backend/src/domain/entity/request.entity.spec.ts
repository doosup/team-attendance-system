import { CustomException } from '../exception/custom.exception';
import { KIM, LEAD } from '../../../test/fakes/users';
import { Request } from './request.entity';

const NOW = new Date('2026-11-12T01:00:00Z');
const pending = () => {
  const r = Request.submit(
    {
      type: 'ANNUAL',
      startDate: '2026-11-16',
      endDate: '2026-11-16',
      isOverLimit: false,
      isAfterDeadline: false,
      reason: '',
      ip: null,
      halfOffPart: null,
      startTime: null,
      endTime: null,
    },
    KIM,
    ['2026-11-16'],
    NOW,
  );
  return new Request({ ...r.props, id: 1 });
};
const codeOf = (fn: () => void) => {
  try {
    fn();
    return 'OK';
  } catch (e) {
    return (e as CustomException).code;
  }
};

describe('Request 상태 전이', () => {
  it('대기 → 승인: 승인한 리드와 시각을 기록한다', () => {
    const r = pending();
    r.approve(LEAD.id, NOW);
    expect(r.props).toMatchObject({
      status: 'APPROVED',
      decidedById: LEAD.id,
      decidedAt: NOW,
    });
  });

  it('대기 → 반려: 사유를 기록한다', () => {
    const r = pending();
    r.reject(LEAD.id, '팀 일정과 겹침', NOW);
    expect(r.props).toMatchObject({
      status: 'REJECTED',
      rejectReason: '팀 일정과 겹침',
    });
  });

  it('이미 처리된 신청은 다시 승인·반려할 수 없다 (INVALID_STATUS_TRANSITION)', () => {
    const r = pending();
    r.approve(LEAD.id, NOW);
    expect(codeOf(() => r.approve(LEAD.id, NOW))).toBe(
      'INVALID_STATUS_TRANSITION',
    );
    expect(codeOf(() => r.reject(LEAD.id, '사유', NOW))).toBe(
      'INVALID_STATUS_TRANSITION',
    );
  });
});

describe('Request 취소', () => {
  const twoDays = () => {
    const r = Request.submit(
      {
        type: 'ANNUAL',
        startDate: '2026-11-13',
        endDate: '2026-11-16',
        isOverLimit: false,
        isAfterDeadline: false,
        reason: '',
        ip: null,
        halfOffPart: null,
        startTime: null,
        endTime: null,
      },
      KIM,
      ['2026-11-13', '2026-11-16'],
      NOW,
    );
    return new Request({
      ...r.props,
      id: 1,
      days: r.props.days.map((d, i) => ({ ...d, id: 11 + i })),
    });
  };

  it('본인 취소는 신청서와 모든 날짜를 CANCELED로 바꾸고 취소한 날짜 id를 돌려준다', () => {
    const r = twoDays();
    expect(r.cancelBySelf(KIM.id, NOW)).toEqual([11, 12]);
    expect(r.props.status).toBe('CANCELED');
    expect(r.props.days.map((d) => [d.status, d.cancelType])).toEqual([
      ['CANCELED', 'SELF_BEFORE_DEADLINE'],
      ['CANCELED', 'SELF_BEFORE_DEADLINE'],
    ]);
  });

  it('반려·취소된 신청은 다시 취소할 수 없다', () => {
    const r = twoDays();
    r.reject(LEAD.id, '사유', NOW);
    expect(codeOf(() => r.cancelBySelf(KIM.id, NOW))).toBe(
      'INVALID_STATUS_TRANSITION',
    );
  });

  it('리드 당일 취소는 그날 하루만 바꾸고 신청서는 승인 상태로 둔다', () => {
    const r = twoDays();
    r.approve(LEAD.id, NOW);
    expect(r.cancelDay('2026-11-16', LEAD.id, '장애 대응', NOW)).toBe(12);
    expect(r.props.status).toBe('APPROVED');
    expect(r.props.days.map((d) => d.status)).toEqual(['ACTIVE', 'CANCELED']);
    expect(r.props.days[1]).toMatchObject({
      cancelType: 'LEAD_SAME_DAY',
      canceledById: LEAD.id,
      cancelReason: '장애 대응',
    });
  });

  it('당일 취소는 승인된 신청의 살아 있는 날짜만 된다', () => {
    const r = twoDays();
    expect(codeOf(() => r.cancelDay('2026-11-16', LEAD.id, '사유', NOW))).toBe(
      'INVALID_STATUS_TRANSITION',
    );
    r.approve(LEAD.id, NOW);
    r.cancelDay('2026-11-16', LEAD.id, '사유', NOW);
    expect(codeOf(() => r.cancelDay('2026-11-16', LEAD.id, '사유', NOW))).toBe(
      'INVALID_STATUS_TRANSITION',
    );
    expect(codeOf(() => r.cancelDay('2026-11-14', LEAD.id, '사유', NOW))).toBe(
      'REQUEST_NOT_FOUND',
    );
  });
});

describe('Request 퇴사 처리 자동 취소', () => {
  // 11/13(금)~11/17(화) 연차: 영업일 11/13, 11/16, 11/17
  const spanning = (status: 'PENDING' | 'APPROVED' = 'APPROVED') => {
    const r = Request.submit(
      {
        type: 'ANNUAL',
        startDate: '2026-11-13',
        endDate: '2026-11-17',
        isOverLimit: false,
        isAfterDeadline: false,
        reason: '',
        ip: null,
        halfOffPart: null,
        startTime: null,
        endTime: null,
      },
      KIM,
      ['2026-11-13', '2026-11-16', '2026-11-17'],
      NOW,
    );
    return new Request({
      ...r.props,
      id: 1,
      status,
      days: r.props.days.map((d, i) => ({ ...d, id: 10 + i })),
    });
  };

  it('내일 이후의 살아 있는 날짜만 RETIREMENT로 취소하고 그 id를 돌려준다', () => {
    const r = spanning();

    const ids = r.cancelForRetirement(LEAD.id, '2026-11-13', NOW);

    expect(ids).toEqual([11, 12]);
    expect(r.props.days.map((d) => [d.date, d.status, d.cancelType])).toEqual([
      ['2026-11-13', 'ACTIVE', null],
      ['2026-11-16', 'CANCELED', 'RETIREMENT'],
      ['2026-11-17', 'CANCELED', 'RETIREMENT'],
    ]);
    expect(r.props.days[1]).toMatchObject({
      canceledById: LEAD.id,
      canceledAt: NOW,
    });
  });

  it('오늘·지난 날짜가 남으면 신청서 상태는 그대로다', () => {
    const r = spanning();
    r.cancelForRetirement(LEAD.id, '2026-11-13', NOW);
    expect(r.props.status).toBe('APPROVED');
  });

  it('모든 날짜가 내일 이후면 신청서도 CANCELED가 된다', () => {
    const r = spanning('PENDING');
    expect(r.cancelForRetirement(LEAD.id, '2026-11-12', NOW)).toEqual([
      10, 11, 12,
    ]);
    expect(r.props.status).toBe('CANCELED');
  });

  it('승인 전(대기) 신청은 효력이 없으므로 오늘·지난 날짜까지 모두 취소한다', () => {
    const r = spanning('PENDING');
    expect(r.cancelForRetirement(LEAD.id, '2026-11-16', NOW)).toEqual([
      10, 11, 12,
    ]);
    expect(r.props.status).toBe('CANCELED');
  });

  it('이미 끝난 신청은 아무것도 바꾸지 않는다', () => {
    const r = spanning();
    expect(r.cancelForRetirement(LEAD.id, '2026-11-17', NOW)).toEqual([]);
    expect(r.props.status).toBe('APPROVED');
  });
});

describe('Request.changeAccess (리드의 IP·시간대 변경, A23)', () => {
  const weekend = (dates = ['2026-11-21']) => {
    const r = Request.submit(
      {
        type: 'WEEKEND_WORK',
        startDate: dates[0],
        endDate: dates.at(-1)!,
        isOverLimit: false,
        isAfterDeadline: false,
        reason: '',
        ip: '10.0.0.7',
        halfOffPart: null,
        startTime: '09:00',
        endTime: '18:00',
      },
      KIM,
      dates,
      NOW,
    );
    return new Request({
      ...r.props,
      id: 1,
      days: r.props.days.map((d, i) => ({ ...d, id: i + 1 })),
    });
  };
  const access = { ip: '10.0.0.8', startTime: '09:00', endTime: '18:00' };

  it('대기 중인 주말 근무도 바꿀 수 있고, 누가·언제·왜를 남긴다', () => {
    const r = weekend();
    const before = r.changeAccess(LEAD.id, access, '오타', '2026-11-20', NOW);
    expect(before).toEqual({
      ip: '10.0.0.7',
      startTime: '09:00',
      endTime: '18:00',
    });
    expect(r.props).toMatchObject({
      ip: '10.0.0.8',
      accessChangedById: LEAD.id,
      accessChangedAt: NOW,
      accessChangeReason: '오타',
    });
  });

  it('남은 날이 오늘뿐인데 그날이 취소됐으면 ACCESS_CHANGE_NOT_ALLOWED', () => {
    const r = weekend();
    r.approve(LEAD.id, NOW);
    r.cancelDay('2026-11-21', LEAD.id, '취소', NOW);
    expect(
      codeOf(() => r.changeAccess(LEAD.id, access, '오타', '2026-11-21', NOW)),
    ).toBe('ACCESS_CHANGE_NOT_ALLOWED');
  });

  it('시작과 종료가 같으면 VALIDATION_FAILED', () => {
    expect(
      codeOf(() =>
        weekend().changeAccess(
          LEAD.id,
          { ip: '10.0.0.8', startTime: '09:00', endTime: '09:00' },
          '오타',
          '2026-11-20',
          NOW,
        ),
      ),
    ).toBe('VALIDATION_FAILED');
  });

  it('바뀐 것이 없으면 VALIDATION_FAILED (변경 표시·이력을 남기지 않음)', () => {
    expect(
      codeOf(() =>
        weekend().changeAccess(
          LEAD.id,
          { ip: '10.0.0.7', startTime: '09:00', endTime: '18:00' },
          '확인',
          '2026-11-20',
          NOW,
        ),
      ),
    ).toBe('VALIDATION_FAILED');
  });
});
