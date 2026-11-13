import { ArgumentsHost, Logger, NotFoundException } from '@nestjs/common';
import { CustomException } from '../../domain/exception/custom.exception';
import { DomainExceptionFilter } from './domain-exception.filter';

function hostWithResponse() {
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  const host = {
    switchToHttp: () => ({ getResponse: () => res }),
  } as unknown as ArgumentsHost;
  return { res, host };
}

describe('DomainExceptionFilter', () => {
  const filter = new DomainExceptionFilter();

  it('도메인 에러는 코드표의 HTTP 상태와 { error: { code, message } }로 응답한다', () => {
    const { res, host } = hostWithResponse();
    filter.catch(
      new CustomException('VALIDATION_FAILED', 'now 형식 오류'),
      host,
    );
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: { code: 'VALIDATION_FAILED', message: 'now 형식 오류' },
    });
  });

  it('표에 없는 HTTP 오류는 상태 이름을 코드로 쓴다', () => {
    const { res, host } = hostWithResponse();
    filter.catch(new NotFoundException('Cannot GET /nope'), host);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      error: { code: 'NOT_FOUND', message: 'Cannot GET /nope' },
    });
  });

  it('예상하지 못한 오류는 500 INTERNAL_ERROR이고 내부 메시지를 노출하지 않는다', () => {
    const { res, host } = hostWithResponse();
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    filter.catch(new Error('db password is hunter2'), host);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다' },
    });
  });
});
