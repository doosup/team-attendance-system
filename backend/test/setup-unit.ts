// 단위 테스트는 Nest 없이 클래스를 직접 만든다 → @Transactional()은 그대로 통과시킨다.
// 실제 트랜잭션은 통합 확인(실제 DB)에서 검증한다.
jest.mock('@nestjs-cls/transactional', () => ({
  ...jest.requireActual<object>('@nestjs-cls/transactional'),
  Transactional: () => () => undefined,
}));
