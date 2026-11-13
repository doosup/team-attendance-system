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
      reason: '',
      ip: null,
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
        reason: '',
        ip: null,
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
