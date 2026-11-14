import { Injectable } from '@nestjs/common';
import dayjs from 'dayjs';
import { join } from 'node:path';
import PDFDocument from 'pdfkit';
import {
  RequestDocument,
  RequestPdfRenderer,
} from '../../domain/port/request-pdf.port';
import { dayOfWeek } from '../../domain/value/work-date';

// src/·dist/ 어디서 실행해도 backend/assets/fonts (한글은 PDF 기본 글꼴에 없어 나눔고딕을 넣는다)
const FONTS = join(__dirname, '..', '..', '..', 'assets', 'fonts');

const TYPE: Record<RequestDocument['type'], string> = {
  ANNUAL: '연차',
  REMOTE: '재택',
  HALF_OFF: '반일 OFF',
  WEEKEND_WORK: '주말·공휴일 근무',
};
const STATUS: Record<RequestDocument['status'], string> = {
  PENDING: '승인 대기',
  APPROVED: '승인',
  REJECTED: '반려',
  CANCELED: '취소',
};
const WEEKDAY = ['일', '월', '화', '수', '목', '금', '토'];

const kst = (d: Date) =>
  dayjs(d)
    .utcOffset(9 * 60)
    .format('YYYY-MM-DD HH:mm:ss');
const withWeekday = (date: string) => `${date} (${WEEKDAY[dayOfWeek(date)]})`;

/** 정해진 양식: 제목 → 신청 정보 표 → 날짜별 상태 → 결재란 → 발급 시각 */
@Injectable()
export class PdfkitRequestPdfRenderer extends RequestPdfRenderer {
  render(d: RequestDocument): Promise<Buffer> {
    const pdf = new PDFDocument({
      size: 'A4',
      margin: 56,
      info: { Title: `신청서 #${d.requestId}` },
    });
    pdf.registerFont('R', join(FONTS, 'NanumGothic-Regular.ttf'));
    pdf.registerFont('B', join(FONTS, 'NanumGothic-Bold.ttf'));

    const chunks: Buffer[] = [];
    const done = new Promise<Buffer>((resolve, reject) => {
      pdf.on('data', (c: Buffer) => chunks.push(c));
      pdf.on('end', () => resolve(Buffer.concat(chunks)));
      pdf.on('error', reject);
    });

    const left = pdf.page.margins.left;
    const width = pdf.page.width - left - pdf.page.margins.right;
    const labelW = 110;

    pdf
      .font('B')
      .fontSize(20)
      .text(`${TYPE[d.type]} 신청서`, { align: 'center' });
    pdf
      .font('R')
      .fontSize(9)
      .fillColor('#666')
      .text(`문서 번호 REQ-${d.requestId}`, { align: 'center' });
    pdf.fillColor('#000').moveDown(1.5);

    // 표 한 줄: 왼쪽 항목명(굵게, 회색 바탕) | 오른쪽 값
    const row = (label: string, value: string) => {
      const y = pdf.y;
      const h =
        Math.max(
          pdf
            .font('R')
            .fontSize(11)
            .heightOfString(value, { width: width - labelW - 16 }),
          14,
        ) + 12;
      pdf.rect(left, y, labelW, h).fillAndStroke('#f2f4f6', '#c9ced6');
      pdf.rect(left + labelW, y, width - labelW, h).stroke('#c9ced6');
      pdf
        .fillColor('#000')
        .font('B')
        .fontSize(10)
        .text(label, left + 8, y + 7, { width: labelW - 16 });
      pdf
        .font('R')
        .fontSize(11)
        .text(value, left + labelW + 8, y + 6, { width: width - labelW - 16 });
      pdf.x = left;
      pdf.y = y + h;
    };

    row('신청자', d.applicantName);
    row(
      '종류',
      TYPE[d.type] +
        (d.isOverLimit ? ' (재택 한도 초과 예외 신청)' : '') +
        (d.isAfterDeadline ? ' (기한 후 예외 신청)' : ''),
    );
    row(
      '기간',
      d.startDate === d.endDate
        ? withWeekday(d.startDate)
        : `${withWeekday(d.startDate)} ~ ${withWeekday(d.endDate)}`,
    );
    // 쉼표로 이어 써서 긴 연차(20일+)도 몇 줄로 끝나게 한다. 취소된 날만 따로 한 줄씩
    // shortcut: 페이지 넘김 처리 없음 (사유 500자 + 날짜 수십 개까지는 A4 한 장), 한 달 넘는 기간을 받게 되면 행 단위 페이지 넘김 추가
    const active = d.days.filter((x) => x.status !== 'CANCELED');
    const canceled = d.days.filter((x) => x.status === 'CANCELED');
    row(
      '적용 날짜',
      [
        active.map((x) => withWeekday(x.date)).join(', '),
        ...canceled.map(
          (x) =>
            `${withWeekday(x.date)} 취소${x.cancelType === 'LEAD_SAME_DAY' ? ` (리드 당일 취소: ${x.cancelReason ?? ''})` : ''}`,
        ),
      ]
        .filter(Boolean)
        .join('\n') || '-',
    );
    if (d.ip)
      row(
        '접속 IP · 시간대',
        `${d.ip} · ${d.startTime ?? ''} ~ ${d.endTime ?? ''}`,
      );
    else if (d.type === 'HALF_OFF' && (d.halfOffPart || d.startTime))
      // 반일 OFF: 언제 쉬는지 (ATT-34). 판정은 실제 근무 4시간 기준
      row(
        '반차 예정 시간',
        [
          d.halfOffPart && (d.halfOffPart === 'AM' ? '오전 OFF' : '오후 OFF'),
          d.startTime && `${d.startTime} ~ ${d.endTime ?? ''}`,
        ]
          .filter(Boolean)
          .join(' · '),
      );
    row('사유', d.reason || '-');
    row('상태', STATUS[d.status]);
    if (d.rejectReason) row('반려 사유', d.rejectReason);

    // 결재란
    pdf.moveDown(2);
    const boxW = 150;
    const x = left + width - boxW;
    const y = pdf.y;
    pdf.rect(x, y, boxW, 24).fillAndStroke('#f2f4f6', '#c9ced6');
    pdf.rect(x, y + 24, boxW, 70).stroke('#c9ced6');
    pdf
      .fillColor('#000')
      .font('B')
      .fontSize(10)
      .text('리드 결재', x, y + 7, { width: boxW, align: 'center' });
    // 승인 후 취소돼도 결재 사실은 남긴다 (반려는 사유가 필수라 사유 유무로 구분)
    const decided =
      d.deciderName && d.decidedAt
        ? `${d.deciderName}\n${d.rejectReason ? '반려' : '승인'}\n${kst(d.decidedAt)}`
        : '미결재';
    pdf
      .font('R')
      .fontSize(11)
      .text(decided, x, y + 36, { width: boxW, align: 'center' });

    pdf
      .font('R')
      .fontSize(9)
      .fillColor('#666')
      .text(
        `발급 ${kst(d.issuedAt)} (KST) · 팀 근태관리 시스템`,
        left,
        pdf.page.height - pdf.page.margins.bottom - 12,
        { width, align: 'center', lineBreak: false },
      );

    pdf.end();
    return done;
  }
}
