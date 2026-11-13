export interface UseCase<Input, Output> {
  // DB를 쓰지 않는 유스케이스는 동기로 반환해도 된다.
  execute(input: Input): Output | Promise<Output>;
}
