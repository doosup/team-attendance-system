import { CustomException } from '../../../../domain/exception/custom.exception';
import { FixedClock } from '../../../../../test/fakes/fixed-clock';
import { InMemoryAllowedIpRepository } from '../../../../../test/fakes/in-memory-allowed-ip.repository';
import { InMemoryAuditLogRepository } from '../../../../../test/fakes/in-memory-audit-log.repository';
import { LEAD } from '../../../../../test/fakes/users';
import { AddAllowedIpUseCase } from './add-allowed-ip.use-case';
import { DeleteAllowedIpUseCase } from './delete-allowed-ip.use-case';
import { GetAllowedIpsUseCase } from './get-allowed-ips.use-case';

describe('연구실 IP 관리', () => {
  let ips: InMemoryAllowedIpRepository;
  let audit: InMemoryAuditLogRepository;
  let add: AddAllowedIpUseCase;
  let del: DeleteAllowedIpUseCase;
  let list: GetAllowedIpsUseCase;

  beforeEach(() => {
    const clock = new FixedClock('2026-11-13', '09:00:00');
    ips = new InMemoryAllowedIpRepository(['127.0.0.1']);
    audit = new InMemoryAuditLogRepository();
    add = new AddAllowedIpUseCase(clock, ips, audit);
    del = new DeleteAllowedIpUseCase(clock, ips, audit);
    list = new GetAllowedIpsUseCase(ips);
  });

  const codeOf = (p: Promise<unknown>) =>
    p.then(
      () => 'OK',
      (e: CustomException) => e.code,
    );
  const addIp = (ip: string, label = '회의실') =>
    add.execute({ lead: LEAD, ip: '127.0.0.1', body: { ip, label } });
  const deleteIp = (id: number, currentIp = '127.0.0.1') =>
    del.execute({ lead: LEAD, id, ip: currentIp });

  it('IP를 정규화해 추가하고 이력을 남긴다', async () => {
    const r = await addIp(' ::ffff:10.1.2.3 ');
    expect(r).toMatchObject({ ip: '10.1.2.3', label: '회의실' });
    expect((await list.execute()).map((x) => x.ip)).toEqual([
      '127.0.0.1',
      '10.1.2.3',
    ]);
    expect(audit.rows[0]).toMatchObject({
      action: 'ALLOWED_IP_ADD',
      targetType: 'AllowedIp',
    });
  });

  it.each(['10.0.0', '10.0.0.0/24', 'lab'])(
    '형식이 틀리면 INVALID_IP_FORMAT (%s)',
    async (ip) => {
      expect(await codeOf(addIp(ip))).toBe('INVALID_IP_FORMAT');
    },
  );

  it('살아 있는 IP와 겹치면 DUPLICATE_ALLOWED_IP (::1도 127.0.0.1로 봄)', async () => {
    expect(await codeOf(addIp('::1'))).toBe('DUPLICATE_ALLOWED_IP');
  });

  it('삭제는 소프트 삭제이고 삭제한 IP는 다시 추가할 수 있다', async () => {
    const r = await addIp('10.1.2.3');
    await deleteIp(r.id);
    expect((await list.execute()).map((x) => x.ip)).toEqual(['127.0.0.1']);
    expect(await ips.isAllowed('10.1.2.3')).toBe(false);
    expect(await codeOf(addIp('10.1.2.3'))).toBe('OK');
    expect(audit.actions()).toContain('ALLOWED_IP_DELETE');
  });

  it('지금 접속 중인 IP는 지울 수 없다 (CANNOT_DELETE_CURRENT_IP)', async () => {
    const r = await addIp('10.1.2.3');
    expect(await codeOf(deleteIp(r.id, '10.1.2.3'))).toBe(
      'CANNOT_DELETE_CURRENT_IP',
    );
  });

  it('마지막 남은 IP는 지울 수 없다 (CANNOT_DELETE_LAST_IP)', async () => {
    expect(await codeOf(deleteIp(1, '10.9.9.9'))).toBe('CANNOT_DELETE_LAST_IP');
  });

  it('없는(또는 이미 지운) IP는 ALLOWED_IP_NOT_FOUND', async () => {
    expect(await codeOf(deleteIp(99))).toBe('ALLOWED_IP_NOT_FOUND');
  });
});
