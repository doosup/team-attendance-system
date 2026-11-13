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
