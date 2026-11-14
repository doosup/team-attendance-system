import {
  CancelType,
  DayStatus,
  RequestStatus,
  RequestType,
} from '../repository/request-day.repository';

// 신청서 PDF 한 장에 들어갈 내용 (FN-REQ-03). 이름은 유스케이스가 채운다
export interface RequestDocument {
  requestId: number;
  type: RequestType;
  status: RequestStatus;
  isOverLimit: boolean;
  isAfterDeadline: boolean;
  applicantName: string;
  startDate: string;
  endDate: string;
  days: {
    date: string;
    status: DayStatus;
    cancelType: CancelType | null;
    cancelReason: string | null;
  }[];
  reason: string;
  ip: string | null;
  halfOffPart: 'AM' | 'PM' | null;
  startTime: string | null;
  endTime: string | null;
  deciderName: string | null;
  decidedAt: Date | null;
  rejectReason: string | null;
  issuedAt: Date; // 발급 시각 (Clock)
}

export abstract class RequestPdfRenderer {
  abstract render(doc: RequestDocument): Promise<Buffer>;
}
