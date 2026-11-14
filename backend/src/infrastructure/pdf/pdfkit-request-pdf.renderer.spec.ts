import { kstAt } from '../../domain/value/work-date';
import { PdfkitRequestPdfRenderer } from './pdfkit-request-pdf.renderer';

describe('PdfkitRequestPdfRenderer', () => {
  it('한글 글꼴을 넣은 PDF를 만든다 (기간·취소 날짜·결재 포함)', async () => {
    const pdf = await new PdfkitRequestPdfRenderer().render({
      requestId: 7,
      type: 'ANNUAL',
      status: 'APPROVED',
      isOverLimit: false,
      applicantName: '김근태',
      startDate: '2026-11-20',
      endDate: '2026-11-23',
      days: [
        {
          date: '2026-11-20',
          status: 'ACTIVE',
          cancelType: null,
          cancelReason: null,
        },
        {
          date: '2026-11-23',
          status: 'CANCELED',
          cancelType: 'LEAD_SAME_DAY',
          cancelReason: '긴급 배포',
        },
      ],
      reason: '가족 행사',
      ip: null,
      halfOffPart: null,
      startTime: null,
      endTime: null,
      deciderName: '이리드',
      decidedAt: kstAt('2026-11-18', '11:00:00'),
      rejectReason: null,
      issuedAt: kstAt('2026-11-19', '09:00:00'),
    });

    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
    expect(pdf.includes('NanumGothic')).toBe(true);
    expect(pdf.length).toBeLessThan(200_000); // 쓴 글자만 담겨 작다
  });
});
