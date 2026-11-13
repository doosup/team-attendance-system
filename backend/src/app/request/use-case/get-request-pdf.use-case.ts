import { Injectable } from '@nestjs/common';
import { User } from '../../../domain/entity/user.entity';
import { CustomException } from '../../../domain/exception/custom.exception';
import { Clock } from '../../../domain/port/clock.port';
import { RequestPdfRenderer } from '../../../domain/port/request-pdf.port';
import { RequestRepository } from '../../../domain/repository/request.repository';
import { UserRepository } from '../../../domain/repository/user.repository';
import { UseCase } from '../../use-case.interface';

type Input = { user: User; requestId: number };

// 신청서 PDF (FN-REQ-03). 본인 것은 본인, 전부는 리드. 조회라 이력은 남기지 않는다 (결정 A14)
@Injectable()
export class GetRequestPdfUseCase implements UseCase<Input, Buffer> {
  constructor(
    private readonly clock: Clock,
    private readonly requests: RequestRepository,
    private readonly users: UserRepository,
    private readonly renderer: RequestPdfRenderer,
  ) {}

  async execute({ user, requestId }: Input): Promise<Buffer> {
    const request = await this.requests.findById(requestId);
    // 남의 신청은 없는 것처럼 응답 (본인 취소와 같은 규칙)
    if (
      !request ||
      (request.props.userId !== user.id && !user.hasRole(['LEAD']))
    ) {
      throw new CustomException('REQUEST_NOT_FOUND');
    }
    const p = request.props;
    // shortcut: findById는 퇴사자(소프트 삭제)를 못 찾아 '(퇴사자)'로 표시, 퇴사자 신청서를 보관용으로 뽑아야 하면 삭제 포함 조회 추가
    const nameOf = async (id: number | null) =>
      id === null
        ? null
        : ((await this.users.findById(id))?.name ?? '(퇴사자)');
    const [applicantName, deciderName] = await Promise.all([
      nameOf(p.userId),
      nameOf(p.decidedById),
    ]);

    return this.renderer.render({
      requestId: request.id,
      type: p.type,
      status: p.status,
      isOverLimit: p.isOverLimit,
      applicantName: applicantName ?? '(퇴사자)',
      startDate: p.startDate,
      endDate: p.endDate,
      days: p.days.map(({ date, status, cancelType, cancelReason }) => ({
        date,
        status,
        cancelType,
        cancelReason,
      })),
      reason: p.reason,
      ip: p.ip,
      startTime: p.startTime,
      endTime: p.endTime,
      deciderName,
      decidedAt: p.decidedAt,
      rejectReason: p.rejectReason,
      issuedAt: this.clock.now(),
    });
  }
}
