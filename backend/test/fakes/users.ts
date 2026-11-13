import { User } from '../../src/domain/entity/user.entity';

// 테스트 전용 고정 사용자. passwordHash는 FakePasswordHasher 규칙('hash:' + 원문)을 따른다.
export const LEAD = new User(
  1,
  'lead',
  'hash:pw-lead',
  '이리드',
  'LEAD',
  '2025-12-01',
);
export const KIM = new User(
  2,
  'kim',
  'hash:pw-kim',
  '김근태',
  'MEMBER',
  '2026-01-01',
);
