import { Request } from '../entity/request.entity';
import { RequestStatus } from './request-day.repository';

export abstract class RequestRepository {
  // 신청서와 날짜 행을 함께 저장하고 id가 채워진 신청서를 돌려준다
  abstract create(request: Request): Promise<Request>;
  abstract findById(id: number): Promise<Request | null>;
  // 상태별 전체 목록, 시작일 가까운 순 (리드 대기 목록)
  abstract findByStatus(status: RequestStatus): Promise<Request[]>;
  // 신청서 상태·결정 정보와 날짜 행 상태를 저장
  abstract save(request: Request): Promise<void>;
  // 시작일 최신순. includeCanceled=false면 CANCELED 제외
  abstract findByUser(
    userId: number,
    includeCanceled: boolean,
  ): Promise<Request[]>;
}
