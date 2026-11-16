import type { AuditAction, AuditLog } from '@/api/types';
import {
  DAY_TYPE,
  kstDateTime,
  kstTime,
  minutesText,
  REQUEST_TYPE,
} from '@/format';

// 인터랙션 이력을 사람이 읽는 말로 (ATT-38). 원본 payload는 화면의 "원본"에서 그대로 볼 수 있다
export const ACTION_LABEL: Record<AuditAction, string> = {
  CHECK_IN: '출근',
  CHECK_OUT: '퇴근',
  MANUAL_CHECK_OUT: '퇴근 직접 입력',
  REQUEST_CREATE: '신청',
  REQUEST_CANCEL: '신청 취소',
  REQUEST_DAY_CANCEL: '당일 취소',
  REQUEST_APPROVE: '승인',
  REQUEST_REJECT: '반려',
  LOGIN: '로그인',
  LOGIN_FAIL: '로그인 실패',
  IP_BLOCKED: '접속 차단',
  ALLOWED_IP_ADD: '연구실 IP 추가',
  ALLOWED_IP_DELETE: '연구실 IP 삭제',
  CLOCK_CHANGE: '현재 시각 변경',
  USER_CREATE: '팀원 등록',
  USER_RETIRE: '퇴사 처리',
  REQUEST_ACCESS_CHANGE: '접속 IP 변경',
};

const s = (v: unknown) => (v == null ? '' : String(v));
const join = (...parts: (string | false | null | undefined)[]) =>
  parts.filter(Boolean).join(' · ');
const period = (p: Record<string, unknown>) =>
  p.startDate === p.endDate || !p.endDate
    ? s(p.startDate)
    : `${s(p.startDate)} ~ ${s(p.endDate)}`;
const kind = (p: Record<string, unknown>) =>
  REQUEST_TYPE[s(p.type)] ?? s(p.type);
// 원장은 반일(0.5일) 단위 정수: 반일 OFF는 개수, 연차는 일수로
const restored = (p: Record<string, unknown>) => {
  const h = Number(p.restoredHalfDays ?? 0);
  if (h <= 0) return '';
  return p.type === 'HALF_OFF'
    ? `반일 OFF ${h}개 복원`
    : `잔여 ${h / 2}일 복원`;
};
const exceptions = (p: Record<string, unknown>) =>
  join(
    p.isOverLimit === true && '재택 한도 초과',
    p.isAfterDeadline === true && '기한 후',
  );

/** 이력 한 줄의 내용. nameOf는 신청자 id → 이름 (모르면 #id) */
export function describeLog(
  l: AuditLog,
  nameOf: (id: unknown) => string,
): string {
  const p = l.payload;
  switch (l.action) {
    case 'CHECK_IN':
      return join(
        `${s(p.workDate)} ${kstTime(s(p.checkInAt))} 출근`,
        p.dayType !== 'FULL_DAY' && DAY_TYPE[s(p.dayType)],
        p.isLate === true && '지각',
      );
    case 'CHECK_OUT':
    case 'MANUAL_CHECK_OUT':
      return join(
        `${s(p.workDate)} ${kstTime(s(p.checkOutAt))} 퇴근`,
        p.workedMinutes != null &&
          `근무 ${minutesText(Number(p.workedMinutes))}`,
        p.isEarlyLeave === true && '조퇴',
        p.offGranted === true && '반일 OFF 지급',
      );
    case 'REQUEST_CREATE':
      return join(
        `${kind(p)} ${period(p)}`,
        p.autoApproved === true ? '자동 승인' : '승인 대기',
        exceptions(p),
      );
    case 'REQUEST_CANCEL':
      return join(`${kind(p)} ${period(p)} 전체 취소`, restored(p));
    case 'REQUEST_DAY_CANCEL':
      return join(
        `${nameOf(p.applicantId)}님 ${kind(p)} ${s(p.date)} 하루 취소 (긴급 출근)`,
        `사유: ${s(p.cancelReason)}`,
        restored(p),
      );
    case 'REQUEST_APPROVE':
      return join(
        `${nameOf(p.applicantId)}님 ${kind(p)} ${period(p)} 승인`,
        exceptions(p),
        // 출근 뒤에 승인된 반일 OFF: 그날 출근 기록을 반일 OFF 기준으로 다시 판정 (ATT-48)
        p.convertedAttendance ? '이미 출근한 기록을 반일 OFF로 다시 판정' : '',
      );
    case 'REQUEST_REJECT':
      return join(
        `${nameOf(p.applicantId)}님 ${kind(p)} ${period(p)} 반려`,
        `사유: ${s(p.rejectReason)}`,
        restored(p),
      );
    case 'REQUEST_ACCESS_CHANGE': {
      const access = (v: unknown) => {
        const a = (v ?? {}) as Record<string, unknown>;
        return `${s(a.ip)} ${s(a.startTime)}~${s(a.endTime)}`;
      };
      return join(
        `${nameOf(p.applicantId)}님 ${kind(p)} ${period(p)} 접속 정보 변경: ${access(p.before)} → ${access(p.after)}`,
        `사유: ${s(p.reason)}`,
      );
    }
    case 'LOGIN':
      return `아이디 ${s(p.loginId)}`;
    case 'LOGIN_FAIL':
      return `아이디 ${s(p.loginId)} 로그인 실패`;
    case 'IP_BLOCKED':
      return `등록되지 않은 IP에서 ${s(p.method)} ${s(p.path)} 요청을 막음`;
    case 'ALLOWED_IP_ADD':
    case 'ALLOWED_IP_DELETE':
      return `${s(p.ip)} (${s(p.label)})`;
    case 'CLOCK_CHANGE':
      return p.reset === true
        ? `실제 시각으로 되돌림 (${kstDateTime(s(p.to))})`
        : `${kstDateTime(s(p.from))} → ${kstDateTime(s(p.to))}`;
    case 'USER_CREATE':
      return `${s(p.name)}(${s(p.loginId)}) 등록 · 입사일 ${s(p.joinDate)}`;
    case 'USER_RETIRE':
      return join(
        `${s(p.name)}(${s(p.loginId)}) 퇴사 처리`,
        Number(p.canceledDays) > 0 &&
          `남은 신청 ${s(p.canceledDays)}일 자동 취소`,
        // 연차·반일 OFF 복원을 합친 반일 단위 수라 일수로 바꾸지 않는다
        Number(p.restoredHalfDays) > 0 &&
          `잔여 복원 반일 ${s(p.restoredHalfDays)}개분 (연차 1일 = 반일 2개)`,
      );
    default:
      return JSON.stringify(p);
  }
}
