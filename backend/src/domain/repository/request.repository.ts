import { Request } from '../entity/request.entity';

export abstract class RequestRepository {
  // 신청서와 날짜 행을 함께 저장하고 id가 채워진 신청서를 돌려준다
  abstract create(request: Request): Promise<Request>;
  abstract findById(id: number): Promise<Request | null>;
  // 시작일 최신순. includeCanceled=false면 CANCELED 제외
  abstract findByUser(
    userId: number,
    includeCanceled: boolean,
  ): Promise<Request[]>;
}
