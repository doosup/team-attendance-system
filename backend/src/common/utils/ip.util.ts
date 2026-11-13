import { isIP } from 'node:net';

/** 로컬 접속의 IPv6 표기를 정규화한다 (결정 19). '::1' → '127.0.0.1', '::ffff:a.b.c.d' → 'a.b.c.d' */
export function normalizeIp(raw: string): string {
  const ip = raw.trim();
  if (ip === '::1') return '127.0.0.1';
  return ip.startsWith('::ffff:') ? ip.slice('::ffff:'.length) : ip;
}

/** 최소 형식 검사. CIDR는 지원하지 않는다. */
export const isValidIp = (ip: string): boolean => isIP(ip) !== 0;
