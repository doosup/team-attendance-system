import { isValidIp, normalizeIp } from './ip.util';

describe('IP 정규화', () => {
  it.each([
    ['::1', '127.0.0.1'],
    ['::ffff:127.0.0.1', '127.0.0.1'],
    ['::ffff:10.0.0.5', '10.0.0.5'],
    ['  192.168.0.10 ', '192.168.0.10'],
    ['2001:db8::1', '2001:db8::1'],
  ])('%s → %s', (raw, expected) => {
    expect(normalizeIp(raw)).toBe(expected);
  });

  it.each(['127.0.0.1', '2001:db8::1'])('%s는 올바른 IP', (ip) => {
    expect(isValidIp(ip)).toBe(true);
  });

  it.each(['', '999.1.1.1', '10.0.0', '127.0.0.1/24', 'localhost'])(
    '"%s"는 IP가 아니다',
    (ip) => {
      expect(isValidIp(ip)).toBe(false);
    },
  );
});
