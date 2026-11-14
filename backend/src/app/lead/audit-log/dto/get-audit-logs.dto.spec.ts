import { validationPipe } from '../../../../common/pipes/validation.pipe';
import { CustomException } from '../../../../domain/exception/custom.exception';
import { GetAuditLogsQuery } from './get-audit-logs.dto';

const run = (query: Record<string, string>) =>
  validationPipe.transform(query, {
    type: 'query',
    metatype: GetAuditLogsQuery,
  }) as Promise<GetAuditLogsQuery>;

describe('GET /lead/audit-logs 쿼리 includeLogin (ATT-38)', () => {
  it("문자열 'true'·'false'를 불리언으로 바꾼다", async () => {
    expect((await run({ includeLogin: 'true' })).includeLogin).toBe(true);
    expect((await run({ includeLogin: 'false' })).includeLogin).toBe(false);
  });

  it('그 밖의 값은 조용히 false가 되지 않고 VALIDATION_FAILED', async () => {
    await expect(run({ includeLogin: '1' })).rejects.toMatchObject({
      code: 'VALIDATION_FAILED',
    } satisfies Partial<CustomException>);
  });
});
